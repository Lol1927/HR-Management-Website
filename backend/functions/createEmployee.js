const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const crypto = require("crypto"); // 수정된 부분

const client = new DynamoDBClient({ region: "us-east-2" });
const docClient = DynamoDBDocumentClient.from(client);

module.exports.handler = async (event) => {
  console.log("받은 데이터:", event.body);
  try {
    const body = JSON.parse(event.body);
    
    // Node.js 18.x에서 가장 안전한 UUID 생성 방식
    const employeeId = crypto.randomBytes(16).toString("hex"); 

    const newEmployee = {
      id: employeeId,
      name: body.name,
      contact: body.contact,
      bankName: body.bankName,
      accountNumber: body.accountNumber,
      residentNumber: body.residentNumber,
      rating: body.rating || 0,
      status: body.status || "활성",
      availableWork: body.availableWork || [],
      createdAt: new Date().toISOString()
    };

    await docClient.send(new PutCommand({
      TableName: process.env.EMPLOYEES_TABLE,
      Item: newEmployee,
    }));

    return {
      statusCode: 201,
      headers: { 
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({ message: "성공", id: employeeId }),
    };
  } catch (error) {
    console.error("상세 에러:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "서버 에러", error: error.message }),
    };
  }
};