"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Group } from "@/lib/types";

type Row = Group & { _dirty?: boolean; _isNew?: boolean };

export default function AdminPanel({
  groups,
  error,
  userEmail,
}: {
  groups: Group[];
  error?: string;
  userEmail: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(groups);
  const [saving, setSaving] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function updateField(id: number, field: "district" | "campus" | "members", value: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              [field]: field === "members" ? Number(value) || 0 : value,
              _dirty: true,
            }
          : r
      )
    );
  }

  async function saveRow(row: Row) {
    setSaving(row.id);
    setMessage(null);
    const supabase = createClient();

    if (row._isNew) {
      const { data, error } = await supabase
        .from("groups")
        .insert({ district: row.district, campus: row.campus, members: row.members })
        .select()
        .single();
      setSaving(null);
      if (error) {
        setMessage(`저장 실패: ${error.message}`);
        return;
      }
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...(data as Group) } : r)));
      setMessage("저장되었습니다.");
      return;
    }

    const { error } = await supabase
      .from("groups")
      .update({ district: row.district, campus: row.campus, members: row.members })
      .eq("id", row.id);
    setSaving(null);
    if (error) {
      setMessage(`저장 실패: ${error.message}`);
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, _dirty: false } : r)));
    setMessage("저장되었습니다.");
  }

  async function deleteRow(id: number, isNew?: boolean) {
    if (!isNew && !confirm("이 캠퍼스 데이터를 삭제할까요?")) return;
    if (!isNew) {
      const supabase = createClient();
      const { error } = await supabase.from("groups").delete().eq("id", id);
      if (error) {
        setMessage(`삭제 실패: ${error.message}`);
        return;
      }
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
    setMessage("삭제되었습니다.");
  }

  function addRow() {
    const tempId = -Date.now();
    setRows((prev) => [
      { id: tempId, district: "", campus: "", members: 0, created_at: "", updated_at: "", _isNew: true },
      ...prev,
    ]);
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
        <p>데이터를 불러오지 못했습니다: {error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 sm:p-6">
      <header className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold">관리자 페이지 · 캠퍼스 데이터 관리</h1>
          <p className="text-sm text-slate-500 mt-1">{userEmail}로 로그인됨</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/"
            className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50"
          >
            대시보드 보기
          </a>
          <button
            onClick={handleLogout}
            className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50"
          >
            로그아웃
          </button>
        </div>
      </header>

      {message && (
        <div className="mb-3 text-sm bg-blue-50 text-blue-700 rounded-lg px-3 py-2 inline-block">
          {message}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-base font-semibold">캠퍼스(소그룹) 목록 ({rows.length}개)</h2>
          <button
            onClick={addRow}
            className="text-sm bg-blue-600 text-white rounded-lg px-3 py-2"
          >
            + 새 캠퍼스 추가
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[600px]">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left px-2 py-2">지구</th>
                <th className="text-left px-2 py-2">캠퍼스(소그룹)</th>
                <th className="text-left px-2 py-2">인원 수</th>
                <th className="text-left px-2 py-2 w-32">작업</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100">
                  <td className="px-2 py-1.5">
                    <input
                      className="w-full border border-slate-200 rounded px-2 py-1"
                      value={row.district}
                      onChange={(e) => updateField(row.id, "district", e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      className="w-full border border-slate-200 rounded px-2 py-1"
                      value={row.campus}
                      onChange={(e) => updateField(row.id, "campus", e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      className="w-24 border border-slate-200 rounded px-2 py-1"
                      value={row.members}
                      onChange={(e) => updateField(row.id, "members", e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1.5 flex gap-2">
                    <button
                      onClick={() => saveRow(row)}
                      disabled={saving === row.id || (!row._dirty && !row._isNew)}
                      className="text-xs bg-emerald-600 text-white rounded px-2 py-1 disabled:opacity-40"
                    >
                      저장
                    </button>
                    <button
                      onClick={() => deleteRow(row.id, row._isNew)}
                      className="text-xs bg-red-500 text-white rounded px-2 py-1"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
