// 회기: 매년 8월 ~ 다음 해 7월. fiscalYear 는 회기 "시작 연도" (2026 → 2026.08 ~ 2027.07)

export const FISCAL_START_MONTH = 8;

// "YYYY-MM" 또는 "YYYY-MM-DD" → 회기 시작 연도
export function fiscalYearOf(date: string): number {
  const [y, m] = date.split("-").map(Number);
  return m >= FISCAL_START_MONTH ? y : y - 1;
}

export function fiscalYearLabel(fiscalYear: number): string {
  return `${fiscalYear}년 회기 (${fiscalYear}.08 ~ ${fiscalYear + 1}.07)`;
}

export function fiscalYearShortLabel(fiscalYear: number): string {
  return `${fiscalYear}-${String((fiscalYear + 1) % 100).padStart(2, "0")} 회기`;
}

// 회기의 12개월을 "YYYY-MM" 로 (8월 → 다음 해 7월 순서)
export function fiscalMonths(fiscalYear: number): string[] {
  return Array.from({ length: 12 }, (_, i) => {
    const m0 = FISCAL_START_MONTH - 1 + i;
    const year = fiscalYear + Math.floor(m0 / 12);
    const month = (m0 % 12) + 1;
    return `${year}-${String(month).padStart(2, "0")}`;
  });
}

// "YYYY-MM" → 회기 몇 번째 달인지 (1~12)
export function fiscalMonthIndex(month: string): number {
  const m = Number(month.split("-")[1]);
  return ((m - FISCAL_START_MONTH + 12) % 12) + 1;
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-");
  return `${y}년 ${Number(m)}월`;
}

export function shortMonthLabel(month: string): string {
  return `${Number(month.split("-")[1])}월`;
}

// 오늘(KST) 기준 "YYYY-MM"
export function currentMonthKst(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, "0")}`;
}

// DB의 date(그 달 1일) ↔ "YYYY-MM"
export function monthToDate(month: string): string {
  return `${month}-01`;
}

export function dateToMonth(date: string): string {
  return date.slice(0, 7);
}
