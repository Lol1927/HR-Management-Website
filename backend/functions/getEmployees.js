const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb");

// 현재 계신 us-east-2 리전으로 명시적 설정
const client = new DynamoDBClient({ region: "us-east-2" }); 
const docClient = DynamoDBDocumentClient.from(client);

module.exports.handler = async (event) => {
  console.log("조회 요청 수신");
  try {
    const params = {
      TableName: process.env.EMPLOYEES_TABLE,
    };

    const result = await docClient.send(new ScanCommand(params));

    return {
      statusCode: 200,
      headers: { 
        "Access-Control-Allow-Origin": "*", // 프론트엔드 연결 시 필수
        "Content-Type": "application/json" 
      },
      body: JSON.stringify(result.Items), // 조회된 직원 목록 반환
    };
  } catch (error) {
    console.error("조회 에러:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "조회 실패", error: error.message }),
    };
  }
};