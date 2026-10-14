import { createClient } from "@/lib/supabase/server";
import { GeminiError, parseBudgetDocument, parseLedgerDocument } from "@/lib/budget/gemini";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from "@/lib/budget/upload";

export const maxDuration = 60;

// POST multipart/form-data
//   kind: "budget" | "ledger"
//   file: PDF 또는 이미지
//   categories: (ledger 전용) 예산 항목명 JSON 배열
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "업로드 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const kind = form.get("kind");
  const file = form.get("file");
  if ((kind !== "budget" && kind !== "ledger") || !(file instanceof File)) {
    return Response.json({ error: "필수 값이 누락되었습니다." }, { status: 400 });
  }
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
    return Response.json({ error: "PDF 또는 이미지(PNG/JPG) 파일만 올릴 수 있습니다." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return Response.json({ error: "파일이 너무 큽니다. 4MB 이하로 올려주세요." }, { status: 413 });
  }

  const inline = {
    mimeType: file.type,
    base64: Buffer.from(await file.arrayBuffer()).toString("base64"),
  };

  try {
    if (kind === "budget") {
      return Response.json(await parseBudgetDocument(inline));
    }

    let categories: string[] = [];
    try {
      const parsed = JSON.parse(String(form.get("categories") ?? "[]"));
      if (Array.isArray(parsed)) categories = parsed.filter((c): c is string => typeof c === "string");
    } catch {
      // 아래에서 빈 목록으로 처리
    }
    if (categories.length === 0) {
      return Response.json({ error: "예산 항목이 없습니다. 먼저 예산안을 확정해주세요." }, { status: 400 });
    }
    return Response.json(await parseLedgerDocument(inline, categories));
  } catch (err) {
    if (err instanceof GeminiError) {
      return Response.json({ error: err.message }, { status: 502 });
    }
    console.error("parse error", err);
    return Response.json({ error: "문서 분석 중 오류가 발생했습니다." }, { status: 500 });
  }
}
