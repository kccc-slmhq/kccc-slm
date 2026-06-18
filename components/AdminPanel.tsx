"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import type { Group } from "@/lib/types";

type Row = Group & { _dirty?: boolean; _isNew?: boolean };

type ParsedRow = { district: string; campus: string; members: number };

function guessColumn(headers: string[], keywords: string[]) {
  const idx = headers.findIndex((h) =>
    keywords.some((k) => h.toLowerCase().includes(k))
  );
  return idx;
}

function buildParsedRows(
  rawRows: string[][],
  cols: { district: number; campus: number; members: number }
): ParsedRow[] {
  return rawRows
    .map((r) => ({
      district: String(r[cols.district] ?? "").trim(),
      campus: String(r[cols.campus] ?? "").trim(),
      members: Number(String(r[cols.members] ?? "").replace(/[^0-9.-]/g, "")) || 0,
    }))
    .filter((r) => r.district || r.campus);
}

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [headers, setHeaders] = useState<string[] | null>(null);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [colMap, setColMap] = useState({ district: -1, campus: -1, members: -1 });
  const [applying, setApplying] = useState(false);

  const parsedRows = headers
    ? buildParsedRows(rawRows, colMap as { district: number; campus: number; members: number })
    : [];
  const parsedTotal = parsedRows.reduce((sum, r) => sum + r.members, 0);

  async function handleFile(file: File) {
    setMessage(null);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false });
    if (data.length < 2) {
      setMessage("엑셀에서 데이터를 찾지 못했습니다.");
      return;
    }
    const head = data[0].map((h) => String(h ?? ""));
    const body = data.slice(1) as string[][];
    setHeaders(head);
    setRawRows(body);
    setColMap({
      district: guessColumn(head, ["지구", "지역"]),
      campus: guessColumn(head, ["캠퍼스", "소그룹", "소그"]),
      members: guessColumn(head, ["인원", "참여", "명수"]),
    });
  }

  function cancelUpload() {
    setHeaders(null);
    setRawRows([]);
    setColMap({ district: -1, campus: -1, members: -1 });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function applyExcelData() {
    if (colMap.district < 0 || colMap.campus < 0 || colMap.members < 0) {
      setMessage("지구 / 캠퍼스 / 인원 수 칼럼을 모두 선택해주세요.");
      return;
    }
    if (parsedRows.length === 0) {
      setMessage("적용할 데이터가 없습니다.");
      return;
    }
    if (
      !confirm(
        `현재 ${rows.length}개 캠퍼스 데이터를 모두 삭제하고, 엑셀에서 추출한 ${parsedRows.length}개로 교체합니다. 계속할까요?`
      )
    )
      return;

    setApplying(true);
    setMessage(null);
    const supabase = createClient();

    const { error: delError } = await supabase.from("groups").delete().gte("id", 0);
    if (delError) {
      setApplying(false);
      setMessage(`교체 실패(삭제 단계): ${delError.message}`);
      return;
    }

    const { data, error: insError } = await supabase
      .from("groups")
      .insert(parsedRows)
      .select();
    setApplying(false);
    if (insError) {
      setMessage(`교체 실패(추가 단계): ${insError.message}`);
      return;
    }

    setRows((data ?? []) as Row[]);
    cancelUpload();
    setMessage("엑셀 데이터로 교체되었습니다.");
    router.refresh();
  }

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

      <div className="bg-white rounded-2xl shadow-lg p-4 mb-5">
        <h2 className="text-base font-semibold mb-1">엑셀로 일괄 업데이트</h2>
        <p className="text-xs text-slate-500 mb-3">
          엑셀(.xlsx, .csv) 파일을 올리면 지구 / 캠퍼스 / 인원 수 칼럼을 자동으로 찾아서 미리보기를
          보여줍니다. 확인 후 적용하면 기존 데이터가 모두 삭제되고 엑셀 내용으로 교체됩니다.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
          className="text-sm mb-3"
        />

        {headers && (
          <div className="border border-slate-200 rounded-xl p-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <ColumnPicker
                label="지구 칼럼"
                headers={headers}
                value={colMap.district}
                onChange={(v) => setColMap((c) => ({ ...c, district: v }))}
              />
              <ColumnPicker
                label="캠퍼스(소그룹) 칼럼"
                headers={headers}
                value={colMap.campus}
                onChange={(v) => setColMap((c) => ({ ...c, campus: v }))}
              />
              <ColumnPicker
                label="인원 수 칼럼"
                headers={headers}
                value={colMap.members}
                onChange={(v) => setColMap((c) => ({ ...c, members: v }))}
              />
            </div>

            <p className="text-xs text-slate-500 mb-2">
              미리보기: {parsedRows.length}개 캠퍼스 · 총 {parsedTotal.toLocaleString()}명
            </p>
            <div className="overflow-y-auto max-h-60 border border-slate-100 rounded-lg mb-3">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 sticky top-0">
                  <tr>
                    <th className="text-left px-2 py-1.5">지구</th>
                    <th className="text-left px-2 py-1.5">캠퍼스(소그룹)</th>
                    <th className="text-left px-2 py-1.5">인원 수</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.map((r, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      <td className="px-2 py-1">{r.district}</td>
                      <td className="px-2 py-1">{r.campus}</td>
                      <td className="px-2 py-1">{r.members}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2">
              <button
                onClick={applyExcelData}
                disabled={applying}
                className="text-sm bg-blue-600 text-white rounded-lg px-3 py-2 disabled:opacity-40"
              >
                {applying ? "적용 중..." : "이 데이터로 전체 교체"}
              </button>
              <button
                onClick={cancelUpload}
                className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2"
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>

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

function ColumnPicker({
  label,
  headers,
  value,
  onChange,
}: {
  label: string;
  headers: string[];
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="text-xs text-slate-500">
      {label}
      <select
        className="w-full mt-1 border border-slate-200 rounded px-2 py-1.5 text-sm text-slate-800"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      >
        <option value={-1}>선택 안 함</option>
        {headers.map((h, i) => (
          <option key={i} value={i}>
            {h || `(${i + 1}번째 칼럼)`}
          </option>
        ))}
      </select>
    </label>
  );
}
