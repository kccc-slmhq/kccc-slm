// Vercel 서버리스 함수의 요청 본문 한도(4.5MB)보다 약간 작게
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const ALLOWED_UPLOAD_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

export const UPLOAD_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp";
