import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TableName = process.env.PROVINCE_TABLE;

export const handler = async (event) => {
  const method = event.httpMethod;
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Content-Type": "application/json"
  };

  try {
    // 1. 모든 주 목록 조회
    if (method === "GET") {
      const data = await docClient.send(new ScanCommand({ TableName }));
      return { statusCode: 200, headers, body: JSON.stringify(data.Items) };
    }

    // 2. 신규 주 등록
    if (method === "POST") {
      const body = JSON.parse(event.body);
      if (!body.provinceName) throw new Error("provinceName이 누락되었습니다.");

      await docClient.send(new PutCommand({
        TableName,
        Item: {
          provinceName: body.provinceName,
          createdAt: new Date().toISOString()
        },
        ConditionExpression: "attribute_not_exists(provinceName)"
      }));
      
      return { statusCode: 201, headers, body: JSON.stringify({ message: "주 등록 성공" }) };
    }

    // 3. 주 삭제
    if (method === "DELETE") {
      const provinceName = decodeURIComponent(event.pathParameters.provinceName);
      await docClient.send(new DeleteCommand({
        TableName,
        Key: { provinceName }
      }));
      return { statusCode: 200, headers, body: JSON.stringify({ message: "주 삭제 성공" }) };
    }

  } catch (err) {
    const isDuplicate = err.name === "ConditionalCheckFailedException";
    return { 
      statusCode: isDuplicate ? 200 : 500, 
      headers, 
      body: JSON.stringify({ error: isDuplicate ? "이미 존재하는 지역입니다." : err.message }) 
    };
  }
};