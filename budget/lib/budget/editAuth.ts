import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// 확정된 장부 수정·삭제용 비밀번호. 코드에 넣지 않고 Vercel 환경변수로만 받음
//   EDIT_PASSWORD  (필수) — 없으면 수정·삭제 잠금 해제 불가
export const EDIT_COOKIE = "edit_auth";
export const EDIT_COOKIE_MAX_AGE = 60 * 60 * 8; // 8시간

function password(): string | null {
  const p = process.env.EDIT_PASSWORD?.trim();
  return p ? p : null;
}

export function isEditPasswordConfigured(): boolean {
  return password() !== null;
}

// 쿠키에는 비밀번호 대신 비밀번호로 서명한 값만 저장 (비밀번호가 바뀌면 자동으로 무효)
export function editToken(): string | null {
  const p = password();
  return p ? createHmac("sha256", p).update("slm-budget-edit").digest("hex") : null;
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

export function checkToken(token: string | undefined): boolean {
  const t = editToken();
  return !!token && t !== null && safeEqual(token, t);
}
