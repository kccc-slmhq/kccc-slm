import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import {
  EDIT_COOKIE,
  EDIT_COOKIE_MAX_AGE,
  checkPassword,
  checkToken,
  editToken,
  isEditPasswordConfigured,
} from "@/lib/budget/editAuth";

async function loggedIn(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return !!data.user;
}

// 지금 수정·삭제 잠금이 풀려 있는지
export async function GET() {
  if (!(await loggedIn())) return Response.json({ unlocked: false }, { status: 401 });
  const cookieStore = await cookies();
  return Response.json({
    unlocked: checkToken(cookieStore.get(EDIT_COOKIE)?.value),
    configured: isEditPasswordConfigured(),
  });
}

// 비밀번호 확인 → 맞으면 8시간 동안 잠금 해제
export async function POST(request: Request) {
  if (!(await loggedIn())) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (!isEditPasswordConfigured()) {
    return Response.json(
      { error: "수정 비밀번호가 아직 설정되지 않았습니다. 관리자에게 문의해주세요. (EDIT_PASSWORD)" },
      { status: 503 }
    );
  }
  const body = await request.json().catch(() => ({}));
  if (typeof body.password !== "string" || !checkPassword(body.password)) {
    // 무작위 대입을 늦추기 위해 잠깐 기다렸다가 응답
    await new Promise((r) => setTimeout(r, 800));
    return Response.json({ error: "비밀번호가 맞지 않습니다." }, { status: 403 });
  }
  const cookieStore = await cookies();
  cookieStore.set(EDIT_COOKIE, editToken()!, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: EDIT_COOKIE_MAX_AGE,
  });
  return Response.json({ unlocked: true });
}
