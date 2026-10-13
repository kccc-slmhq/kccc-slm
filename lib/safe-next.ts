// 로그인 후 돌아갈 경로. 외부 URL로의 이동을 막기 위해 내부 경로만 허용
export function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/admin";
}
