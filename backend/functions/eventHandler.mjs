import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";


const client = new DynamoDBClient({ region: "us-east-2" }); // 리전 명시
const docClient = DynamoDBDocumentClient.from(client);

// 중요: 환경 변수에서 가져오거나, 없으면 직접 "Events"를 사용
const TABLE_NAME = process.env.EVENTS_TABLE || "Events";

const calculateWorkHours = (start, end) => {
    if (!start || !end) return 0;
    const [sH, sM] = start.split(':').map(Number);
    const [eH, eM] = end.split(':').map(Number);
    const diffMinutes = (eH * 60 + eM) - (sH * 60 + sM);
    return diffMinutes > 0 ? (diffMinutes / 60).toFixed(1) : 0;
};

export const handler = async (event) => {
    // http 방식과 httpApi 방식 모두 호환되도록 수정
    const method = event.httpMethod || event.requestContext?.http?.method;
    const pathParameters = event.pathParameters;

    console.log("Method:", method); // 로그 확인용

    try {
        if (method === "GET") {
            const data = await docClient.send(new ScanCommand({ TableName: TABLE_NAME }));
            return { 
                statusCode: 200, 
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify(data.Items) 
            };
        }

        if (method === "POST" || method === "PUT") {
            const body = JSON.parse(event.body);
            
            if (body.assignedStaff && Array.isArray(body.assignedStaff)) {
                body.assignedStaff = body.assignedStaff.map(staff => ({
                    ...staff,
                    workHours: calculateWorkHours(staff.workStart, staff.workEnd)
                }));
            }

            const item = {
                id: body.id || Date.now().toString(),
                ...body,
                updatedAt: new Date().toISOString()
            };

            await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
            return { 
                statusCode: 200, 
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify(item) 
            };
        }

        if (method === "DELETE") {
            const id = pathParameters?.id;
            if (!id) return { statusCode: 400, body: "ID가 필요합니다." };

            await docClient.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { id } }));
            return { 
                statusCode: 200, 
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ message: "삭제 성공", id }) 
            };
        }

        return { statusCode: 405, body: "Method Not Allowed" };

    } catch (err) {
        console.error("Error Detail:", err);
        return { 
            statusCode: 500, 
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: err.message }) 
        };
    }
};