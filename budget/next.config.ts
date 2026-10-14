import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 저장소 루트(PRS 앱)에도 package-lock.json 이 있어서, 이 폴더를 프로젝트 루트로 명시
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
