import { createClient } from "@/lib/supabase/server";
import { passwordError } from "@/lib/budget/editAuth";

// 비밀번호가 맞는지만 확인 (기억하지 않음 — 실제 업로드·수정·삭제 요청에서 다시 확인)
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const denied = await passwordError(typeof body.password === "string" ? body.password : "");
  return denied ?? Response.json({ ok: true });
}
