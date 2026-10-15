"use client";

import { useEffect, useState } from "react";
import { won } from "@/lib/budget/summary";
import type { BudgetItem, BudgetTransfer } from "@/lib/budget/types";
import { passwordHeader } from "./EditLock";
import { AmountInput } from "./shared";

export const TRANSFER_KEEP_NOTICE = "용도변경 회의록은 예산안과 함께 보관해주세요.";

const NEW_ITEM = "new";
const NEW_GROUP = "__new_group__";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100";

// 용도변경 창: ① 회의록이 있는지 확인 → ② 옮길 항목·금액과 회의 날짜·장소·참석자 기록 → 확정
export function TransferDialog({
  fiscalYear,
  items,
  password,
  onClose,
  onDone,
}: {
  fiscalYear: number;
  items: BudgetItem[]; // 이 회기의 지출 예산 항목
  password: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [step, setStep] = useState<"ask" | "no" | "form">("ask");
  const [fromId, setFromId] = useState<string>("");
  const [toId, setToId] = useState<string>("");
  const [newGroup, setNewGroup] = useState<string>("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newName, setNewName] = useState("");
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [place, setPlace] = useState("");
  const [attendees, setAttendees] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  const groups = [...new Set(items.map((i) => i.category_group))];
  const from = items.find((i) => String(i.id) === fromId) ?? null;
  const toExisting = toId !== NEW_ITEM ? (items.find((i) => String(i.id) === toId) ?? null) : null;
  const toGroup = toId === NEW_ITEM ? (newGroup === NEW_GROUP ? newGroupName.trim() : newGroup) : (toExisting?.category_group ?? "");
  const toName = toId === NEW_ITEM ? newName.trim() : (toExisting?.category ?? "");
  const sameAsNew = toId === NEW_ITEM && items.find((i) => i.category_group === toGroup && i.category === toName);

  const problems = [
    !from && "보내는 항목을 골라주세요.",
    !toId && "받는 항목을 골라주세요.",
    toId === NEW_ITEM && !newGroup && "새 항목의 카테고리를 골라주세요.",
    toId === NEW_ITEM && newGroup === NEW_GROUP && !newGroupName.trim() && "새 카테고리 이름을 적어주세요.",
    toId === NEW_ITEM && !newName.trim() && "새 항목 이름을 적어주세요.",
    sameAsNew && "이미 있는 항목입니다. 목록에서 골라주세요.",
    from && toExisting && from.id === toExisting.id && "보내는 항목과 받는 항목이 같습니다.",
    amount <= 0 && "옮길 금액을 적어주세요.",
    from && amount > from.amount && `보내는 항목의 예산(${won(from.amount)})보다 많이 옮길 수 없습니다.`,
    !meetingDate && "회의 날짜를 기록해주세요.",
    !place.trim() && "회의 장소를 기록해주세요.",
    !attendees.trim() && "참석자 명단을 기록해주세요.",
  ].filter(Boolean) as string[];

  async function submit() {
    if (problems.length > 0 || !from) return;
    setSaving(true);
    setError(null);
    const res = await fetch("/api/budget/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...passwordHeader(password) },
      body: JSON.stringify({
        fiscal_year: fiscalYear,
        from: { category_group: from.category_group, category: from.category },
        to: { category_group: toGroup, category: toName },
        amount,
        reason,
        meeting: { date: meetingDate, place, attendees },
      }),
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      const body = await res?.json().catch(() => ({}));
      setError(body?.error ?? "용도변경에 실패했습니다.");
      return;
    }
    onDone();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/30 md:items-center md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="transfer-title"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full flex-col rounded-t-3xl bg-white shadow-[0_8px_32px_rgba(17,24,39,0.12)] md:max-w-xl md:rounded-3xl"
      >
        <div className="flex items-start gap-3 border-b border-gray-100 px-5 pb-3 pt-5">
          <div>
            <h2 id="transfer-title" className="text-lg font-bold text-gray-900">
              예산 용도변경
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              용도변경은 회의에서 결정된 내용만 반영할 수 있으며, SLM HQ 재정 담당자만 할 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-full text-gray-500 hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          {step === "ask" && (
            <div className="space-y-4">
              <p className="text-[15px] font-semibold text-gray-900">변경 관련 회의록이 있습니까?</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("no")}
                  className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600"
                >
                  아니요
                </button>
                <button
                  type="button"
                  onClick={() => setStep("form")}
                  className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  네, 있습니다
                </button>
              </div>
            </div>
          )}

          {step === "no" && (
            <div className="space-y-3">
              <p className="rounded-xl bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                회의록이 있어야 용도변경을 할 수 있습니다. 먼저 용도변경 회의를 열고 회의록(날짜·장소·참석자)을 작성한 뒤 다시
                진행해주세요.
              </p>
              <button type="button" onClick={onClose} className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600">
                닫기
              </button>
            </div>
          )}

          {step === "form" && (
            <div className="space-y-4">
              <Field label="보내는 항목 (예산을 줄일 항목)">
                <select value={fromId} onChange={(e) => setFromId(e.target.value)} className={inputClass}>
                  <option value="">선택</option>
                  {groups.map((g) => (
                    <optgroup key={g} label={g || "기타"}>
                      {items
                        .filter((i) => i.category_group === g)
                        .map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.category} ({won(i.amount)})
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </Field>

              <Field label="받는 항목 (예산을 늘릴 항목)">
                <select value={toId} onChange={(e) => setToId(e.target.value)} className={inputClass}>
                  <option value="">선택</option>
                  {groups.map((g) => (
                    <optgroup key={g} label={g || "기타"}>
                      {items
                        .filter((i) => i.category_group === g && String(i.id) !== fromId)
                        .map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.category} ({won(i.amount)})
                          </option>
                        ))}
                    </optgroup>
                  ))}
                  <option value={NEW_ITEM}>+ 새 항목 만들기</option>
                </select>
                {toId === NEW_ITEM && (
                  <div className="mt-2 space-y-2 rounded-xl bg-gray-50 p-3">
                    <select value={newGroup} onChange={(e) => setNewGroup(e.target.value)} className={inputClass}>
                      <option value="">카테고리 선택</option>
                      {groups.map((g) => (
                        <option key={g} value={g}>
                          {g || "기타"}
                        </option>
                      ))}
                      <option value={NEW_GROUP}>+ 새 카테고리</option>
                    </select>
                    {newGroup === NEW_GROUP && (
                      <input
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="새 카테고리 이름"
                        className={inputClass}
                      />
                    )}
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="새 항목 이름"
                      className={inputClass}
                    />
                  </div>
                )}
              </Field>

              <Field label="옮길 금액 (원)">
                <AmountInput value={amount} onChange={setAmount} ariaLabel="옮길 금액" className="!py-2 !text-left" />
                {from && amount > 0 && amount <= from.amount && toName && (
                  <p className="mt-1.5 text-xs text-gray-500 tabular-nums">
                    {from.category} {won(from.amount)} → {won(from.amount - amount)}
                    <br />
                    {toName} {won(toExisting?.amount ?? 0)} → {won((toExisting?.amount ?? 0) + amount)}
                  </p>
                )}
              </Field>

              <Field label="변경 사유 (선택)">
                <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} />
              </Field>

              <div className="space-y-3 rounded-2xl bg-brand-50/50 p-4">
                <div className="text-sm font-bold text-gray-900">회의록 정보</div>
                <Field label="회의 날짜">
                  <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className={inputClass} />
                </Field>
                <Field label="회의 장소">
                  <input value={place} onChange={(e) => setPlace(e.target.value)} className={inputClass} />
                </Field>
                <Field label="참석자 명단">
                  <textarea
                    value={attendees}
                    onChange={(e) => setAttendees(e.target.value)}
                    rows={3}
                    placeholder="예: 홍길동, 김철수, 이영희"
                    className={inputClass}
                  />
                </Field>
                <p className="text-xs font-medium text-brand-700">📁 {TRANSFER_KEEP_NOTICE}</p>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
              {problems.length > 0 && <p className="text-xs text-gray-500">{problems[0]}</p>}
            </div>
          )}
        </div>

        {step === "form" && (
          <div className="border-t border-gray-100 px-5 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={submit}
              disabled={saving || problems.length > 0}
              className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? "반영 중..." : "용도변경 반영"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}

// 용도변경 내역 (회의록 정보 포함)
export function TransferHistory({ transfers }: { transfers: BudgetTransfer[] }) {
  if (transfers.length === 0) {
    return <p className="text-sm text-gray-400">용도변경 내역이 없습니다.</p>;
  }
  return (
    <ul className="divide-y divide-gray-100">
      {transfers.map((t) => (
        <li key={t.id} className="py-3 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 text-gray-900">
              {t.from_category} <span className="text-gray-400">→</span> {t.to_category}
            </span>
            <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums text-gray-900">{won(t.amount)}</span>
          </div>
          {t.reason && <div className="mt-0.5 text-gray-600">{t.reason}</div>}
          <div className="mt-1 text-xs text-gray-500">
            회의 {t.meeting_date} · {t.meeting_place}
          </div>
          <div className="text-xs text-gray-500">참석: {t.attendees}</div>
        </li>
      ))}
    </ul>
  );
}
