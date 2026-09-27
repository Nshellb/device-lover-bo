"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmDialog, Toast } from "@/components/ui/confirm-dialog";
import type { ApiAdminBrand, ApiCamera, ApiCameraWriteRequest } from "@/lib/api/types";

type FormState = {
  brandId: string;
  slug: string;
  name: string;
  series: string;
  releaseMonth: string;
  cameraType: string;
  sensorFormat: string;
  effectiveMegapixels: string;
  imageProcessor: string;
  lensMount: string;
  maxContinuousFps: string;
  continuousShootingNote: string;
  videoSpec: string;
  bodyWeightG: string;
  sourceUrl: string;
  sourceTitle: string;
  checkedAt: string;
};

const CAMERA_TYPE_OPTIONS = [
  { value: "DSLR", label: "DSLR" },
  { value: "mirrorless", label: "미러리스" },
  { value: "compact", label: "콤팩트 (고정렌즈)" },
];

const SENSOR_FORMAT_OPTIONS = [
  { value: "full_frame", label: "풀프레임" },
  { value: "aps_c", label: "APS-C" },
  { value: "micro_four_thirds", label: "마이크로 포서드" },
  { value: "one_inch", label: "1형" },
];

function emptyForm(): FormState {
  return {
    brandId: "",
    slug: "",
    name: "",
    series: "",
    releaseMonth: "",
    cameraType: "DSLR",
    sensorFormat: "full_frame",
    effectiveMegapixels: "",
    imageProcessor: "",
    lensMount: "",
    maxContinuousFps: "",
    continuousShootingNote: "",
    videoSpec: "",
    bodyWeightG: "",
    sourceUrl: "",
    sourceTitle: "",
    checkedAt: "",
  };
}

// datetime-local inputs need "YYYY-MM-DDTHH:mm"; API gives/wants full ISO 8601.
function toDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromCamera(camera: ApiCamera, brands: ApiAdminBrand[]): FormState {
  return {
    brandId: brands.find((brand) => brand.slug === camera.brandSlug)?.id ?? "",
    slug: camera.slug,
    name: camera.name,
    series: camera.series,
    releaseMonth: camera.releaseMonth,
    cameraType: camera.cameraType,
    sensorFormat: camera.sensorFormat,
    effectiveMegapixels: String(camera.effectiveMegapixels),
    imageProcessor: camera.imageProcessor,
    lensMount: camera.lensMount ?? "",
    maxContinuousFps: String(camera.maxContinuousFps),
    continuousShootingNote: camera.continuousShootingNote ?? "",
    videoSpec: camera.videoSpec,
    bodyWeightG: String(camera.bodyWeightG),
    sourceUrl: camera.sourceUrl,
    sourceTitle: camera.sourceTitle,
    checkedAt: toDatetimeLocal(camera.checkedAt),
  };
}

function buildPayload(form: FormState): { payload: ApiCameraWriteRequest } | { error: string } {
  if (!form.brandId) {
    return { error: "브랜드를 선택해주세요." };
  }
  if (!form.slug.trim() || !form.name.trim()) {
    return { error: "slug와 모델명은 필수입니다." };
  }
  if (!form.series.trim()) {
    return { error: "시리즈를 입력해주세요." };
  }
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(form.releaseMonth)) {
    return { error: "출시월은 YYYY-MM 형식이어야 합니다." };
  }
  if (form.cameraType !== "compact" && !form.lensMount.trim()) {
    return { error: "고정렌즈(콤팩트)가 아니면 렌즈 마운트가 필요합니다." };
  }
  const effectiveMegapixels = Number(form.effectiveMegapixels);
  if (!Number.isFinite(effectiveMegapixels) || effectiveMegapixels <= 0) {
    return { error: "유효 화소는 0보다 큰 숫자여야 합니다." };
  }
  const maxContinuousFps = Number(form.maxContinuousFps);
  if (!Number.isFinite(maxContinuousFps) || maxContinuousFps <= 0) {
    return { error: "최대 연사는 0보다 큰 숫자여야 합니다." };
  }
  const bodyWeightG = Number(form.bodyWeightG);
  if (!Number.isInteger(bodyWeightG) || bodyWeightG <= 0) {
    return { error: "본체 무게는 0보다 큰 정수(g)여야 합니다." };
  }
  if (!form.imageProcessor.trim() || !form.videoSpec.trim()) {
    return { error: "이미지 프로세서와 동영상 스펙을 입력해주세요." };
  }
  if (!form.sourceUrl.trim() || !form.sourceTitle.trim() || !form.checkedAt) {
    return { error: "출처 URL, 출처 제목, 확인일은 필수입니다." };
  }

  return {
    payload: {
      // Placeholders — confirmSave re-resolves these fresh from form.brandId
      // right before sending, so a brand renamed after this form was loaded
      // can't silently create a duplicate brand.
      brandSlug: "",
      brandName: "",
      slug: form.slug,
      name: form.name,
      series: form.series,
      releaseMonth: form.releaseMonth,
      cameraType: form.cameraType,
      sensorFormat: form.sensorFormat as ApiCameraWriteRequest["sensorFormat"],
      effectiveMegapixels,
      imageProcessor: form.imageProcessor,
      lensMount: form.lensMount.trim() ? form.lensMount : null,
      maxContinuousFps,
      continuousShootingNote: form.continuousShootingNote || null,
      videoSpec: form.videoSpec,
      bodyWeightG,
      sourceUrl: form.sourceUrl,
      sourceTitle: form.sourceTitle,
      checkedAt: new Date(form.checkedAt).toISOString(),
    },
  };
}

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";
const labelClass = "mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400";
const sectionClass = "rounded-lg border border-zinc-200 p-4 dark:border-zinc-800";

export function CameraForm({
  mode,
  camera,
  brands,
}: {
  mode: "create" | "edit";
  camera?: ApiCamera;
  brands: ApiAdminBrand[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() =>
    camera ? fromCamera(camera, brands) : emptyForm(),
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmingPayload, setConfirmingPayload] = useState<ApiCameraWriteRequest | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const result = buildPayload(form);
    if ("error" in result) {
      setError(result.error);
      return;
    }

    setConfirmingPayload(result.payload);
  }

  async function confirmSave() {
    const draftPayload = confirmingPayload;
    if (!draftPayload) return;
    setConfirmingPayload(null);

    setSubmitting(true);
    try {
      const brandResponse = await fetch(`/api/admin/brands/${form.brandId}`);
      if (!brandResponse.ok) {
        setError("선택한 브랜드를 찾을 수 없습니다. 새로고침 후 다시 시도해주세요.");
        setSubmitting(false);
        return;
      }
      const brand = (await brandResponse.json()) as ApiAdminBrand;
      const payload: ApiCameraWriteRequest = {
        ...draftPayload,
        brandSlug: brand.slug,
        brandName: brand.name,
      };

      const response = await fetch(
        mode === "create" ? "/api/admin/cameras" : `/api/admin/cameras/${camera!.id}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error?.message ?? "저장하지 못했습니다.");
        setSubmitting(false);
        return;
      }

      const saved = (await response.json()) as ApiCamera;
      setToast("저장되었습니다");
      window.setTimeout(() => {
        router.push(`/cameras/${saved.id}/edit`);
        router.refresh();
      }, 900);
    } catch {
      setError("저장하지 못했습니다. 네트워크 상태를 확인해주세요.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {confirmingPayload ? (
        <ConfirmDialog
          message="저장하시겠습니까?"
          onCancel={() => setConfirmingPayload(null)}
          onConfirm={confirmSave}
        />
      ) : null}
      {toast ? <Toast message={toast} /> : null}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <section className={sectionClass}>
        <h2 className="mb-3 text-sm font-semibold text-zinc-950 dark:text-zinc-50">기본 정보</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelClass}>브랜드</label>
            <select
              className={inputClass}
              value={form.brandId}
              onChange={(e) => setForm({ ...form, brandId: e.target.value })}
              required
            >
              <option value="" disabled>
                브랜드를 선택하세요
              </option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name} ({brand.slug})
                </option>
              ))}
            </select>
            {brands.length === 0 ? (
              <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                등록된 브랜드가 없습니다.{" "}
                <Link href="/brands" className="underline">
                  브랜드 관리
                </Link>
                에서 먼저 추가해주세요.
              </p>
            ) : null}
          </div>
          <div>
            <label className={labelClass}>slug</label>
            <input
              className={inputClass}
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="samsung-nx1"
              required
            />
          </div>
          <div>
            <label className={labelClass}>모델명</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="NX1"
              required
            />
          </div>
          <div>
            <label className={labelClass}>시리즈</label>
            <input
              className={inputClass}
              value={form.series}
              onChange={(e) => setForm({ ...form, series: e.target.value })}
              placeholder="NX"
              required
            />
          </div>
          <div>
            <label className={labelClass}>출시월 (YYYY-MM)</label>
            <input
              className={inputClass}
              value={form.releaseMonth}
              onChange={(e) => setForm({ ...form, releaseMonth: e.target.value })}
              placeholder="2014-09"
              required
            />
          </div>
          <div>
            <label className={labelClass}>카메라 타입</label>
            <select
              className={inputClass}
              value={form.cameraType}
              onChange={(e) => setForm({ ...form, cameraType: e.target.value })}
            >
              {CAMERA_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>센서 포맷</label>
            <select
              className={inputClass}
              value={form.sensorFormat}
              onChange={(e) => setForm({ ...form, sensorFormat: e.target.value })}
            >
              {SENSOR_FORMAT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className="mb-3 text-sm font-semibold text-zinc-950 dark:text-zinc-50">성능</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>유효 화소 (MP)</label>
            <input
              type="number"
              min={0}
              step="0.1"
              className={inputClass}
              value={form.effectiveMegapixels}
              onChange={(e) => setForm({ ...form, effectiveMegapixels: e.target.value })}
              required
            />
          </div>
          <div>
            <label className={labelClass}>이미지 프로세서</label>
            <input
              className={inputClass}
              value={form.imageProcessor}
              onChange={(e) => setForm({ ...form, imageProcessor: e.target.value })}
              placeholder="DRIMe V"
              required
            />
          </div>
          <div>
            <label className={labelClass}>
              렌즈 마운트{form.cameraType === "compact" ? " (고정렌즈는 비워두세요)" : ""}
            </label>
            <input
              className={inputClass}
              value={form.lensMount}
              onChange={(e) => setForm({ ...form, lensMount: e.target.value })}
              placeholder="NX"
            />
          </div>
          <div>
            <label className={labelClass}>최대 연사 (fps)</label>
            <input
              type="number"
              min={0}
              step="0.1"
              className={inputClass}
              value={form.maxContinuousFps}
              onChange={(e) => setForm({ ...form, maxContinuousFps: e.target.value })}
              required
            />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>연속촬영 메모 (선택)</label>
            <input
              className={inputClass}
              value={form.continuousShootingNote}
              onChange={(e) => setForm({ ...form, continuousShootingNote: e.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>동영상 스펙</label>
            <input
              className={inputClass}
              value={form.videoSpec}
              onChange={(e) => setForm({ ...form, videoSpec: e.target.value })}
              placeholder="UHD 4K 24p"
              required
            />
          </div>
          <div>
            <label className={labelClass}>본체 무게 (g)</label>
            <input
              type="number"
              min={1}
              className={inputClass}
              value={form.bodyWeightG}
              onChange={(e) => setForm({ ...form, bodyWeightG: e.target.value })}
              required
            />
          </div>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className="mb-3 text-sm font-semibold text-zinc-950 dark:text-zinc-50">출처</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>출처 URL</label>
            <input
              className={inputClass}
              value={form.sourceUrl}
              onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
              placeholder="https://..."
              required
            />
          </div>
          <div>
            <label className={labelClass}>출처 제목</label>
            <input
              className={inputClass}
              value={form.sourceTitle}
              onChange={(e) => setForm({ ...form, sourceTitle: e.target.value })}
              placeholder="Samsung NX1 spec sheet"
              required
            />
          </div>
          <div>
            <label className={labelClass}>확인일</label>
            <input
              type="datetime-local"
              className={inputClass}
              value={form.checkedAt}
              onChange={(e) => setForm({ ...form, checkedAt: e.target.value })}
              required
            />
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "저장 중…" : mode === "create" ? "카메라 추가" : "변경 사항 저장"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/cameras")}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300"
        >
          취소
        </button>
      </div>
    </form>
  );
}
