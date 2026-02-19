import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { ddb } from "../lib/dynamo.mjs";
import { ok, error } from "../lib/response.mjs";
import { getUserId } from "../lib/auth.mjs";

const APPLICATIONS_TABLE = process.env.APPLICATIONS_TABLE;
const PROFILES_TABLE = process.env.PROFILES_TABLE;
const EVENTS_TABLE = process.env.EVENTS_TABLE || "Events";

// HR Management 이벤트를 알바톡 형식으로 변환
function normalizeEvent(item) {
  if (!item) return null;
  if (item.date) return item;
  if (item.startDate && item.endDate) {
    const workDates = [];
    let curr = new Date(item.startDate);
    const last = new Date(item.endDate);
    while (curr <= last) {
      workDates.push(curr.toISOString().split("T")[0]);
      curr.setDate(curr.getDate() + 1);
    }
    const firstStaff = item.assignedStaff?.[0];
    const uniqueStaffIds = new Set((item.assignedStaff || []).map(s => s.id));
    return {
      ...item,
      date: item.startDate,
      workDates,
      startTime: firstStaff?.workStart || "09:00",
      endTime: firstStaff?.workEnd || "18:00",
      location: item.location || "미정",
      region: item.region || "",
      category: item.category || "sports",
      jobType: item.jobType || "행사 스태프",
      wage: parseInt((firstStaff?.pay || "0").replace(/,/g, "")) || 0,
      wageType: "daily",
      positionsAvailable: uniqueStaffIds.size || 1,
    };
  }
  return item;
}

export const handler = async (event) => {
  const method = event.httpMethod;
  const resource = event.resource;
  const userId = getUserId(event);

  if (!userId) {
    return error(401, "Unauthorized");
  }

  try {
    // GET /api/my-applications - 내 지원 목록 (이벤트 데이터 포함)
    if (method === "GET" && resource === "/api/my-applications") {
      const queryResult = await ddb.send(new QueryCommand({
        TableName: APPLICATIONS_TABLE,
        IndexName: "userId-index",
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: { ":uid": userId },
      }));

      const apps = queryResult.Items || [];

      // 이벤트 데이터 enrichment
      const enriched = await Promise.all(
        apps.map(async (app) => {
          const eventResult = await ddb.send(new GetCommand({
            TableName: EVENTS_TABLE,
            Key: { id: app.eventId },
          }));
          return { ...app, event: normalizeEvent(eventResult.Item) };
        })
      );

      return ok(enriched);
    }

    // GET /api/applications/detail/{id} - 지원 상세 (이벤트 데이터 포함)
    if (method === "GET" && resource === "/api/applications/detail/{id}") {
      const id = event.pathParameters?.id;
      const result = await ddb.send(new GetCommand({
        TableName: APPLICATIONS_TABLE,
        Key: { id },
      }));

      if (!result.Item) {
        return error(404, "Application not found");
      }
      if (result.Item.userId !== userId) {
        return error(403, "Forbidden");
      }

      // 이벤트 데이터 포함
      const eventResult = await ddb.send(new GetCommand({
        TableName: EVENTS_TABLE,
        Key: { id: result.Item.eventId },
      }));

      return ok({ ...result.Item, event: normalizeEvent(eventResult.Item) });
    }

    // GET /api/applications/by-event/{eventId} - 특정 이벤트 지원 조회
    if (method === "GET" && resource === "/api/applications/by-event/{eventId}") {
      const eventId = event.pathParameters?.eventId;

      // userId-index로 해당 유저의 모든 지원서 조회 후 eventId 필터
      const queryResult = await ddb.send(new QueryCommand({
        TableName: APPLICATIONS_TABLE,
        IndexName: "userId-index",
        KeyConditionExpression: "userId = :uid",
        FilterExpression: "eventId = :eid",
        ExpressionAttributeValues: {
          ":uid": userId,
          ":eid": eventId,
        },
      }));

      const app = queryResult.Items?.[0];
      if (!app) {
        return error(404, "Application not found");
      }
      return ok(app);
    }

    // POST /api/applications - 지원하기
    if (method === "POST" && resource === "/api/applications") {
      const body = JSON.parse(event.body);

      // 1. 프로필 존재 확인
      const profileResult = await ddb.send(new GetCommand({
        TableName: PROFILES_TABLE,
        Key: { userId },
      }));
      if (!profileResult.Item) {
        return error(400, "Profile required");
      }

      // 2. 중복 지원 방지
      const dupCheck = await ddb.send(new QueryCommand({
        TableName: APPLICATIONS_TABLE,
        IndexName: "userId-index",
        KeyConditionExpression: "userId = :uid",
        FilterExpression: "eventId = :eid",
        ExpressionAttributeValues: {
          ":uid": userId,
          ":eid": body.eventId,
        },
      }));
      if (dupCheck.Items && dupCheck.Items.length > 0) {
        return error(400, "Already applied");
      }

      // 3. 지원서 생성
      const item = {
        id: Date.now().toString() + "-" + Math.random().toString(36).substring(2, 9),
        userId,
        eventId: body.eventId,
        selfIntroduction: body.selfIntroduction || null,
        status: "pending",
        bankAccount: null,
        bankName: null,
        photoUrl: null,
        idCardUrl: null,
        confirmedDressCode: false,
        confirmedRules: false,
        documentsSubmittedAt: null,
        appliedAt: new Date().toISOString(),
      };

      await ddb.send(new PutCommand({
        TableName: APPLICATIONS_TABLE,
        Item: item,
      }));

      // 4. saveIntroduction 옵션: 자기소개를 프로필에도 저장
      if (body.saveIntroduction && body.selfIntroduction) {
        await ddb.send(new UpdateCommand({
          TableName: PROFILES_TABLE,
          Key: { userId },
          UpdateExpression: "SET selfIntroduction = :si, updatedAt = :now",
          ExpressionAttributeValues: {
            ":si": body.selfIntroduction,
            ":now": new Date().toISOString(),
          },
        }));
      }

      return ok(item, 201);
    }

    // PATCH /api/applications/{id} - 서류 제출 (은행, 사진 등)
    if (method === "PATCH" && resource === "/api/applications/{id}") {
      const id = event.pathParameters?.id;
      const body = JSON.parse(event.body);

      // 본인 확인
      const existing = await ddb.send(new GetCommand({
        TableName: APPLICATIONS_TABLE,
        Key: { id },
      }));
      if (!existing.Item) {
        return error(404, "Application not found");
      }
      if (existing.Item.userId !== userId) {
        return error(403, "Forbidden");
      }

      const allowedFields = ["bankAccount", "bankName", "photoUrl", "idCardUrl", "confirmedDressCode", "confirmedRules", "documentsSubmittedAt"];
      const expressionParts = [];
      const expressionValues = {};
      const expressionNames = {};

      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          const attrName = `#${field}`;
          const attrValue = `:${field}`;
          expressionNames[attrName] = field;
          expressionValues[attrValue] = body[field];
          expressionParts.push(`${attrName} = ${attrValue}`);
        }
      }

      if (expressionParts.length === 0) {
        return error(400, "No fields to update");
      }

      const result = await ddb.send(new UpdateCommand({
        TableName: APPLICATIONS_TABLE,
        Key: { id },
        UpdateExpression: `SET ${expressionParts.join(", ")}`,
        ExpressionAttributeNames: expressionNames,
        ExpressionAttributeValues: expressionValues,
        ReturnValues: "ALL_NEW",
      }));

      return ok(result.Attributes);
    }

    // DELETE /api/applications/{id} - 지원 취소
    if (method === "DELETE" && resource === "/api/applications/{id}") {
      const id = event.pathParameters?.id;

      // 본인 확인
      const existing = await ddb.send(new GetCommand({
        TableName: APPLICATIONS_TABLE,
        Key: { id },
      }));
      if (!existing.Item) {
        return error(404, "Application not found");
      }
      if (existing.Item.userId !== userId) {
        return error(403, "Forbidden");
      }

      await ddb.send(new DeleteCommand({
        TableName: APPLICATIONS_TABLE,
        Key: { id },
      }));

      return ok({ message: "Application deleted" });
    }

    return error(405, "Method Not Allowed");
  } catch (err) {
    console.error("applicationHandler error:", err);
    return error(500, err.message);
  }
};
