const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, DeleteCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: "us-east-2" });
const docClient = DynamoDBDocumentClient.from(client);

module.exports.handler = async (event) => {
  try {
    // URL에서 {id}를 가져옵니다.
    const { id } = event.pathParameters;

    if (!id) {
      return { statusCode: 400, body: JSON.stringify({ message: "ID가 필요합니다." }) };
    }

    await docClient.send(new DeleteCommand({
      TableName: process.env.EMPLOYEES_TABLE,
      Key: { id }
    }));

    return {
      statusCode: 200,
      headers: { 
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ message: "삭제 성공", deletedId: id }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "삭제 실패", error: error.message }),
    };
  }
};