import "server-only";
import type { ParsedBudget, ParsedLedger } from "./types";
import { UNCATEGORIZED } from "./types";

// Gemini API 키/모델은 환경변수로만 받습니다 (코드에 키를 넣지 마세요).
//   GEMINI_API_KEY  (필수) 여러 개면 쉼표로 구분 — 앞의 키가 한도 초과 등으로 막히면 다음 키로 시도
//   GEMINI_MODEL    (선택, 기본값 gemini-2.5-flash)
const DEFAULT_MODEL = "gemini-2.5-flash";

export class GeminiError extends Error {}

type InlineFile = { mimeType: string; base64: string };

function apiKeys(): string[] {
  return (process.env.GEMINI_API_KEY ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

async function generateJson(prompt: string, file: InlineFile, responseSchema: object): Promise<unknown> {
  const keys = apiKeys();
  if (keys.length === 0) {
    throw new GeminiError("GEMINI_API_KEY 환경변수가 설정되지 않았습니다.");
  }

  let lastError: GeminiError | null = null;
  for (const key of keys) {
    try {
      return await generateJsonWithKey(key, prompt, file, responseSchema);
    } catch (err) {
      // 한도 초과/키 문제일 때만 다음 키로. 문서 자체 문제는 다른 키로 해도 같으므로 바로 실패
      if (err instanceof KeyRejectedError) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }
  throw lastError ?? new GeminiError("AI 분석 중 오류가 발생했습니다.");
}

class KeyRejectedError extends GeminiError {}

async function generateJsonWithKey(
  apiKey: string,
  prompt: string,
  file: InlineFile,
  responseSchema: object
): Promise<unknown> {
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ inline_data: { mime_type: file.mimeType, data: file.base64 } }, { text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema,
        },
      }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    console.error("gemini error", res.status, body);
    if (res.status === 429) throw new KeyRejectedError("AI 사용 한도를 초과했습니다. 잠시 후 다시 시도해주세요.");
    if (res.status === 401 || res.status === 403 || (res.status === 400 && /API_KEY|api key/i.test(body))) {
      throw new KeyRejectedError("AI 요청이 거부되었습니다. GEMINI_API_KEY를 확인해주세요.");
    }
    if (res.status === 400) throw new GeminiError("AI가 이 파일을 처리하지 못했습니다. 파일 형식을 확인해주세요.");
    throw new GeminiError("AI 분석 중 오류가 발생했습니다.");
  }

  const data = await res.json();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? "")
    .join("");
  if (!text) throw new GeminiError("AI가 문서를 읽지 못했습니다.");
  try {
    return JSON.parse(text);
  } catch {
    throw new GeminiError("AI 응답을 해석하지 못했습니다.");
  }
}

function toAmount(v: unknown): number {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

function toStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

export async function parseBudgetDocument(file: InlineFile): Promise<ParsedBudget> {
  const prompt = [
    "첨부된 문서는 한국 대학생 선교단체(SLM)의 연간 예산안이다.",
    "회기는 매년 8월부터 다음 해 7월까지다.",
    "",
    "다음을 추출해라:",
    "- fiscal_year: 회기 '시작 연도' (예: 2026년 8월~2027년 7월 회기면 2026). 알 수 없으면 null.",
    "- document_total: 문서에 적힌 지출 예산 총액(원). 없으면 null.",
    "- items: 지출 예산의 항목별 배정 금액. 항목명은 문서에 적힌 이름 그대로 쓴다.",
    "",
    "규칙:",
    "- 대분류/소분류가 있으면 금액이 배정된 가장 구체적인 항목 단위로 나열하되, 하위 항목과 그 합계 행을 중복으로 넣지 마라.",
    "- '합계', '총계', '소계' 행은 items에 넣지 마라.",
    "- 수입 예산(헌금, 회비 수입 등)은 items에 넣지 마라. 지출 예산만 넣는다.",
    "- 금액은 원 단위 정수로 변환한다 (예: '1,200만원' → 12000000, 천원 단위 표기면 1000을 곱한다).",
  ].join("\n");

  const schema = {
    type: "OBJECT",
    properties: {
      fiscal_year: { type: "INTEGER", nullable: true },
      document_total: { type: "NUMBER", nullable: true },
      items: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            category: { type: "STRING" },
            amount: { type: "NUMBER" },
          },
          required: ["category", "amount"],
        },
      },
    },
    required: ["items"],
  };

  const raw = (await generateJson(prompt, file, schema)) as Record<string, unknown>;
  const items = (Array.isArray(raw.items) ? raw.items : [])
    .map((it: Record<string, unknown>) => ({ category: toStr(it.category), amount: toAmount(it.amount) }))
    .filter((it) => it.category);

  const fy = typeof raw.fiscal_year === "number" ? raw.fiscal_year : null;
  return {
    fiscal_year: fy && fy > 2000 && fy < 2100 ? fy : null,
    document_total: raw.document_total == null ? null : toAmount(raw.document_total),
    items,
  };
}

export async function parseLedgerDocument(file: InlineFile, categories: string[]): Promise<ParsedLedger> {
  const allowed = [...categories, UNCATEGORIZED];
  const prompt = [
    "첨부된 문서는 한국 대학생 선교단체(SLM)의 한 달치 회계 장부(지출 내역)다.",
    "",
    "다음을 추출해라:",
    "- month: 장부의 대상 월 'YYYY-MM'. 알 수 없으면 null.",
    "- items: 지출 거래 한 건씩. 각 거래는 entry_date('YYYY-MM-DD' 또는 null), description(적요/내용/거래처), amount(원 단위 정수), category.",
    "",
    "category 는 반드시 다음 예산 항목 중 하나로 분류한다:",
    allowed.map((c) => `- ${c}`).join("\n"),
    `어느 항목에도 맞지 않으면 '${UNCATEGORIZED}'로 둔다. 장부에 적힌 계정/항목명이 예산 항목과 비슷하면 그 예산 항목으로 맞춘다.`,
    "",
    "규칙:",
    "- 지출만 넣는다. 수입, 이월금, 잔액, 합계/소계 행은 넣지 마라.",
    "- 같은 거래를 중복으로 넣지 마라.",
  ].join("\n");

  const schema = {
    type: "OBJECT",
    properties: {
      month: { type: "STRING", nullable: true },
      items: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            entry_date: { type: "STRING", nullable: true },
            description: { type: "STRING" },
            amount: { type: "NUMBER" },
            category: { type: "STRING", enum: allowed },
          },
          required: ["description", "amount", "category"],
        },
      },
    },
    required: ["items"],
  };

  const raw = (await generateJson(prompt, file, schema)) as Record<string, unknown>;
  const items = (Array.isArray(raw.items) ? raw.items : [])
    .map((it: Record<string, unknown>) => {
      const date = toStr(it.entry_date);
      const category = toStr(it.category);
      return {
        entry_date: DATE_RE.test(date) ? date : null,
        description: toStr(it.description),
        amount: toAmount(it.amount),
        category: allowed.includes(category) ? category : UNCATEGORIZED,
      };
    })
    .filter((it) => it.amount > 0);

  const month = toStr(raw.month);
  return { month: MONTH_RE.test(month) ? month : null, items };
}
