export type BudgetPlan = {
  fiscal_year: number;
  total_amount: number;
  source_filename: string | null;
  confirmed_at: string;
};

export type BudgetItem = {
  id: number;
  fiscal_year: number;
  category: string;
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
  category: string;
  amount: number;
  sort_order: number;
};

// 예산에 없는 항목으로 분류된 지출
export const UNCATEGORIZED = "미분류";

// AI 분석 결과 (사용자가 수정하기 전 초안)
export type ParsedBudget = {
  fiscal_year: number | null;
  document_total: number | null;
  items: { category: string; amount: number }[];
};

export type ParsedLedger = {
  month: string | null; // "YYYY-MM"
  items: {
    entry_date: string | null;
    description: string;
    category: string;
    amount: number;
  }[];
};
