import {
  QueryCommand,
  GetCommand,
  UpdateCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { ddb } from "../lib/dynamo.mjs";
import { ok, error } from "../lib/response.mjs";

const APPLICATIONS_TABLE = process.env.APPLICATIONS_TABLE;
const PROFILES_TABLE = process.env.PROFILES_TABLE;
const EVENTS_TABLE = process.env.EVENTS_TABLE || "Events";

export const handler = async (event) => {
  const method = event.httpMethod;
  const resource = event.resource;
  const pathParams = event.pathParameters || {};
  const queryParams = event.queryStringParameters || {};

  try {
    // GET /api/admin/applications?eventId={eventId}
    // 특정 이벤트의 모든 지원자 목록 (프로필 포함)
    if (method === "GET" && resource === "/api/admin/applications") {
      const eventId = queryParams.eventId;

      let apps = [];

      if (eventId) {
        // 특정 이벤트 지원자만 조회
        const result = await ddb.send(
          new QueryCommand({
            TableName: APPLICATIONS_TABLE,
            IndexName: "eventId-index",
            KeyConditionExpression: "eventId = :eid",
            ExpressionAttributeValues: { ":eid": eventId },
          })
        );
        apps = result.Items || [];
      } else {
        // 전체 지원자 조회
        const result = await ddb.send(
          new ScanCommand({ TableName: APPLICATIONS_TABLE })
        );
        apps = result.Items || [];
      }

      // 각 지원서에 프로필 정보 추가
      const enriched = await Promise.all(
        apps.map(async (app) => {
          const profileResult = await ddb.send(
            new GetCommand({
              TableName: PROFILES_TABLE,
              Key: { userId: app.userId },
            })
          );
          return {
            ...app,
            profile: profileResult.Item || null,
          };
        })
      );

      // 최신순 정렬
      enriched.sort(
        (a, b) => new Date(b.appliedAt) - new Date(a.appliedAt)
      );

      return ok(enriched);
    }

    // PATCH /api/admin/applications/{id}/status
    // 지원자 채용/미채용 처리
    if (
      method === "PATCH" &&
      resource === "/api/admin/applications/{id}/status"
    ) {
      const id = pathParams.id;
      const body = JSON.parse(event.body || "{}");
      const { status } = body;

      if (!["pending", "hired", "rejected"].includes(status)) {
        return error(400, "Invalid status. Must be pending, hired, or rejected");
      }

      // 지원서 존재 확인
      const existing = await ddb.send(
        new GetCommand({ TableName: APPLICATIONS_TABLE, Key: { id } })
      );
      if (!existing.Item) {
        return error(404, "Application not found");
      }

      const result = await ddb.send(
        new UpdateCommand({
          TableName: APPLICATIONS_TABLE,
          Key: { id },
          UpdateExpression: "SET #status = :status, updatedAt = :now",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: {
            ":status": status,
            ":now": new Date().toISOString(),
          },
          ReturnValues: "ALL_NEW",
        })
      );

      return ok(result.Attributes);
    }

    return error(405, "Method Not Allowed");
  } catch (err) {
    console.error("adminHandler error:", err);
    return error(500, err.message);
  }
};
