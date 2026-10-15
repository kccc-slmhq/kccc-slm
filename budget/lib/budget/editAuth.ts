import "server-only";
import { timingSafeEqual } from "node:crypto";

// 재정 담당자 비밀번호. 코드에 넣지 않고 Vercel 환경변수로만 받음
//   EDIT_PASSWORD  (필수) — 없으면 업로드·수정·삭제 불가
// 로그인 세션처럼 기억하지 않고, 업로드·수정·삭제 요청마다 비밀번호를 함께 받아 확인함
export const EDIT_PASSWORD_HEADER = "x-edit-password";

export const EDIT_NOTICE_SERVER =
  "업로드와 확정된 자료의 수정·삭제는 SLM HQ 재정 담당자만 할 수 있습니다. 비밀번호를 입력해주세요.";

function password(): string | null {
  const p = process.env.EDIT_PASSWORD?.trim();
  return p ? p : null;
}

export function isEditPasswordConfigured(): boolean {
  return password() !== null;
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkPassword(input: string): boolean {
  const p = password();
  return p !== null && safeEqual(input.trim(), p);
}

// 요청 헤더의 비밀번호 확인. 통과하면 null, 아니면 돌려줄 오류 응답
export async function passwordError(input: string | null): Promise<Response | null> {
  if (!isEditPasswordConfigured()) {
    return Response.json(
      { error: "재정 담당자 비밀번호가 아직 설정되지 않았습니다. 관리자에게 문의해주세요. (EDIT_PASSWORD)" },
      { status: 503 }
    );
  }
  if (input !== null && checkPassword(input)) return null;
  // 무작위 대입을 늦추기 위해 잠깐 기다렸다가 응답
  await new Promise((r) => setTimeout(r, 800));
  return Response.json(
    { error: input ? "비밀번호가 맞지 않습니다." : EDIT_NOTICE_SERVER, locked: true },
    { status: 403 }
  );
}

export function requestPassword(request: Request): string | null {
  const raw = request.headers.get(EDIT_PASSWORD_HEADER);
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function checkRequest(request: Request): Promise<Response | null> {
  return passwordError(requestPassword(request));
}
