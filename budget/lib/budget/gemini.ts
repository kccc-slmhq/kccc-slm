import "server-only";
import type { ParsedBudget, ParsedLedger } from "./types";
import { UNCATEGORIZED, UNCATEGORIZED_REF, itemLabel, type ItemRef } from "./types";

// Gemini API 키/모델은 환경변수로만 받습니다 (코드에 키를 넣지 마세요).
//   GEMINI_API_KEY  (필수) 여러 개면 쉼표로 구분 — 앞의 키가 한도 초과 등으로 막히면 다음 키로 시도
//   GEMINI_MODEL    (선택, 기본값 gemini-3.8-flash) — 혼잡하면 FALLBACK_MODELS 순서로 자동 전환
const DEFAULT_MODEL = "gemini-3.8-flash";
const FALLBACK_MODELS = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-flash-latest"];

// Vercel 함수 제한(route.ts 의 maxDuration = 180초) 안에 끝내고 안내 문구를 돌려주기 위한 전체 시간 한도
const DEADLINE_MS = 165_000;

export class GeminiError extends Error {}

type InlineFile = { mimeType: string; base64: string };

function apiKeys(): string[] {
  return (process.env.GEMINI_API_KEY ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

function models(): string[] {
  const first = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  return [first, ...FALLBACK_MODELS.filter((m) => m !== first)];
}

async function generateJson(prompt: string, file: InlineFile, responseSchema: object): Promise<unknown> {
  const keys = apiKeys();
  if (keys.length === 0) {
    throw new GeminiError("GEMINI_API_KEY 환경변수가 설정되지 않았습니다.");
  }

  // 모델 × 키 순서로 시도.
  // - 서버 혼잡(503 등)/시간 초과: 다음 모델로
  // - 한도 초과/키 문제: 같은 모델의 다음 키로
  // - 문서 자체 문제: 다른 키·모델로 해도 같으므로 바로 실패
  const deadline = Date.now() + DEADLINE_MS;
  let lastError: GeminiError | null = null;
  // Gemini 혼잡은 순간적인 경우가 많아서, 모든 모델이 혼잡하면 잠깐 쉬고 한 바퀴 더 시도
  const attempts = [...models(), ...models()];
  for (const [i, model] of attempts.entries()) {
    if (i === attempts.length / 2) await new Promise((r) => setTimeout(r, 3000));
    for (const key of keys) {
      const remaining = deadline - Date.now();
      if (remaining < 3_000) {
        throw lastError ?? new BusyError(BUSY_MESSAGE);
      }
      try {
        return await generateJsonWithKey(model, key, prompt, file, responseSchema, remaining);
      } catch (err) {
        if (err instanceof BusyError) {
          lastError = err;
          break; // 이 모델은 혼잡 → 다음 모델
        }
        if (err instanceof KeyRejectedError) {
          lastError = err;
          continue; // 다음 키
        }
        throw err;
      }
    }
  }
  throw lastError ?? new GeminiError("AI 분석 중 오류가 발생했습니다.");
}

const BUSY_MESSAGE = "AI 서버가 잠시 혼잡합니다. 1~2분 뒤에 다시 시도해주세요.";

class KeyRejectedError extends GeminiError {}
class BusyError extends GeminiError {}

async function generateJsonWithKey(
  model: string,
  apiKey: string,
  prompt: string,
  file: InlineFile,
  responseSchema: object,
  timeoutMs: number
): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        signal: AbortSignal.timeout(timeoutMs),
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
            // 표 읽기에는 '생각' 단계가 필요 없고, 켜면 응답이 수십 초 느려져 시간 제한에 걸림
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );
  } catch (err) {
    console.error("gemini request failed", model, err);
    throw new BusyError(BUSY_MESSAGE);
  }

  if (!res.ok) {
    const body = await res.text();
    console.error("gemini error", model, res.status, body);
    if (res.status === 429) throw new KeyRejectedError("AI 사용 한도를 초과했습니다. 잠시 후 다시 시도해주세요.");
    if (res.status === 401 || res.status === 403 || (res.status === 400 && /API_KEY|api key/i.test(body))) {
      throw new KeyRejectedError("AI 요청이 거부되었습니다. GEMINI_API_KEY를 확인해주세요.");
    }
    // 모델을 못 쓰는 경우(404, 미지원 설정 등)는 다음 모델로
    if (res.status === 404 || (res.status === 400 && /model|thinking/i.test(body))) throw new BusyError(BUSY_MESSAGE);
    if (res.status === 400) throw new GeminiError("AI가 이 파일을 처리하지 못했습니다. 파일 형식을 확인해주세요.");
    if (res.status >= 500) throw new BusyError(BUSY_MESSAGE);
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
    "- document_total: 문서에 적힌 지출 예산 총액(원, 아래 items 와 같은 금액 열 기준). 없으면 null.",
    "- items: 지출 예산의 세부 항목 하나씩. 각 항목은 category_group, category, amount.",
    "",
    "category_group / category:",
    "- 예산안은 보통 왼쪽 열에 큰 카테고리(예: 업무추진비, 경조사비, 해외출장비)가 있고, 그 옆에 세부 항목(세부내역)이 여러 줄 있다.",
    "- category_group 에는 그 세부 항목이 속한 큰 카테고리 이름을, category 에는 세부 항목 이름을 문서에 적힌 그대로 쓴다.",
    "- 큰 카테고리 칸이 병합되어 첫 줄에만 적혀 있어도, 그 아래 세부 항목들은 모두 같은 큰 카테고리에 속한다.",
    "- 큰 카테고리는 반드시 왼쪽 카테고리 열에 적힌 이름만 쓴다. 'OO 소계' 행의 이름은 큰 카테고리가 아니다.",
    "  (소계 행 이름이 왼쪽 카테고리 이름과 달라도 무시하고, 소계 행 바로 위 항목들은 왼쪽 열의 카테고리에 넣는다)",
    "- 큰 카테고리가 없는 문서면 category_group 은 빈 문자열로 둔다.",
    "- '예비비'처럼 같은 이름의 세부 항목이 여러 큰 카테고리에 있으면 각각 따로 넣는다.",
    "",
    "amount:",
    "- 금액 열이 여러 개면(예: '예산(안)'과 '물가인상율 반영') 가장 최종 금액인 오른쪽 열(물가인상 반영 등)을 쓴다.",
    "  그 열이 비어 있는 항목만 왼쪽 예산 열 금액을 쓴다.",
    "- 금액은 원 단위 정수로 변환한다 (예: '1,200만원' → 12000000, 천원 단위 표기면 1000을 곱한다, 괄호는 무시).",
    "",
    "제외:",
    "- '소계', '합계', '총계', '총 지출의 합' 행은 넣지 마라. 이름에 '소계'가 붙은 행, 이름 없이 금액만 있는 합계 행도 마찬가지다.",
    "  세부내역 칸에 이름이 적힌 행만 항목이다.",
    "- 수입 예산(수련회 지원금, 후원, 회비 수입 등)은 넣지 마라. 지출 예산만 넣는다.",
    "- 피드백·비고 열의 내용은 항목이 아니다.",
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
            category_group: { type: "STRING" },
            category: { type: "STRING" },
            amount: { type: "NUMBER" },
          },
          required: ["category_group", "category", "amount"],
        },
      },
    },
    required: ["items"],
  };

  const raw = (await generateJson(prompt, file, schema)) as Record<string, unknown>;
  const items = (Array.isArray(raw.items) ? raw.items : [])
    .map((it: Record<string, unknown>) => ({
      category_group: toStr(it.category_group),
      category: toStr(it.category),
      amount: toAmount(it.amount),
    }))
    .filter((it) => it.category);

  const fy = typeof raw.fiscal_year === "number" ? raw.fiscal_year : null;
  return {
    fiscal_year: fy && fy > 2000 && fy < 2100 ? fy : null,
    document_total: raw.document_total == null ? null : toAmount(raw.document_total),
    items,
  };
}

export async function parseLedgerDocument(file: InlineFile, budgetItems: ItemRef[]): Promise<ParsedLedger> {
  // AI에게는 "큰 카테고리 › 항목" 라벨 중 하나를 고르게 하고, 결과를 다시 (큰 카테고리, 항목)으로 되돌림
  const refs = [...budgetItems, UNCATEGORIZED_REF];
  const byLabel = new Map(refs.map((r) => [itemLabel(r), r]));
  const allowed = [...byLabel.keys()];

  const prompt = [
    "첨부된 문서는 한국 대학생 선교단체(SLM)의 한 달치 회계 장부(지출 내역)다.",
    "",
    "다음을 추출해라:",
    "- month: 장부의 대상 월 'YYYY-MM'. 알 수 없으면 null.",
    "- items: 지출 거래 한 건씩. 각 거래는 entry_date('YYYY-MM-DD' 또는 null), description(적요/내용/거래처), amount(원 단위 정수), category.",
    "",
    "category 는 반드시 다음 예산 항목('큰 카테고리 › 세부 항목') 중 하나로 분류한다:",
    allowed.map((c) => `- ${c}`).join("\n"),
    `어느 항목에도 맞지 않으면 '${UNCATEGORIZED}'로 둔다.`,
    "장부에 계정과목/항목명이 적혀 있으면 그 이름과 가장 가까운 큰 카테고리를 먼저 고르고, 그 안에서 내용에 맞는 세부 항목을 고른다.",
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
      const ref = byLabel.get(toStr(it.category)) ?? UNCATEGORIZED_REF;
      return {
        entry_date: DATE_RE.test(date) ? date : null,
        description: toStr(it.description),
        amount: toAmount(it.amount),
        category_group: ref.category_group,
        category: ref.category,
      };
    })
    .filter((it) => it.amount > 0);

  const month = toStr(raw.month);
  return { month: MONTH_RE.test(month) ? month : null, items };
}
