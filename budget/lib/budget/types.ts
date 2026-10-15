export type BudgetPlan = {
  fiscal_year: number;
  total_amount: number;
  source_filename: string | null;
  confirmed_at: string;
};

export type Kind = "expense" | "income";

export const KIND_LABEL: Record<Kind, string> = { expense: "지출", income: "수입" };

export type BudgetItem = {
  id: number;
  fiscal_year: number;
  kind: Kind;
  category_group: string; // 큰 카테고리 (예: 업무추진비)
  category: string; // 세부 항목 (예: 정기 부서 회의 식사비)
  amount: number;
  one_time?: boolean; // 일회성 행사 (한 번에 쓰고 끝남 → 지출 속도 경고 안 함)
  sort_order: number;
};

export type LedgerMonth = {
  month: string; // 그 달 1일 (YYYY-MM-01)
  fiscal_year: number;
  source_filename: string | null;
  confirmed_at: string;
};

export type LedgerEntry = {
  id: number;
  month: string;
  entry_date: string | null;
  description: string;
  kind: Kind;
  category_group: string;
  category: string;
  amount: number;
  sort_order: number;
};

// 예산에 없는 항목으로 분류된 지출
export const UNCATEGORIZED = "미분류";

// 예산 항목 식별자: 같은 항목명(예: 예비비)이 여러 큰 카테고리에 있을 수 있어서 지출/수입·카테고리를 함께 씀
// (kind 가 없는 예전 데이터는 지출로 봄)
export type ItemRef = { kind?: Kind; category_group: string; category: string };

export function kindOf(ref: { kind?: Kind | null }): Kind {
  return ref.kind === "income" ? "income" : "expense";
}

// 전년도 이월금: 수입으로 기록은 하되, 올해 예산안의 수입(달성률)과는 따로 셈
// 예산 항목은 이름에 '이월금'이 있는 수입 항목
export function isCarryoverItem(ref: { kind?: Kind | null; category: string }): boolean {
  return kindOf(ref) === "income" && ref.category.includes("이월금");
}

// 장부 내역은 내용(적요)에 '이월금'이 적힌 수입만 이월금으로 봄
// (같은 달·같은 카테고리에 들어온 다른 수입까지 빼지 않도록 카테고리로는 판단하지 않음)
export function isCarryoverEntry(e: { kind?: Kind | null; description?: string | null }): boolean {
  return kindOf(e) === "income" && (e.description ?? "").includes("이월금");
}

export function itemKey(ref: ItemRef): string {
  return `${kindOf(ref)}\u0000${ref.category_group}\u0000${ref.category}`;
}

export function itemLabel(ref: ItemRef): string {
  return ref.category_group ? `${ref.category_group} › ${ref.category}` : ref.category;
}

export function uncategorizedRef(kind: Kind): ItemRef {
  return { kind, category_group: "", category: UNCATEGORIZED };
}

// AI 분석 결과 (사용자가 수정하기 전 초안)
export type ParsedBudget = {
  fiscal_year: number | null;
  document_total: number | null; // 지출 예산 총액
  document_income_total: number | null;
  items: { kind: Kind; category_group: string; category: string; amount: number; one_time: boolean }[];
  model?: string; // 실제로 분석한 모델 (기본 모델이 혼잡하면 예비 모델)
  fallback?: boolean;
};

export type ParsedLedger = {
  month: string | null; // "YYYY-MM"
  model?: string;
  fallback?: boolean;
  items: {
    entry_date: string | null;
    description: string;
    kind: Kind;
    category_group: string;
    category: string;
    amount: number;
  }[];
};
