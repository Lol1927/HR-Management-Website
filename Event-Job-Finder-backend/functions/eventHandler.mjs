import { ScanCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddb } from "../lib/dynamo.mjs";
import { ok, error } from "../lib/response.mjs";

const TABLE_NAME = process.env.EVENTS_TABLE || "Events";

// HR Management 이벤트를 알바톡 형식으로 변환
function normalizeEvent(item) {
  // 이미 알바톡 형식이면 그대로 반환
  if (item.date) return item;

  // HR Management 형식 → 알바톡 형식 변환
  if (item.startDate && item.endDate) {
    // startDate ~ endDate 사이 날짜 배열 생성
    const workDates = [];
    let curr = new Date(item.startDate);
    const last = new Date(item.endDate);
    while (curr <= last) {
      workDates.push(curr.toISOString().split("T")[0]);
      curr.setDate(curr.getDate() + 1);
    }

    // assignedStaff에서 시간/급여 정보 추출
    const firstStaff = item.assignedStaff?.[0];
    const startTime = firstStaff?.workStart || "09:00";
    const endTime = firstStaff?.workEnd || "18:00";

    // 총 인원 수 (날짜별 중복 제거)
    const uniqueStaffIds = new Set(
      (item.assignedStaff || []).map((s) => s.id)
    );

    return {
      id: item.id,
      title: item.title,
      date: item.startDate,
      workDates,
      startTime,
      endTime,
      location: item.location || "미정",
      region: item.region || "",
      category: item.category || "sports",
      jobType: item.jobType || "행사 스태프",
      wage: parseInt((firstStaff?.pay || "0").replace(/,/g, "")) || 0,
      wageType: "daily",
      positionsAvailable: uniqueStaffIds.size || 1,
      description: item.description || "",
      createdAt: item.updatedAt || new Date().toISOString(),
      // 원본 데이터 보존
      _source: "hr-management",
      assignedStaff: item.assignedStaff,
    };
  }

  return item;
}

export const handler = async (event) => {
  const method = event.httpMethod;
  const id = event.pathParameters?.id;

  try {
    // GET /api/events/{id} - 이벤트 상세
    if (method === "GET" && id) {
      const result = await ddb.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { id },
        })
      );

      if (!result.Item) {
        return error(404, "Event not found");
      }
      return ok(normalizeEvent(result.Item));
    }

    // GET /api/events - 전체 이벤트 목록
    if (method === "GET") {
      const result = await ddb.send(new ScanCommand({ TableName: TABLE_NAME }));
      const items = (result.Items || []).map(normalizeEvent);
      return ok(items);
    }

    return error(405, "Method Not Allowed");
  } catch (err) {
    console.error("eventHandler error:", err);
    return error(500, err.message);
  }
};
