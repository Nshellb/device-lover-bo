"use client";

import { useState } from "react";

import { ConfirmDialog, Toast } from "@/components/ui/confirm-dialog";
import type {
  ApiSoftwareVersion,
  ApiSoftwareVersionCategory,
  ApiSoftwareVersionInput,
} from "@/lib/api/types";

const CATEGORIES: { value: ApiSoftwareVersionCategory; label: string }[] = [
  { value: "os", label: "운영체제" },
  { value: "ux", label: "UX" },
];
const CATEGORY_ORDER = new Map(CATEGORIES.map((category, index) => [category.value, index]));

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";
const labelClass = "mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400";
const sectionClass = "rounded-lg border border-zinc-200 p-4 dark:border-zinc-800";
const buttonClass =
  "rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-zinc-400 hover:text-zinc-950 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-50";

const emptyInput = (): ApiSoftwareVersionInput => ({
  category: "os",
  value: "",
  label: "",
  sortOrder: 0,
});

function sortVersions(items: ApiSoftwareVersion[]): ApiSoftwareVersion[] {
  return [...items].sort(
    (a, b) =>
      (CATEGORY_ORDER.get(a.category) ?? 99) - (CATEGORY_ORDER.get(b.category) ?? 99) ||
      b.sortOrder - a.sortOrder ||
      b.label.localeCompare(a.label, undefined, { numeric: true }),
  );
}

function validateInput(input: ApiSoftwareVersionInput): string | null {
  if (!input.value.trim() || !input.label.trim()) return "저장값과 표시명을 입력해주세요.";
  if (!Number.isInteger(input.sortOrder) || input.sortOrder < 0 || input.sortOrder > 100000) {
    return "정렬 순서는 0~100000 사이의 정수여야 합니다.";
  }
  return null;
}

export function SoftwareVersionManager({
  initialVersions,
}: {
  initialVersions: ApiSoftwareVersion[];
}) {
  const [versions, setVersions] = useState(() => sortVersions(initialVersions));
  const [newInput, setNewInput] = useState<ApiSoftwareVersionInput>(emptyInput);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState<ApiSoftwareVersionInput>(emptyInput);
  const [deletingItem, setDeletingItem] = useState<ApiSoftwareVersion | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  }

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const validationError = validateInput(newInput);
    if (validationError) {
      setError(validationError);
      return;
    }
    setAdding(true);
    try {
      const response = await fetch("/api/admin/software-versions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(newInput),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error?.message ?? "소프트웨어 버전을 등록하지 못했습니다.");
        return;
      }
      const created = (await response.json()) as ApiSoftwareVersion;
      setVersions((current) => sortVersions([...current, created]));
      setNewInput({ ...emptyInput(), category: newInput.category });
      showToast("등록되었습니다");
    } catch {
      setError("소프트웨어 버전을 등록하지 못했습니다. 네트워크 상태를 확인해주세요.");
    } finally {
      setAdding(false);
    }
  }

  function startEdit(item: ApiSoftwareVersion) {
    setError(null);
    setEditingId(item.id);
    setEditInput({
      category: item.category,
      value: item.value,
      label: item.label,
      sortOrder: item.sortOrder,
    });
  }

  async function saveEdit() {
    if (!editingId) return;
    setError(null);
    const validationError = validateInput(editInput);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/software-versions/${editingId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(editInput),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error?.message ?? "소프트웨어 버전을 수정하지 못했습니다.");
        return;
      }
      const updated = (await response.json()) as ApiSoftwareVersion;
      setVersions((current) =>
        sortVersions(current.map((item) => (item.id === updated.id ? updated : item))),
      );
      setEditingId(null);
      showToast("저장되었습니다");
    } catch {
      setError("소프트웨어 버전을 수정하지 못했습니다. 네트워크 상태를 확인해주세요.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    const item = deletingItem;
    if (!item) return;
    setDeletingItem(null);
    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/software-versions/${item.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error?.message ?? "소프트웨어 버전을 삭제하지 못했습니다.");
        return;
      }
      setVersions((current) => current.filter((existing) => existing.id !== item.id));
      showToast("삭제되었습니다");
    } catch {
      setError("소프트웨어 버전을 삭제하지 못했습니다. 네트워크 상태를 확인해주세요.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {deletingItem ? (
        <ConfirmDialog
          message={`"${deletingItem.label}" 항목을 삭제하시겠습니까? 기존 기기에 저장된 값은 유지됩니다.`}
          onCancel={() => setDeletingItem(null)}
          onConfirm={confirmDelete}
        />
      ) : null}
      {toast ? <Toast message={toast} /> : null}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <section className={sectionClass}>
        <h2 className="mb-3 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          새 소프트웨어 버전 등록
        </h2>
        <form onSubmit={handleAdd} className="grid items-end gap-3 md:grid-cols-[180px_1fr_1fr_120px_auto]">
          <CategorySelect
            value={newInput.category}
            onChange={(category) => setNewInput({ ...newInput, category })}
          />
          <TextField
            label="저장값"
            value={newInput.value}
            placeholder="Android 17"
            onChange={(value) => setNewInput({ ...newInput, value })}
          />
          <TextField
            label="표시명"
            value={newInput.label}
            placeholder="Android 17"
            onChange={(label) => setNewInput({ ...newInput, label })}
          />
          <NumberField
            value={newInput.sortOrder}
            onChange={(sortOrder) => setNewInput({ ...newInput, sortOrder })}
          />
          <button
            type="submit"
            disabled={adding}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {adding ? "등록 중…" : "등록"}
          </button>
        </form>
        <p className="mt-2 text-xs text-zinc-400 dark:text-zinc-500">
          정렬 순서가 낮을수록 기기 입력 드롭다운의 위쪽에 표시됩니다.
        </p>
      </section>

      <section className={sectionClass}>
        <h2 className="mb-3 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          등록된 소프트웨어 버전 ({versions.length}개)
        </h2>
        <div className="flex flex-col gap-5">
          {CATEGORIES.map((category) => {
            const items = versions.filter((item) => item.category === category.value);
            return (
              <div key={category.value}>
                <div className="mb-1 flex items-center justify-between border-b border-zinc-200 pb-2 dark:border-zinc-700">
                  <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{category.label}</h3>
                  <span className="text-xs text-zinc-400">{items.length}개</span>
                </div>
                <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
                  {items.map((item) => (
                    <div key={item.id} className="grid items-center gap-2 py-2.5 md:grid-cols-[180px_1fr_1fr_80px_auto]">
                      {editingId === item.id ? (
                        <>
                          <CategorySelect
                            value={editInput.category}
                            onChange={(categoryValue) =>
                              setEditInput({ ...editInput, category: categoryValue })
                            }
                            hideLabel
                          />
                          <input
                            className={inputClass}
                            value={editInput.value}
                            onChange={(event) => setEditInput({ ...editInput, value: event.target.value })}
                          />
                          <input
                            className={inputClass}
                            value={editInput.label}
                            onChange={(event) => setEditInput({ ...editInput, label: event.target.value })}
                          />
                          <input
                            type="number"
                            min={0}
                            max={100000}
                            step={1}
                            className={inputClass}
                            value={editInput.sortOrder}
                            onChange={(event) =>
                              setEditInput({ ...editInput, sortOrder: Number(event.target.value) })
                            }
                          />
                          <div className="flex gap-2">
                            <button type="button" onClick={saveEdit} disabled={saving} className={buttonClass}>
                              {saving ? "저장 중…" : "저장"}
                            </button>
                            <button type="button" onClick={() => setEditingId(null)} className={buttonClass}>
                              취소
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <span className="text-xs text-zinc-500 dark:text-zinc-400">{category.label}</span>
                          <span className="text-sm font-medium text-zinc-950 dark:text-zinc-50">{item.value}</span>
                          <span className="text-sm text-zinc-600 dark:text-zinc-300">{item.label}</span>
                          <span className="text-xs tabular-nums text-zinc-400">{item.sortOrder}</span>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => startEdit(item)} className={buttonClass}>
                              수정
                            </button>
                            <button
                              type="button"
                              disabled={deleting}
                              onClick={() => setDeletingItem(item)}
                              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-500 hover:border-red-400 hover:text-red-600 disabled:opacity-50 dark:border-zinc-700 dark:hover:border-red-500 dark:hover:text-red-400"
                            >
                              삭제
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {items.length === 0 ? (
                    <p className="py-3 text-xs text-zinc-400 dark:text-zinc-500">등록된 항목이 없습니다.</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function CategorySelect({
  value,
  onChange,
  hideLabel = false,
}: {
  value: ApiSoftwareVersionCategory;
  onChange: (value: ApiSoftwareVersionCategory) => void;
  hideLabel?: boolean;
}) {
  return (
    <label>
      {!hideLabel ? <span className={labelClass}>분류</span> : null}
      <select
        className={inputClass}
        value={value}
        onChange={(event) => onChange(event.target.value as ApiSoftwareVersionCategory)}
      >
        {CATEGORIES.map((category) => (
          <option key={category.value} value={category.value}>
            {category.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className={labelClass}>{label}</span>
      <input
        className={inputClass}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        required
      />
    </label>
  );
}

function NumberField({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <label>
      <span className={labelClass}>정렬 순서</span>
      <input
        type="number"
        min={0}
        max={100000}
        step={1}
        className={inputClass}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        required
      />
    </label>
  );
}
