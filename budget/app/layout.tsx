import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SLM 예산 집행 현황",
  description: "예산안 대비 항목별 집행 현황",
  // 아이폰 홈 화면에 추가했을 때 이름·전체 화면
  appleWebApp: { capable: true, title: "SLM 예산", statusBarStyle: "default" },
  other: {
    "color-scheme": "light",
  },
};

export const viewport: Viewport = {
  themeColor: "#7a24f5",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
