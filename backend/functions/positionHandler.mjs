import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.POSITIONS_TABLE || "PositionsTable";

export const handler = async (event) => {
  const responseHeaders = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  // 1. OPTIONS 요청(CORS 프리플라이트) 처리
  const method = (event.requestContext?.http?.method || event.httpMethod || "").toUpperCase();
  if (method === "OPTIONS") {
    return { statusCode: 204, headers: responseHeaders, body: "" };
  }

  try {
    // 2. GET: 목록 조회
    if (method === "GET") {
      const command = new ScanCommand({ TableName: TABLE_NAME });
      const response = await docClient.send(command);
      return { statusCode: 200, headers: responseHeaders, body: JSON.stringify(response.Items) };
    }

    // 3. POST: 포지션 추가
    if (method === "POST") {
      if (!event.body) throw new Error("Body is missing");
      const { name } = JSON.parse(event.body);
      const command = new PutCommand({
        TableName: TABLE_NAME,
        Item: { name, createdAt: new Date().toISOString() }
      });
      await docClient.send(command);
      return { statusCode: 201, headers: responseHeaders, body: JSON.stringify({ message: "Saved" }) };
    }

    // 4. DELETE: 포지션 삭제
    if (method === "DELETE") {
      // API Gateway 경로 변수(name) 추출
      const nameParam = event.pathParameters?.name || event.pathParameters?.proxy;
      if (!nameParam) throw new Error("Name parameter is missing");
      
      const name = decodeURIComponent(nameParam);
      const command = new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { name }
      });
      await docClient.send(command);
      return { statusCode: 200, headers: responseHeaders, body: JSON.stringify({ message: "Deleted" }) };
    }

    return { statusCode: 405, headers: responseHeaders, body: JSON.stringify({ error: "Method Not Allowed" }) };

  } catch (error) {
    console.error("Error:", error);
    return { 
      statusCode: 500, 
      headers: responseHeaders, 
      body: JSON.stringify({ error: error.message, stack: error.stack }) 
    };
  }
};