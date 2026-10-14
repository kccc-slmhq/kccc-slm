// Supabase 접속 정보. 값이 없거나 형식이 틀리면 어떤 환경 변수를 고쳐야 하는지 알려줌 (값 자체는 노출하지 않음)
export function supabaseEnv(): { url: string; key: string } {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

  const problems: string[] = [];
  if (!url) problems.push("NEXT_PUBLIC_SUPABASE_URL 이 비어 있습니다.");
  else if (!/^https:\/\/[^/\s]+$/.test(url.replace(/\/$/, ""))) {
    problems.push("NEXT_PUBLIC_SUPABASE_URL 형식이 올바르지 않습니다. (예: https://xxxx.supabase.co)");
  }
  if (!key) problems.push("NEXT_PUBLIC_SUPABASE_ANON_KEY 가 비어 있습니다.");

  if (problems.length > 0) throw new SupabaseConfigError(problems);
  return { url: url.replace(/\/$/, ""), key };
}

export class SupabaseConfigError extends Error {
  constructor(public problems: string[]) {
    super(problems.join(" "));
  }
}
