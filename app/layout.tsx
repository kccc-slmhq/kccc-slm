import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CCC 교육간사 포럼 2026",
  description: "2026 CCC SLM 교육간사 포럼",
  manifest: "/manifest.json",
  icons: {
    icon: "/forum-poster.webp",
    apple: "/forum-poster.webp",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "교육간사 포럼",
  },
  other: {
    "color-scheme": "dark",
    "mobile-web-app-capable": "yes",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
