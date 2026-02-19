import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../lib/dynamo.mjs";
import { ok, error } from "../lib/response.mjs";
import { getUserId } from "../lib/auth.mjs";

const TABLE_NAME = process.env.REGULAR_TABLE;
const PROFILES_TABLE = process.env.PROFILES_TABLE;

export const handler = async (event) => {
  const method = event.httpMethod;
  const userId = getUserId(event);

  if (!userId) {
    return error(401, "Unauthorized");
  }

  try {
    // GET /api/regular-application - 내 상시 근무 조회
    if (method === "GET") {
      const result = await ddb.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { userId },
      }));

      if (!result.Item) {
        return error(404, "Regular application not found");
      }
      return ok(result.Item);
    }

    // POST /api/regular-application - 상시 근무 등록 (중복 방지)
    if (method === "POST") {
      const body = JSON.parse(event.body);

      // 프로필 존재 확인
      const profileResult = await ddb.send(new GetCommand({
        TableName: PROFILES_TABLE,
        Key: { userId },
      }));
      if (!profileResult.Item) {
        return error(400, "Profile required");
      }

      const item = {
        userId,
        availableDays: body.availableDays,
        preferredCategories: body.preferredCategories,
        availableStartTime: body.availableStartTime,
        availableEndTime: body.availableEndTime,
        note: body.note || null,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await ddb.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
        ConditionExpression: "attribute_not_exists(userId)",
      }));

      return ok(item, 201);
    }

    // PATCH /api/regular-application - 상시 근무 수정
    if (method === "PATCH") {
      const body = JSON.parse(event.body);
      const allowedFields = ["availableDays", "preferredCategories", "availableStartTime", "availableEndTime", "note", "isActive"];

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

      expressionParts.push("#updatedAt = :updatedAt");
      expressionNames["#updatedAt"] = "updatedAt";
      expressionValues[":updatedAt"] = new Date().toISOString();

      const result = await ddb.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { userId },
        UpdateExpression: `SET ${expressionParts.join(", ")}`,
        ExpressionAttributeNames: expressionNames,
        ExpressionAttributeValues: expressionValues,
        ConditionExpression: "attribute_exists(userId)",
        ReturnValues: "ALL_NEW",
      }));

      return ok(result.Attributes);
    }

    return error(405, "Method Not Allowed");
  } catch (err) {
    console.error("regularApplicationHandler error:", err);

    if (err.name === "ConditionalCheckFailedException") {
      if (event.httpMethod === "POST") {
        return error(400, "Regular application already exists");
      }
      return error(404, "Regular application not found");
    }

    return error(500, err.message);
  }
};
