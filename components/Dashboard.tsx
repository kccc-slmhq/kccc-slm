"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Group } from "@/lib/types";

export default function Dashboard({
  groups,
  error,
}: {
  groups: Group[];
  error?: string;
}) {
  const [districtFilter, setDistrictFilter] = useState("");
  const [campusFilter, setCampusFilter] = useState("");

  const totalMembers = useMemo(
    () => groups.reduce((sum, g) => sum + g.members, 0),
    [groups]
  );

  const districts = useMemo(() => {
    const map = new Map<string, { district: string; campusCount: number; members: number }>();
    for (const g of groups) {
      const entry = map.get(g.district) ?? {
        district: g.district,
        campusCount: 0,
        members: 0,
      };
      entry.campusCount += 1;
      entry.members += g.members;
      map.set(g.district, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.members - a.members);
  }, [groups]);

  const filteredDistricts = districts.filter((d) =>
    d.district.toLowerCase().includes(districtFilter.trim().toLowerCase())
  );

  const filteredCampuses = useMemo(() => {
    const f = campusFilter.trim().toLowerCase();
    return groups
      .filter(
        (g) =>
          !f ||
          g.district.toLowerCase().includes(f) ||
          g.campus.toLowerCase().includes(f)
      )
      .sort((a, b) => b.members - a.members);
  }, [groups, campusFilter]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-6">
        <p>데이터를 불러오지 못했습니다: {error}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 sm:p-6">
      <header className="mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          KCCC PRS 참여 현황 대시보드
        </h1>
        <p className="text-sm text-slate-300 mt-1">
          전체 / 지구별 / 캠퍼스별 참여 인원 한눈에 보기
        </p>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <Kpi label="전체 참여 인원" value={`${totalMembers.toLocaleString()}명`} color="text-blue-600" />
        <Kpi label="캠퍼스(소그룹) 수" value={`${groups.length}`} color="text-emerald-600" />
        <Kpi label="지구 수" value={`${districts.length}`} color="text-amber-600" />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="지구별 참여 인원">
          <div className="h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={districts}
                layout="vertical"
                margin={{ left: 10, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis
                  type="category"
                  dataKey="district"
                  width={110}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip />
                <Bar dataKey="members" fill="#3b5bdb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="지구별 현황 표">
          <input
            className="w-full mb-2 border border-slate-200 rounded-lg px-3 py-2 text-sm"
            placeholder="지구명 검색..."
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
          />
          <div className="overflow-y-auto max-h-[380px] rounded-lg">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left px-2 py-1.5">지구</th>
                  <th className="text-left px-2 py-1.5">캠퍼스 수</th>
                  <th className="text-left px-2 py-1.5">인원 수</th>
                  <th className="text-left px-2 py-1.5">비율</th>
                </tr>
              </thead>
              <tbody>
                {filteredDistricts.map((d) => (
                  <tr key={d.district} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-2 py-1.5">{d.district}</td>
                    <td className="px-2 py-1.5">{d.campusCount}</td>
                    <td className="px-2 py-1.5">{d.members.toLocaleString()}</td>
                    <td className="px-2 py-1.5">
                      {((d.members / totalMembers) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="캠퍼스(소그룹)별 인원" full>
          <input
            className="w-full mb-2 border border-slate-200 rounded-lg px-3 py-2 text-sm"
            placeholder="지구 또는 캠퍼스명 검색..."
            value={campusFilter}
            onChange={(e) => setCampusFilter(e.target.value)}
          />
          <div className="overflow-y-auto max-h-[420px] rounded-lg">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left px-2 py-1.5">지구</th>
                  <th className="text-left px-2 py-1.5">캠퍼스(소그룹)</th>
                  <th className="text-left px-2 py-1.5">인원 수</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampuses.map((g) => (
                  <tr key={g.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-2 py-1.5">{g.district}</td>
                    <td className="px-2 py-1.5">{g.campus}</td>
                    <td className="px-2 py-1.5">{g.members}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </section>

      <footer className="text-center text-slate-400 text-xs mt-6">
        PRS 데이터 기반 대시보드 · 데이터 수정은{" "}
        <a href="/admin" className="underline">
          관리자 페이지
        </a>
        에서 가능합니다.
      </footer>
    </main>
  );
}

function Kpi({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl px-4 py-4 shadow-lg">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function Panel({
  title,
  children,
  full,
}: {
  title: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-lg p-4 ${
        full ? "xl:col-span-2" : ""
      }`}
    >
      <h2 className="text-base font-semibold mb-3">{title}</h2>
      {children}
    </div>
  );
}
