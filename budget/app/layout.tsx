import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SLM 예산 집행 현황",
  description: "예산안 대비 항목별 집행 현황",
  other: {
    "color-scheme": "light",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full bg-slate-100">{children}</body>
    </html>
  );
}
