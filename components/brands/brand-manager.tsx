"use client";

import { useState } from "react";

import { ConfirmDialog, Toast } from "@/components/ui/confirm-dialog";
import type { ApiAdminBrand } from "@/lib/api/types";

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";
const sectionClass = "rounded-lg border border-zinc-200 p-4 dark:border-zinc-800";
const buttonClass =
  "rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-zinc-400 hover:text-zinc-950 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-50";

function sortByName(brands: ApiAdminBrand[]): ApiAdminBrand[] {
  return [...brands].sort((a, b) => a.name.localeCompare(b.name));
}

export function BrandManager({ initialBrands }: { initialBrands: ApiAdminBrand[] }) {
  const [brands, setBrands] = useState(initialBrands);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [newSlug, setNewSlug] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSlug, setEditSlug] = useState("");
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const [deletingBrand, setDeletingBrand] = useState<ApiAdminBrand | null>(null);
  const [deleting, setDeleting] = useState(false);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  }

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!newSlug.trim() || !newName.trim()) {
      setError("slug와 이름을 입력해주세요.");
      return;
    }
    setAdding(true);
    try {
      const response = await fetch("/api/admin/brands", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: newSlug, name: newName }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error?.message ?? "브랜드를 추가하지 못했습니다.");
        return;
      }
      const brand = (await response.json()) as ApiAdminBrand;
      setBrands((prev) => sortByName([...prev, brand]));
      setNewSlug("");
      setNewName("");
      showToast("추가되었습니다");
    } catch {
      setError("브랜드를 추가하지 못했습니다. 네트워크 상태를 확인해주세요.");
    } finally {
      setAdding(false);
    }
  }

  function startEdit(brand: ApiAdminBrand) {
    setError(null);
    setEditingId(brand.id);
    setEditSlug(brand.slug);
    setEditName(brand.name);
  }

  async function saveEdit() {
    if (!editingId) return;
    if (!editSlug.trim() || !editName.trim()) {
      setError("slug와 이름을 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/brands/${editingId}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: editSlug, name: editName }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error?.message ?? "브랜드를 수정하지 못했습니다.");
        return;
      }
      const updated = (await response.json()) as ApiAdminBrand;
      setBrands((prev) => sortByName(prev.map((brand) => (brand.id === updated.id ? updated : brand))));
      setEditingId(null);
      showToast("저장되었습니다");
    } catch {
      setError("브랜드를 수정하지 못했습니다. 네트워크 상태를 확인해주세요.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    const brand = deletingBrand;
    if (!brand) return;
    setDeletingBrand(null);
    setDeleting(true);
    try {
      const response = await fetch(`/api/admin/brands/${brand.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error?.message ?? "브랜드를 삭제하지 못했습니다.");
        return;
      }
      setBrands((prev) => prev.filter((existing) => existing.id !== brand.id));
      showToast("삭제되었습니다");
    } catch {
      setError("브랜드를 삭제하지 못했습니다. 네트워크 상태를 확인해주세요.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {deletingBrand ? (
        <ConfirmDialog
          message={`"${deletingBrand.name}" 브랜드를 삭제하시겠습니까?`}
          onCancel={() => setDeletingBrand(null)}
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
        <h2 className="mb-3 text-sm font-semibold text-zinc-950 dark:text-zinc-50">새 브랜드 추가</h2>
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">slug</label>
            <input
              className={inputClass}
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              placeholder="fujifilm"
              required
            />
          </div>
          <div className="w-48">
            <label className="mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400">이름</label>
            <input
              className={inputClass}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Fujifilm"
              required
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {adding ? "추가 중…" : "추가"}
          </button>
        </form>
      </section>

      <section className={sectionClass}>
        <h2 className="mb-3 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          전체 브랜드 ({brands.length}개)
        </h2>
        <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
          {brands.map((brand) => (
            <div key={brand.id} className="flex items-center gap-2 py-2.5">
              {editingId === brand.id ? (
                <>
                  <input
                    className={`${inputClass} w-40`}
                    value={editSlug}
                    onChange={(e) => setEditSlug(e.target.value)}
                  />
                  <input
                    className={`${inputClass} w-48`}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                  <button type="button" onClick={saveEdit} disabled={saving} className={buttonClass}>
                    {saving ? "저장 중…" : "저장"}
                  </button>
                  <button type="button" onClick={() => setEditingId(null)} className={buttonClass}>
                    취소
                  </button>
                </>
              ) : (
                <>
                  <span className="w-40 truncate text-sm text-zinc-500 dark:text-zinc-400">{brand.slug}</span>
                  <span className="flex-1 text-sm font-medium text-zinc-950 dark:text-zinc-50">{brand.name}</span>
                  <button type="button" onClick={() => startEdit(brand)} className={buttonClass}>
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeletingBrand(brand)}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-500 hover:border-red-400 hover:text-red-600 dark:border-zinc-700 dark:hover:border-red-500 dark:hover:text-red-400"
                  >
                    삭제
                  </button>
                </>
              )}
            </div>
          ))}
          {brands.length === 0 ? (
            <p className="py-4 text-xs text-zinc-400 dark:text-zinc-500">등록된 브랜드가 없습니다.</p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
