const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { ddb } = require("../lib/ddb");
const { ok, serverError } = require("../lib/http");

const EMPLOYEES_TABLE = process.env.EMPLOYEES_TABLE;
const ORG_ID = "DEFAULT";

function isThisMonth(ts) {
  const d = new Date(ts);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth()
  );
}

module.exports.stats = async () => {
  try {
    const res = await ddb.send(
      new ScanCommand({ TableName: EMPLOYEES_TABLE })
    );

    const items = (res.Items || []).filter(
      (x) => x.orgId === ORG_ID && !x.deletedAt
    );

    const total = items.length;
    const active = items.filter((x) => x.status === "ACTIVE").length;
    const rated = items.filter((x) => typeof x.rating === "number").length;
    const newThisMonth = items.filter(
      (x) => x.createdAt && isThisMonth(x.createdAt)
    ).length;

    return ok({
      totalEmployees: total,
      activeEmployees: active,
      ratedEmployees: rated,
      newThisMonthEmployees: newThisMonth,
    });
  } catch (e) {
    console.error(e);
    return serverError("Failed to get dashboard stats", e.message);
  }
};
