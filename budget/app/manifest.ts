import type { MetadataRoute } from "next";

// 안드로이드 '홈 화면에 추가' / 앱 설치 정보
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SLM 예산 집행 현황",
    short_name: "SLM 예산",
    description: "예산안 대비 항목별 집행 현황",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f4f6",
    theme_color: "#7a24f5",
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
