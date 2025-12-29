const { v4: uuidv4 } = require("uuid");
const {
  PutCommand,
  ScanCommand,
  UpdateCommand,
  GetCommand,
} = require("@aws-sdk/lib-dynamodb");

const { ddb } = require("../lib/ddb");
const { ok, badRequest, serverError } = require("../lib/http");
const {
  employeeCreateSchema,
  employeeUpdateSchema,
} = require("../lib/validators");

const EMPLOYEES_TABLE = process.env.EMPLOYEES_TABLE;
const ORG_ID = "DEFAULT";

module.exports.list = async (event) => {
  try {
    const q = event.queryStringParameters || {};
    const search = (q.search || "").trim();

    const res = await ddb.send(
      new ScanCommand({ TableName: EMPLOYEES_TABLE })
    );

    let items = (res.Items || []).filter(
      (x) => x.orgId === ORG_ID && !x.deletedAt
    );

    if (search) {
      const s = search.toLowerCase();
      items = items.filter(
        (x) =>
          (x.name || "").toLowerCase().includes(s) ||
          (x.phone || "").toLowerCase().includes(s)
      );
    }

    return ok({ items, total: items.length });
  } catch (e) {
    console.error(e);
    return serverError("Failed to list employees", e.message);
  }
};

module.exports.create = async (event) => {
  try {
    const body = JSON.parse(event.body || "{}");
    const parsed = employeeCreateSchema.safeParse(body);
    if (!parsed.success) {
      return badRequest("Validation error", parsed.error.flatten());
    }

    const now = Date.now();
    const employeeId = uuidv4();

    const item = {
      orgId: ORG_ID,
      employeeId,
      ...parsed.data,
      createdAt: now,
      updatedAt: now,
    };

    await ddb.send(
      new PutCommand({
        TableName: EMPLOYEES_TABLE,
        Item: item,
      })
    );

    return ok({ item }, 201);
  } catch (e) {
    console.error(e);
    return serverError("Failed to create employee", e.message);
  }
};
