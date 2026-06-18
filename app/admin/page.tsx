import { createClient } from "@/lib/supabase/server";
import type { Group } from "@/lib/types";
import AdminPanel from "@/components/AdminPanel";

export const revalidate = 0;

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .order("district", { ascending: true })
    .order("campus", { ascending: true });

  const groups = (data ?? []) as Group[];

  return (
    <AdminPanel
      groups={groups}
      error={error?.message}
      userEmail={userData.user?.email ?? ""}
    />
  );
}
