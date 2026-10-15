import { appIcon } from "@/lib/appIcon";

// 브라우저 탭(32) · 안드로이드 홈 화면(192, 512)
export function generateImageMetadata() {
  return [32, 192, 512].map((n) => ({ id: String(n), size: { width: n, height: n }, contentType: "image/png" }));
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  const size = Number(await id);
  return appIcon(size, { rounded: size === 32 });
}
