const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, UpdateCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: "us-east-2" });
const docClient = DynamoDBDocumentClient.from(client);

module.exports.handler = async (event) => {
  try {
    const { id } = event.pathParameters;
    const body = JSON.parse(event.body);

    const params = {
      TableName: process.env.EMPLOYEES_TABLE,
      Key: { id },
      // UpdateExpression에서 :rating을 제거하고, 필요한 모든 필드를 넣었습니다.
      UpdateExpression: "set #n = :name, contact = :contact, #s = :status, availableWork = :aw, residentNumber = :rn, bankName = :bn, accountNumber = :an",
      ExpressionAttributeNames: { 
        "#n": "name", 
        "#s": "status" 
      },
      ExpressionAttributeValues: {
        ":name": body.name,
        ":contact": body.contact,
        ":status": body.status,
        ":aw": body.availableWork || [],
        ":rn": body.residentNumber || "",
        ":bn": body.bankName || "",
        ":an": body.accountNumber || ""
      },
      ReturnValues: "ALL_NEW"
    };

    const result = await docClient.send(new UpdateCommand(params));

    return {
      statusCode: 200,
      headers: { 
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({ message: "수정 성공", updated: result.Attributes }),
    };
  } catch (error) {
    console.error("수정 에러 상세:", error);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ message: "수정 실패", error: error.message }),
    };
  }
};