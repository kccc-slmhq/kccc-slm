export type BudgetPlan = {
  fiscal_year: number;
  total_amount: number;
  source_filename: string | null;
  confirmed_at: string;
};

export type BudgetItem = {
  id: number;
  fiscal_year: number;
  category_group: string; // 큰 카테고리 (예: 업무추진비)
  category: string; // 세부 항목 (예: 정기 부서 회의 식사비)
  amount: number;
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
  category_group: string;
  category: string;
  amount: number;
  sort_order: number;
};

// 예산에 없는 항목으로 분류된 지출
export const UNCATEGORIZED = "미분류";

// 예산 항목 식별자: 같은 항목명(예: 예비비)이 여러 큰 카테고리에 있을 수 있어서 둘을 함께 씀
export type ItemRef = { category_group: string; category: string };

export function itemKey(ref: ItemRef): string {
  return `${ref.category_group}\u0000${ref.category}`;
}

export function itemLabel(ref: ItemRef): string {
  return ref.category_group ? `${ref.category_group} › ${ref.category}` : ref.category;
}

export const UNCATEGORIZED_REF: ItemRef = { category_group: "", category: UNCATEGORIZED };

// AI 분석 결과 (사용자가 수정하기 전 초안)
export type ParsedBudget = {
  fiscal_year: number | null;
  document_total: number | null;
  items: { category_group: string; category: string; amount: number }[];
};

export type ParsedLedger = {
  month: string | null; // "YYYY-MM"
  items: {
    entry_date: string | null;
    description: string;
    category_group: string;
    category: string;
    amount: number;
  }[];
};
