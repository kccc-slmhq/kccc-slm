import { ChartIcon } from "./Icons";

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const big = size === "lg";
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={`grid place-items-center rounded-2xl bg-brand-600 text-white ${big ? "w-11 h-11" : "w-9 h-9"}`}
      >
        <ChartIcon />
      </span>
      <span className="leading-tight">
        <span className={`block font-bold text-gray-900 ${big ? "text-xl" : "text-[17px]"}`}>SLM 예산</span>
        <span className="block text-xs text-gray-500">집행 현황 대시보드</span>
      </span>
    </span>
  );
}
