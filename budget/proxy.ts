import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// 로그인하지 않은 사용자는 /login 으로 보냄 (재정 자료라 모든 페이지 비공개)
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // 정적 파일과 API는 제외 (API 라우트는 자체적으로 로그인 확인)
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
