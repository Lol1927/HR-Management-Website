import { GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../lib/dynamo.mjs";
import { ok, error } from "../lib/response.mjs";
import { getUserId } from "../lib/auth.mjs";

const TABLE_NAME = process.env.PROFILES_TABLE;

export const handler = async (event) => {
  const method = event.httpMethod;
  const userId = getUserId(event);

  if (!userId) {
    return error(401, "Unauthorized");
  }

  try {
    // GET /api/profile - 내 프로필 조회
    if (method === "GET") {
      const result = await ddb.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { userId },
      }));

      if (!result.Item) {
        return error(404, "Profile not found");
      }
      return ok(result.Item);
    }

    // POST /api/profile - 프로필 생성 (중복 방지)
    if (method === "POST") {
      const body = JSON.parse(event.body);

      const item = {
        userId,
        name: body.name,
        phone: body.phone,
        residentNumber: body.residentNumber,
        email: body.email,
        selfIntroduction: body.selfIntroduction || null,
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

    // PATCH /api/profile - 프로필 수정
    if (method === "PATCH") {
      const body = JSON.parse(event.body);
      const allowedFields = ["name", "phone", "residentNumber", "email", "selfIntroduction"];

      // 동적 SET 표현식 생성
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

      // updatedAt 항상 갱신
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
    console.error("profileHandler error:", err);

    if (err.name === "ConditionalCheckFailedException") {
      if (event.httpMethod === "POST") {
        return error(400, "Profile already exists");
      }
      return error(404, "Profile not found");
    }

    return error(500, err.message);
  }
};
