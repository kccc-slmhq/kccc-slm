"use client";

import { useMemo } from "react";
import { ResponsiveContainer, Tooltip, Treemap } from "recharts";
import type { Group } from "@/lib/types";

const DISTRICT_COLORS = [
  "#3b5bdb", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4",
  "#a855f7", "#ef4444", "#84cc16", "#0ea5e9", "#f97316",
  "#14b8a6", "#8b5cf6", "#eab308", "#f43f5e", "#10b981",
];

function stripDistrictPrefix(campus: string, district: string) {
  const normDistrict = district.replace(/\s+/g, "");
  let ti = 0;
  let pi = 0;
  while (pi < normDistrict.length && ti < campus.length) {
    if (campus[ti] === " ") {
      ti++;
      continue;
    }
    if (campus[ti] !== normDistrict[pi]) return campus;
    ti++;
    pi++;
  }
  if (pi !== normDistrict.length) return campus;
  while (ti < campus.length && campus[ti] === " ") ti++;
  const rest = campus.slice(ti);
  return rest || campus;
}

function abbreviateCampus(campus: string, district: string) {
  const cleaned = stripDistrictPrefix(campus, district);
  return cleaned.replace(/대학교/g, "대").replace(/캠퍼스/g, "캠");
}

export default function Dashboard({
  groups,
  error,
}: {
  groups: Group[];
  error?: string;
}) {
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

  const sortedCampuses = useMemo(
    () => [...groups].sort((a, b) => b.members - a.members),
    [groups]
  );

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

      <section className="mb-5">
        <div className="bg-white rounded-2xl px-6 py-6 shadow-lg mb-3">
          <div className="text-sm text-slate-500 mb-1">전체 참여 인원</div>
          <div className="text-5xl font-bold text-blue-600">
            {totalMembers.toLocaleString()}명
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Kpi label="지구 수" value={`${districts.length}`} color="text-amber-600" />
          <Kpi label="캠퍼스(소그룹) 수" value={`${groups.length}`} color="text-emerald-600" />
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="지구별 참여 인원">
          <div className="h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={districts}
                dataKey="members"
                nameKey="district"
                stroke="#fff"
                isAnimationActive={false}
                content={<TreemapCell />}
              >
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0]?.payload as { district: string; members: number };
                    return (
                      <div className="bg-white rounded-lg shadow px-3 py-2 text-sm">
                        {d.district}: {d.members.toLocaleString()}명
                      </div>
                    );
                  }}
                />
              </Treemap>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="지구별 현황 표">
          <p className="text-xs text-slate-400 mb-2">
            전체 인원 비율 = 해당 지구 인원 ÷ 전체 참여 인원({totalMembers.toLocaleString()}명)
          </p>
          <div className="overflow-y-auto max-h-[380px] rounded-lg">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left px-2 py-1.5 text-xs whitespace-nowrap">지구</th>
                  <th className="text-left px-2 py-1.5 text-xs whitespace-nowrap">참여 캠퍼스 수</th>
                  <th className="text-left px-2 py-1.5 text-xs whitespace-nowrap">인원 수</th>
                  <th className="text-left px-2 py-1.5 text-xs whitespace-nowrap">전체 인원 비율</th>
                </tr>
              </thead>
              <tbody>
                {districts.map((d) => (
                  <tr key={d.district} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-2 py-1.5 whitespace-nowrap">{d.district}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{d.campusCount}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{d.members.toLocaleString()}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      {((d.members / totalMembers) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="캠퍼스(소그룹)별 인원" full>
          <div className="overflow-y-auto max-h-[420px] rounded-lg">
            <table className="w-full text-sm table-fixed">
              <thead className="sticky top-0 bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left px-2 py-1.5 text-xs whitespace-nowrap w-[22%]">지구</th>
                  <th className="text-left px-2 py-1.5 text-xs whitespace-nowrap">캠</th>
                  <th className="text-left px-2 py-1.5 text-xs whitespace-nowrap w-16">인원 수</th>
                </tr>
              </thead>
              <tbody>
                {sortedCampuses.map((g) => (
                  <tr key={g.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-2 py-1.5 truncate">{g.district}</td>
                    <td className="px-2 py-1.5 truncate" title={g.campus}>
                      {abbreviateCampus(g.campus, g.district)}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{g.members}</td>
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

function TreemapCell(props: unknown) {
  const { x, y, width, height, index, district, members } = props as {
    x: number;
    y: number;
    width: number;
    height: number;
    index: number;
    district?: string;
    members?: number;
  };
  if (district === undefined) return null;
  const showLabel = width > 50 && height > 30;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={DISTRICT_COLORS[index % DISTRICT_COLORS.length]}
        stroke="#fff"
        strokeWidth={2}
        rx={4}
      />
      {showLabel && (
        <text
          x={x + width / 2}
          y={y + height / 2 - 6}
          textAnchor="middle"
          fill="#fff"
          fontSize={12}
          fontWeight={600}
        >
          {district}
        </text>
      )}
      {showLabel && (
        <text
          x={x + width / 2}
          y={y + height / 2 + 12}
          textAnchor="middle"
          fill="#fff"
          fontSize={12}
        >
          {members?.toLocaleString()}명
        </text>
      )}
    </g>
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
