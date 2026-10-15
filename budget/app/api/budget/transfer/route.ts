import { createClient } from "@/lib/supabase/server";
import { checkRequest } from "@/lib/budget/editAuth";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");

// 예산 용도변경 (재정 담당자 비밀번호 + 회의록 정보 필수)
// body: { fiscal_year, from: {category_group, category}, to: {category_group, category}, amount, reason,
//         meeting: { date: "YYYY-MM-DD", place, attendees } }
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const denied = await checkRequest(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const amount = Number(body?.amount);
  const meetingDate = text(body?.meeting?.date);
  if (
    !Number.isInteger(body?.fiscal_year) ||
    !text(body?.from?.category) ||
    !text(body?.to?.category) ||
    !Number.isInteger(amount) ||
    amount <= 0
  ) {
    return Response.json({ error: "보내는 항목, 받는 항목, 금액을 확인해주세요." }, { status: 400 });
  }
  if (!DATE_RE.test(meetingDate) || !text(body?.meeting?.place) || !text(body?.meeting?.attendees)) {
    return Response.json(
      { error: "회의 날짜, 장소, 참석자 명단을 모두 기록해야 용도변경을 할 수 있습니다." },
      { status: 400 }
    );
  }

  const { error } = await supabase.rpc("transfer_budget", {
    p_fiscal_year: body.fiscal_year,
    p_from_group: typeof body.from.category_group === "string" ? body.from.category_group : "",
    p_from_category: body.from.category,
    p_to_group: text(body.to.category_group),
    p_to_category: text(body.to.category),
    p_amount: amount,
    p_reason: text(body.reason),
    p_meeting_date: meetingDate,
    p_meeting_place: text(body.meeting.place),
    p_attendees: text(body.meeting.attendees),
  });
  if (error) {
    const missing = /transfer_budget|budget_transfers/.test(error.message) && /not find|does not exist/.test(error.message);
    return Response.json(
      {
        error: missing
          ? "용도변경 기능이 아직 데이터베이스에 준비되지 않았습니다. 관리자에게 SQL 실행을 요청해주세요."
          : `용도변경에 실패했습니다: ${error.message}`,
      },
      { status: 400 }
    );
  }
  return Response.json({ ok: true });
}
