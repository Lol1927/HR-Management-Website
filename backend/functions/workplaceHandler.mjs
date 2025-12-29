import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// serverless.yml에서 정의한 환경변수 사용
const TableName = process.env.WORKPLACE_TABLE;

export const handler = async (event) => {
  const method = event.httpMethod;
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Content-Type": "application/json"
  };

  try {
    // 1. 조회 (GET)
    if (method === "GET") {
      const data = await docClient.send(new ScanCommand({ TableName }));
      return { statusCode: 200, headers, body: JSON.stringify(data.Items) };
    }

    // 2. 등록 (POST)
    if (method === "POST") {
      const body = JSON.parse(event.body);
      await docClient.send(new PutCommand({
        TableName,
        Item: {
          placeName: body.placeName,
          createdAt: new Date().toISOString()
        },
        ConditionExpression: "attribute_not_exists(placeName)" // 중복 방지
      }));
      return { statusCode: 201, headers, body: JSON.stringify({ message: "등록 성공" }) };
    }

    // 3. 삭제 (DELETE)
    if (method === "DELETE") {
      // URL 경로 파라미터에서 placeName 추출 (workplace/{placeName})
      const placeName = decodeURIComponent(event.pathParameters.placeName);
      await docClient.send(new DeleteCommand({
        TableName,
        Key: { placeName }
      }));
      return { statusCode: 200, headers, body: JSON.stringify({ message: "삭제 성공" }) };
    }

  } catch (err) {
    const message = err.name === "ConditionalCheckFailedException" 
      ? "이미 존재하는 근무지입니다." 
      : err.message;
    return { statusCode: 500, headers, body: JSON.stringify({ error: message }) };
  }
};