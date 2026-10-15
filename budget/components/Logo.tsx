export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const big = size === "lg";
  return (
    <span className={`font-extrabold tracking-tight ${big ? "text-2xl" : "text-xl"}`}>
      <span className="text-brand-600">SLM</span>
      <span className="text-gray-900">Budget</span>
    </span>
  );
}
