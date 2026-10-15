import { ImageResponse } from "next/og";

// 로고(보라색 배지 + 막대 3개)와 같은 모양의 앱 아이콘. 홈 화면용은 꽉 찬 정사각형 (모서리는 폰이 알아서 둥글게)
const BRAND = "#7a24f5";
const BARS = [9, 15, 6]; // 로고 ChartIcon 막대 높이 비율 (24칸 기준)

export function appIcon(size: number, { rounded = false }: { rounded?: boolean } = {}) {
  const unit = (size * 0.46) / 15;
  const barWidth = size * 0.105;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND,
          borderRadius: rounded ? size * 0.28 : 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: size * 0.09, height: unit * 15 }}>
          {BARS.map((h, i) => (
            <div
              key={i}
              style={{ width: barWidth, height: unit * h, background: "#fff", borderRadius: barWidth / 2 }}
            />
          ))}
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}
