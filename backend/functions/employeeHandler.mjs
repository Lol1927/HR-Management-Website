import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
  DynamoDBDocumentClient, 
  PutCommand, 
  ScanCommand, 
  DeleteCommand, 
  UpdateCommand,
  GetCommand,           // 추가됨
  TransactWriteCommand
} from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";

const client = new DynamoDBClient({ region: "us-east-2" });
const docClient = DynamoDBDocumentClient.from(client);

const SALT = process.env.SALT; // 보안을 위한 비밀키
const TABLE_NAME = process.env.EMPLOYEES_TABLE;

// 주민번호를 해시 ID로 변환하는 공통 함수
const generateId = (residentNumber) => {
  return crypto.createHash("sha256").update(residentNumber + SALT).digest("hex");
};

export const handler = async (event) => {
  const method = event.httpMethod;
  const pathParams = event.pathParameters;
  
  try {
    // 1. 생성 (POST)
    if (method === "POST") {
      const body = JSON.parse(event.body);
      const employeeId = generateId(body.residentNumber); // 해시값을 ID로 사용

      const newEmployee = {
        id: employeeId, // 주민번호 해시가 PK가 됨
        name: body.name,
        contact: body.contact,
        bankName: body.bankName,
        accountNumber: body.accountNumber,
        residentNumber: body.residentNumber.replace(/-([0-9]{1})[0-9]{6}$/, "-$1******"),
        status: body.status || "활성",
        availableWork: body.availableWork || [],
        createdAt: new Date().toISOString()
      };

      await docClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: newEmployee,
        ConditionExpression: "attribute_not_exists(id)" // 동일 ID(주민번호 해시) 중복 차단
      }));

      return response(201, { message: "등록 성공", id: employeeId });
    }

    // 2. 전체 조회 (GET)
    if (method === "GET" && !pathParams) {
      const result = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));
      return response(200, result.Items);
    }

    // 3. 삭제 (DELETE)
    if (method === "DELETE") {
      const { id } = pathParams;
      await docClient.send(new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { id }
      }));
      return response(200, { message: "삭제 성공", id });
    }

  
   // 4. 수정 (PUT)
    if (method === "PUT") {
      const { id } = pathParams; // 현재 DB에 저장된 해시 ID
      const body = JSON.parse(event.body);
      const newId = generateId(body.residentNumber);

      // [상황 1] 주민번호는 그대로고 다른 정보(이름, 연락처 등)만 바꿀 때
      if (id === newId) {
        const params = {
          TableName: TABLE_NAME,
          Key: { id },
          UpdateExpression: "set #n = :name, contact = :contact, #s = :status, bankName = :bn, accountNumber = :an, availableWork = :aw",
          ExpressionAttributeNames: { "#n": "name", "#s": "status" },
          ExpressionAttributeValues: {
            ":name": body.name,
            ":contact": body.contact,
            ":status": body.status,
            ":bn": body.bankName,
            ":an": body.accountNumber,
            ":aw": body.availableWork || []
          },
          ReturnValues: "ALL_NEW"
        };
        const result = await docClient.send(new UpdateCommand(params));
        return response(200, { message: "정보 수정 성공", updated: result.Attributes });
      } 
      
      // [상황 2] 주민번호 자체가 바뀌었을 때 (ID를 갈아치워야 함)
      else {
        // 1. 기존 데이터를 먼저 가져옵니다 (다른 정보들을 복사하기 위해)
        const getResult = await docClient.send(new GetCommand({
          TableName: TABLE_NAME,
          Key: { id }
        }));

        if (!getResult.Item) {
          return response(404, { message: "수정할 직원을 찾을 수 없습니다." });
        }

        // 2. 트랜잭션을 사용하여 [기존 ID 삭제] + [새 ID 생성]을 한 번에 처리합니다.
        // 이렇게 해야 도중에 에러가 나도 데이터가 꼬이지 않습니다.
        await docClient.send(new TransactWriteCommand({
          TransactItems: [
            {
              Delete: {
                TableName: TABLE_NAME,
                Key: { id } // 옛날 해시 ID 삭제
              }
            },
            {
              Put: {
                TableName: TABLE_NAME,
                Item: {
                  ...getResult.Item,
                  id: newId,
                  name: body.name,
                  contact: body.contact,
                  residentNumber: body.residentNumber.replace(/-([0-9]{1})[0-9]{6}$/, "-$1******"),
                  bankName: body.bankName,
                  accountNumber: body.accountNumber,
                  status: body.status,
                  // ✅ 이 라인을 반드시 추가하세요
                  availableWork: body.availableWork || getResult.Item.availableWork || []
                },
                ConditionExpression: "attribute_not_exists(id)" 
              }
            }
          ]
        }));
        
        return response(200, { message: "주민번호 변경 및 정보 수정 완료", newId: newId });
      }
    }

  } catch (error) {
    console.error(error);
    
    // 일반 PutCommand 중복 에러 OR 트랜잭션 내 중복 에러 모두 체크
    if (error.name === "ConditionalCheckFailedException" || 
        (error.name === "TransactionCanceledException" && error.message.includes("ConditionalCheckFailed"))) {
      return response(400, { message: "이미 등록된 주민번호(ID)입니다." });
    }
    
    return response(500, { message: "서버 에러", error: error.message });
  }
};

// 응답 헬퍼 함수
const response = (statusCode, body) => ({
  statusCode,
  headers: { 
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json" 
  },
  body: JSON.stringify(body),
});