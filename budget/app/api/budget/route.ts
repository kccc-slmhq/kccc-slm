import { createClient } from "@/lib/supabase/server";
import { checkRequest } from "@/lib/budget/editAuth";

async function loggedInClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user ? supabase : null;
}

const LOGIN_REQUIRED = () => Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
const validYear = (y: unknown): y is number => Number.isInteger(y) && (y as number) > 2000 && (y as number) < 3000;

// 예산안 확정 (재정 담당자 비밀번호 필요)
// body: { fiscal_year, source_filename, items: [{kind, category_group, category, amount, one_time}] }
export async function POST(request: Request) {
  const supabase = await loggedInClient();
  if (!supabase) return LOGIN_REQUIRED();
  const denied = await checkRequest(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!validYear(body?.fiscal_year) || !Array.isArray(body?.items)) {
    return Response.json({ error: "필수 값이 누락되었습니다." }, { status: 400 });
  }
  const { error } = await supabase.rpc("save_budget", {
    p_fiscal_year: body.fiscal_year,
    p_source_filename: typeof body.source_filename === "string" ? body.source_filename : null,
    p_items: body.items,
  });
  if (error) return Response.json({ error: `저장에 실패했습니다: ${error.message}` }, { status: 400 });
  return Response.json({ ok: true });
}

// 예산안 삭제 (재정 담당자 비밀번호 필요). ?fiscal_year=2026
export async function DELETE(request: Request) {
  const supabase = await loggedInClient();
  if (!supabase) return LOGIN_REQUIRED();
  const denied = await checkRequest(request);
  if (denied) return denied;

  const year = Number(new URL(request.url).searchParams.get("fiscal_year"));
  if (!validYear(year)) return Response.json({ error: "회기가 올바르지 않습니다." }, { status: 400 });
  const { error } = await supabase.from("budget_plans").delete().eq("fiscal_year", year);
  if (error) return Response.json({ error: `삭제에 실패했습니다: ${error.message}` }, { status: 400 });
  return Response.json({ ok: true });
}
