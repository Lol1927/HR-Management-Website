import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
  DynamoDBDocumentClient, 
  UpdateCommand, 
  GetCommand,
  PutCommand
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: process.env.AWS_REGION || "us-east-2" });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.HISTORY_TABLE; // serverless.yml에서 설정한 변수

export const handler = async (event) => {
  const method = event.httpMethod;
  const { employeeId, eventId } = event.pathParameters || {}; // URL 경로에서 id 추출

  try {
    // 1. [조회] 특정 직원의 전체 히스토리 가져오기
    if (method === "GET") {
      const params = { TableName: TABLE_NAME, Key: { employeeId } };
      const { Item } = await docClient.send(new GetCommand(params));
      return response(200, Item ? Item.history : []);
    }

    // 2. [추가] 새로운 이벤트 평가 추가 (기존 코드 활용)
    if (method === "POST") {
      const { evaluation } = JSON.parse(event.body);
      const params = {
        TableName: TABLE_NAME,
        Key: { employeeId },
        UpdateExpression: "SET #h = list_append(if_not_exists(#h, :empty_list), :new_eval)",
        ExpressionAttributeNames: { "#h": "history" },
        ExpressionAttributeValues: {
          ":new_eval": [evaluation],
          ":empty_list": []
        }
      };
      await docClient.send(new UpdateCommand(params));
      return response(201, { message: "평가 추가 성공" });
    }

    // 3. [수정] 특정 이벤트 아이디를 찾아서 내용 변경
    if (method === "PUT") {
      const { updatedData } = JSON.parse(event.body);
      
      // 먼저 전체 데이터를 가져옴
      const { Item } = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { employeeId } }));
      if (!Item) return response(404, { message: "해당 인원을 찾을 수 없습니다." });

      // 배열 내부에서 eventId가 같은 것을 찾아 데이터 교체
      const newHistory = Item.history.map(h => h.eventId === eventId ? { ...h, ...updatedData } : h);

      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: { employeeId, history: newHistory }
      }));
      return response(200, { message: "평가 수정 완료" });
    }

    // 4. [삭제] 특정 이벤트 평가만 삭제
    if (method === "DELETE") {
      const { Item } = await docClient.send(new GetCommand({ TableName: TABLE_NAME, Key: { employeeId } }));
      if (!Item) return response(404, { message: "데이터가 없습니다." });

      // 해당 eventId만 빼고 필터링
      const filteredHistory = Item.history.filter(h => h.eventId !== eventId);

      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: { employeeId, history: filteredHistory }
      }));
      return response(200, { message: "평가 삭제 완료" });
    }

  } catch (error) {
    console.error("Error:", error);
    return response(500, { error: error.message });
  }
};

// 공통 응답 함수 (CORS 설정 포함)
const response = (statusCode, body) => ({
  statusCode,
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": true,
  },
  body: JSON.stringify(body),
});