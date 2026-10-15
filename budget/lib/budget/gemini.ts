import "server-only";
import type { ParsedBudget, ParsedLedger } from "./types";
import { UNCATEGORIZED, itemLabel, kindOf, uncategorizedRef, type ItemRef, type Kind } from "./types";

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

type GenerateResult = { data: unknown; model: string; fallback: boolean };

async function generateJson(prompt: string, file: InlineFile, responseSchema: object): Promise<GenerateResult> {
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
  const primary = models()[0];
  const attempts = [...models(), ...models()];
  for (const [i, model] of attempts.entries()) {
    if (i === attempts.length / 2) await new Promise((r) => setTimeout(r, 3000));
    for (const key of keys) {
      const remaining = deadline - Date.now();
      if (remaining < 3_000) {
        throw lastError ?? new BusyError(BUSY_MESSAGE);
      }
      try {
        const data = await generateJsonWithKey(model, key, prompt, file, responseSchema, remaining);
        return { data, model, fallback: model !== primary };
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
    "- document_income_total: 문서에 적힌 수입 예산 총액(원). 없으면 null.",
    "- items: 예산의 세부 항목 하나씩. 각 항목은 kind, category_group, category, amount, one_time.",
    "",
    "kind:",
    "- 지출 예산 항목은 'expense', 수입 예산 항목은 'income'.",
    "- 예산안에는 보통 지출 예산 표와 별도의 수입 예산 표('[수입 예산]', '수입' 등)가 있다. 두 표의 항목을 모두 넣는다.",
    "",
    "category_group / category:",
    "- 예산안은 보통 왼쪽 열에 큰 카테고리(예: 업무추진비, 경조사비, 해외출장비)가 있고, 그 옆에 세부 항목(세부내역)이 여러 줄 있다.",
    "- category_group 에는 그 세부 항목이 속한 큰 카테고리 이름을, category 에는 세부 항목 이름을 문서에 적힌 그대로 쓴다.",
    "- 큰 카테고리 칸이 병합되어 첫 줄에만 적혀 있어도, 그 아래 세부 항목들은 모두 같은 큰 카테고리에 속한다.",
    "- 큰 카테고리는 반드시 왼쪽 카테고리 열에 적힌 이름만 쓴다. 'OO 소계' 행의 이름은 큰 카테고리가 아니다.",
    "  (소계 행 이름이 왼쪽 카테고리 이름과 달라도 무시하고, 소계 행 바로 위 항목들은 왼쪽 열의 카테고리에 넣는다)",
    "- 큰 카테고리가 없는 문서면 category_group 은 빈 문자열로 둔다.",
    "- 수입 예산도 같은 방식이다 (예: 항목 열의 '수련회·CMS', '후원' 이 큰 카테고리, 세부내역 열이 항목).",
    "- '예비비'처럼 같은 이름의 세부 항목이 여러 큰 카테고리에 있으면 각각 따로 넣는다.",
    "",
    "one_time (지출 항목만 의미 있음, 수입은 false):",
    "- 한 번 열리고 끝나는 행사·이벤트 예산이면 true. 예: 임명식, 포럼, 수련회, 컨퍼런스, MRD, 연 1회 행사, 횟수가 1인 행사성 항목.",
    "- 외부 단체·사역에 한 번(또는 연 1회) 보내는 후원·지원도 true. 예: 학복협 외부후원, SHINE(샤인) 지원, 군선교부 지원.",
    "- 매달·정기적으로 나가는 비용(식사·간식·교통·구독·공제·정기후원·격려금·정기 사역지원 등), 연회비처럼 일정 시점에 나가는 고정비, 예비비는 false.",
    "",
    "amount:",
    "- 금액 열이 여러 개면(예: '예산(안)'과 '물가인상율 반영') 가장 최종 금액인 오른쪽 열(물가인상 반영 등)을 쓴다.",
    "  그 열이 비어 있는 항목만 왼쪽 예산 열 금액을 쓴다.",
    "- 금액은 원 단위 정수로 변환한다 (예: '1,200만원' → 12000000, 천원 단위 표기면 1000을 곱한다, 괄호는 무시).",
    "",
    "제외:",
    "- '소계', '합계', '총계', '총 지출의 합', '수입 총계' 행은 넣지 마라. 이름에 '소계'가 붙은 행, 이름 없이 금액만 있는 합계 행도 마찬가지다.",
    "  세부내역 칸에 이름이 적힌 행만 항목이다.",
    "- 피드백·비고 열의 내용은 항목이 아니다.",
  ].join("\n");

  const schema = {
    type: "OBJECT",
    properties: {
      fiscal_year: { type: "INTEGER", nullable: true },
      document_total: { type: "NUMBER", nullable: true },
      document_income_total: { type: "NUMBER", nullable: true },
      items: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            kind: { type: "STRING", enum: ["expense", "income"] },
            category_group: { type: "STRING" },
            category: { type: "STRING" },
            amount: { type: "NUMBER" },
            one_time: { type: "BOOLEAN" },
          },
          required: ["kind", "category_group", "category", "amount", "one_time"],
        },
      },
    },
    required: ["items"],
  };

  const result = await generateJson(prompt, file, schema);
  const raw = result.data as Record<string, unknown>;
  const items = (Array.isArray(raw.items) ? raw.items : [])
    .map((it: Record<string, unknown>) => ({
      kind: (it.kind === "income" ? "income" : "expense") as Kind,
      category_group: toStr(it.category_group),
      category: toStr(it.category),
      amount: toAmount(it.amount),
      one_time: it.kind !== "income" && it.one_time === true,
    }))
    .filter((it) => it.category);

  const fy = typeof raw.fiscal_year === "number" ? raw.fiscal_year : null;
  return {
    fiscal_year: fy && fy > 2000 && fy < 2100 ? fy : null,
    document_total: raw.document_total == null ? null : toAmount(raw.document_total),
    document_income_total: raw.document_income_total == null ? null : toAmount(raw.document_income_total),
    items,
    model: result.model,
    fallback: result.fallback,
  };
}

// SLM 재정장부(복식부기) 읽는 법. 실제 2026년 8·9월 장부로 검증함
const LEDGER_READING_RULES = [
  "[장부 읽는 법 — 복식부기]",
  "장부가 '날짜 / 항목(계정코드 계정명) / 내역 / 차변 / 대변' 형식이면 복식부기라서, 거래 하나가 보통 두 줄(차변 줄과 대변 줄)로 나온다.",
  "두 줄 중 아래 규칙에 해당하는 줄 하나만 거래로 넣고, 짝이 되는 줄은 버린다. 그래야 금액이 두 번 잡히지 않는다.",
  "- 지출: 비용 계정(코드가 7로 시작: 회의비, 선교사역비, 출장및교통비, 사무용품비, 인쇄도서비, 경조사비, 간사복지비, 수련회비, 우편및운송비, 차량수선유지비 등)의 '차변' 금액.",
  "- 지출: '80001 지원헌금(내부)' 줄의 '차변' 금액 — 다른 계정으로 '보냄'(공제, 적립금, 사용료, 행정비, 다른간사 후원, 재정이양, 대관비, 은행수수료 등). 내역에 '후원'이 있어도 차변이면 지출이다.",
  "- 수입: '41002 후원헌금' 줄의 '대변' 금액.",
  "- 수입: '80001 지원헌금(내부)' 줄의 '대변' 금액 — 다른 계정에서 '받음'(지원금 등).",
  "- 금액이 음수(예: -2,000,000)인 줄은 부호를 뒤집어 반대로 본다: 대변 음수 → 그 금액만큼 지출(예: '사례 공제액'은 사례비로 나간 지출), 차변 음수 → 그 금액만큼 수입.",
  "- 후원이 들어왔다가 다른 계정으로 '재정이양'되어 나간 돈도 수입과 지출로 각각 넣는다 (최종 판단은 사람이 확인 화면에서 함).",
  "- '10001 현금', '12301 선지급금' 줄은 짝이 되는 줄이므로 넣지 않는다. 현금↔선지급금끼리만 오가는 '선지급(금) 신청' 같은 거래도 넣지 않는다.",
  "- 날짜가 윗줄에 따로 찍혀 있으면 그 날짜를 그 아래 줄의 날짜로 쓴다. 날짜 형식 YYYYMMDD 는 YYYY-MM-DD 로 바꾼다.",
  "- 내역 앞의 '√' 표시(영수증 있음)는 내용에 넣지 않는다.",
  "- 전월 이월금, 잔액, 합계/소계 행, 서명란은 넣지 않는다.",
  "- 금액이 같고 내용이 같은 거래가 여러 번 있으면(예: 같은 책 3권 구매) 실제로 여러 건이므로 모두 넣는다. 짝 줄만 버린다.",
  "복식부기가 아닌 일반 장부(수입/지출 열이 따로 있는 장부)라면 들어온 돈은 수입, 나간 돈은 지출로 넣는다.",
].join("\n");

// 장부의 계정/내역 → 예산 항목 연결 힌트 (예산 항목 이름은 해마다 다를 수 있어 '가장 가까운 항목'으로 고르게 함)
const CATEGORY_HINTS = [
  "[예산 항목 고르는 법]",
  "장부의 계정명(회의비, 선교사역비 등)은 예산 카테고리 이름과 다르다. 계정명보다 '내역'을 보고 가장 알맞은 예산 항목을 고른다.",
  "- 내역에 [대괄호] 태그가 있으면(예: [전국총단임명식], [MRD]) 그 이름이 들어간 예산 항목을 우선 고른다.",
  "- 회의비: 부서·팀 식사/간식/커피/교제/선물 → 업무추진비의 정기 부서 회의 식사비·간식비 등, 지구·캠퍼스 방문/간사 미팅 → 지구·캠퍼스 방문 미팅, 외부 인사·기관 대접 → 외부접대비, 책임간사·팀장 모임 → 책임간사·팀장 모임, 교수선교회 → 교수선교회 미팅.",
  "- 출장및교통비: 국내 교통·주차·주유·숙박 → 국내출장비 항목, 항공권·해외 출장 → 해외출장비 항목, 조문 교통비 → 경조사비의 조문 교통비.",
  "- 사무용품비·인쇄도서비: 물품 구매 → 부서 물품 구매, 소프트웨어·서비스 구독(한컴, MS, ZOOM, Claude/클로드 등) → 사역보조비의 해당 구독 항목.",
  "- 경조사비: 조의금·부의금, 근조화환, 축하화환·꽃다발·화분 등 해당 항목. 화환 배송비도 그 경조사 항목.",
  "- 간사복지비: 명절 격려금, 휴가비, 생일·기념일 축하 등 해당 항목.",
  "- 차량 정비·타이어·렌트 → 국내출장비의 부서차량 항목.",
  "- 지원헌금(내부) 지출: 순식당공제 → 순식당 공제, soon1958구매공제 → 순카페 공제, IP사용료 → IP사용료·구독료(전산), 문자사용료 → 단체문자 발송비, 다른간사(지구)후원 → 부서간사 정기후원, 행정비 → '행정비' 항목(없으면 미분류), 상장종이·상장케이스 → 상장·감사패 제작.",
  "- 수입: 여름수련회·SLM지원·총진행 수련회 지원금 → 수련회·CMS 카테고리의 여름수련회 항목.",
  "- 수입: 캠퍼스미션서포터즈(CMS, 예: '캠퍼스 미션 서포터즈 153') → 이름에 '캠퍼스미션서포터즈'가 들어간 항목.",
  "- 수입: 후원금 입금·가상계좌·후원회 입금(사람 이름이 붙은 입금 포함) → 이름에 '후원금'이 들어간 후원 항목, 지역교회 후원 → 지역교회 항목.",
  "- 그래도 맞는 항목이 없으면 미분류로 둔다. 억지로 엉뚱한 항목에 넣지 마라.",
].join("\n");

export async function parseLedgerDocument(file: InlineFile, budgetItems: ItemRef[]): Promise<ParsedLedger> {
  // AI에게는 "[지출] 큰 카테고리 › 세부 항목" 라벨 중 하나를 고르게 하고, 결과를 다시 항목으로 되돌림
  const refs = [...budgetItems, uncategorizedRef("expense"), uncategorizedRef("income")];
  const labelOf = (r: ItemRef) => `[${kindOf(r) === "income" ? "수입" : "지출"}] ${itemLabel(r)}`;
  const byLabel = new Map(refs.map((r) => [labelOf(r), r]));
  const allowed = [...byLabel.keys()];

  const prompt = [
    "첨부된 문서는 한국 대학생 선교단체(SLM)의 한 달치 회계 장부(수입·지출 내역)다.",
    "",
    "다음을 추출해라:",
    "- month: 장부의 대상 월 'YYYY-MM'. 알 수 없으면 null.",
    "- items: 거래 한 건씩. 각 거래는 entry_date('YYYY-MM-DD' 또는 null), description(적요/내용/거래처), amount(원 단위 양수 정수), category.",
    "",
    "category 는 반드시 다음 예산 항목('[지출/수입] 큰 카테고리 › 세부 항목') 중 하나로 분류한다:",
    allowed.map((c) => `- ${c}`).join("\n"),
    `돈이 나간 거래(출금·지출)는 [지출] 항목에서, 들어온 거래(입금·수입·후원·지원금)는 [수입] 항목에서 고른다.`,
    `맞는 항목이 없으면 '[지출] ${UNCATEGORIZED}' 또는 '[수입] ${UNCATEGORIZED}' 로 둔다.`,
    "",
    LEDGER_READING_RULES,
    "",
    CATEGORY_HINTS,
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

  const result = await generateJson(prompt, file, schema);
  const raw = result.data as Record<string, unknown>;
  const items = (Array.isArray(raw.items) ? raw.items : [])
    .map((it: Record<string, unknown>) => {
      const date = toStr(it.entry_date);
      const ref = byLabel.get(toStr(it.category)) ?? uncategorizedRef("expense");
      return {
        entry_date: DATE_RE.test(date) ? date : null,
        description: toStr(it.description),
        amount: toAmount(it.amount),
        kind: kindOf(ref),
        category_group: ref.category_group,
        category: ref.category,
      };
    })
    .filter((it) => it.amount > 0);

  const month = toStr(raw.month);
  return { month: MONTH_RE.test(month) ? month : null, items, model: result.model, fallback: result.fallback };
}
