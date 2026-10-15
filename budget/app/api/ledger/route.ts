import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { EDIT_COOKIE, checkToken } from "@/lib/budget/editAuth";

const MONTH_RE = /^\d{4}-\d{2}$/;

async function context() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const cookieStore = await cookies();
  return { supabase, user: data.user, unlocked: checkToken(cookieStore.get(EDIT_COOKIE)?.value) };
}

const LOCKED = Response.json(
  { error: "확정된 월별 장부의 수정과 삭제는 SLM HQ 재정 담당자만 할 수 있습니다. 비밀번호를 입력해주세요.", locked: true },
  { status: 403 }
);

// 월별 장부 확정. 이미 확정된 달을 다시 확정(수정)하려면 재정 담당자 비밀번호 확인이 필요
// body: { month: "YYYY-MM", fiscal_year, source_filename, entries: [...] }
export async function POST(request: Request) {
  const { supabase, user, unlocked } = await context();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const month = body?.month;
  if (typeof month !== "string" || !MONTH_RE.test(month) || !Array.isArray(body?.entries)) {
    return Response.json({ error: "필수 값이 누락되었습니다." }, { status: 400 });
  }

  const { data: existing } = await supabase.from("ledger_months").select("month").eq("month", `${month}-01`).maybeSingle();
  if (existing && !unlocked) return LOCKED.clone();

  const { error } = await supabase.rpc("save_ledger_month", {
    p_month: `${month}-01`,
    p_source_filename: typeof body.source_filename === "string" ? body.source_filename : null,
    p_entries: body.entries,
    p_fiscal_year: Number.isInteger(body.fiscal_year) ? body.fiscal_year : null,
  });
  if (error) return Response.json({ error: `저장에 실패했습니다: ${error.message}` }, { status: 400 });
  return Response.json({ ok: true });
}

// 월별 장부 삭제 (재정 담당자 비밀번호 확인 필요). ?month=YYYY-MM
export async function DELETE(request: Request) {
  const { supabase, user, unlocked } = await context();
  if (!user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (!unlocked) return LOCKED.clone();

  const month = new URL(request.url).searchParams.get("month");
  if (!month || !MONTH_RE.test(month)) return Response.json({ error: "달이 올바르지 않습니다." }, { status: 400 });

  const { error } = await supabase.from("ledger_months").delete().eq("month", `${month}-01`);
  if (error) return Response.json({ error: `삭제에 실패했습니다: ${error.message}` }, { status: 400 });
  return Response.json({ ok: true });
}
