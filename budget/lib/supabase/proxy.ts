import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "./env";
import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/lib/safe-next";
import { SupabaseConfigError } from "./env";

export async function updateSession(request: NextRequest) {
  try {
    return await refreshSession(request);
  } catch (err) {
    console.error("proxy error", err);
    const lines =
      err instanceof SupabaseConfigError
        ? [...err.problems, "Vercel → Settings → Environment Variables 를 확인한 뒤 Redeploy 해주세요."]
        : ["서버 오류가 발생했습니다. Vercel → Logs 에서 자세한 내용을 확인해주세요."];
    return new NextResponse(errorPage(lines), {
      status: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }
}

function errorPage(lines: string[]): string {
  const escape = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>설정 오류</title></head>
<body style="font-family:-apple-system,'Malgun Gothic',sans-serif;background:#f1f5f9;color:#0f172a;padding:24px">
<div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;padding:24px">
<h1 style="font-size:18px;margin:0 0 12px">SLM 예산 집행 현황 - 설정 오류</h1>
${lines.map((l) => `<p style="margin:6px 0;font-size:14px">${escape(l)}</p>`).join("")}
</div></body></html>`;
}

async function refreshSession(request: NextRequest) {
  const { url, key } = supabaseEnv();
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    url,
    key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  const { pathname, search } = request.nextUrl;

  if (!data.user && pathname !== "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  if (data.user && pathname === "/login") {
    const url = new URL(safeNext(request.nextUrl.searchParams.get("next")), request.url);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
