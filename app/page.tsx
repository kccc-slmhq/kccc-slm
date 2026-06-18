import { createClient } from "@/lib/supabase/server";
import type { Group } from "@/lib/types";
import Dashboard from "@/components/Dashboard";

export const revalidate = 0;

export default async function Home() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .order("members", { ascending: false });

  const groups = (data ?? []) as Group[];

  return <Dashboard groups={groups} error={error?.message} />;
}
