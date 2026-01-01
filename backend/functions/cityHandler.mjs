import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TableName = process.env.CITY_TABLE;

export const handler = async (event) => {
  const method = event.httpMethod;
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Content-Type": "application/json"
  };

  try {
    // 1. 모든 시 목록 조회
    if (method === "GET") {
      const data = await docClient.send(new ScanCommand({ TableName }));
      return { statusCode: 200, headers, body: JSON.stringify(data.Items) };
    }

    // 2. 신규 시 등록
    if (method === "POST") {
      const body = JSON.parse(event.body);
      if (!body.cityName || !body.provinceName) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "데이터 부족" }) };
      }

      await docClient.send(new PutCommand({
        TableName,
        Item: {
          cityName: body.cityName,
          provinceName: body.provinceName, // 연결된 주 이름 저장
          createdAt: new Date().toISOString()
        },
        ConditionExpression: "attribute_not_exists(cityName)"
      }));
      
      return { statusCode: 201, headers, body: JSON.stringify({ message: "시 등록 성공" }) };
    }

    // 3. 시 삭제
    if (method === "DELETE") {
      const cityName = decodeURIComponent(event.pathParameters.cityName);
      await docClient.send(new DeleteCommand({
        TableName,
        Key: { cityName }
      }));
      return { statusCode: 200, headers, body: JSON.stringify({ message: "시 삭제 성공" }) };
    }

  } catch (err) {
    const isDuplicate = err.name === "ConditionalCheckFailedException";
    return { 
      statusCode: isDuplicate ? 200 : 500, 
      headers, 
      body: JSON.stringify({ error: isDuplicate ? "이미 존재하는 도시입니다." : err.message }) 
    };
  }
};