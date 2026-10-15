// Vercel 서버리스 함수의 요청 본문 한도(4.5MB)보다 약간 작게
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export const UPLOAD_ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp";

export type UploadType = "application/pdf" | "image/png" | "image/jpeg" | "image/webp";

// 파일 내용(시그니처)으로 종류를 판별. 브라우저가 보내는 file.type 은 Windows 설정 등에 따라
// 비어 있거나 틀릴 수 있어서 믿지 않음.
export function detectUploadType(bytes: Uint8Array): UploadType | null {
  const startsWith = (sig: number[], offset = 0) => sig.every((b, i) => bytes[offset + i] === b);

  if (startsWith([0x89, 0x50, 0x4e, 0x47])) return "image/png";
  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  // PDF 헤더(%PDF-)는 파일 앞 1024바이트 안 어딘가에 있으면 됨
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 1024));
  if (head.includes("%PDF-")) return "application/pdf";
  return null;
}

// 지원하지 않는 파일일 때 안내 문구
export function unsupportedUploadMessage(bytes: Uint8Array): string {
  const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b; // xlsx, docx, hwpx
  const isOle = bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0; // xls, doc, hwp
  if (isZip || isOle) {
    return "엑셀·한글·워드 파일은 바로 읽을 수 없습니다. 'PDF로 저장(인쇄)' 해서 PDF로 올려주세요.";
  }
  return "PDF 또는 이미지(PNG/JPG) 파일만 올릴 수 있습니다.";
}
