"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { SPEC_FIELDS, SPEC_STATUSES, SPEC_STATUS_LABELS } from "@/lib/spec-labels";
import type {
  ApiDeviceDetail,
  ApiDeviceWriteRequest,
  ApiPublicationStatus,
  ApiSpecInput,
} from "@/lib/api/types";

type SpecFieldState = { status: string; value: string; detail: string; rawText: string };
type AliasFieldState = { value: string; kind: string };
type SourceFieldState = { url: string; title: string; checkedAt: string; isPrimary: boolean };
type ConfigFieldState = { label: string; storageGb: string; ramGb: string; ramStatus: string };

type FormState = {
  brandSlug: string;
  brandName: string;
  slug: string;
  name: string;
  releaseDate: string;
  variant: string;
  imageUrl: string;
  launchVideoUrl: string;
  publicationStatus: ApiPublicationStatus;
  aliases: AliasFieldState[];
  sources: SourceFieldState[];
  configurations: ConfigFieldState[];
  specs: Record<string, SpecFieldState>;
};

function emptySpecs(): Record<string, SpecFieldState> {
  return Object.fromEntries(
    SPEC_FIELDS.map(({ key }) => [
      key,
      { status: "unknown", value: "정보 없음", detail: "", rawText: "" },
    ]),
  );
}

function emptyForm(): FormState {
  return {
    brandSlug: "",
    brandName: "",
    slug: "",
    name: "",
    releaseDate: "",
    variant: "",
    imageUrl: "",
    launchVideoUrl: "",
    publicationStatus: "draft",
    aliases: [],
    sources: [],
    configurations: [],
    specs: emptySpecs(),
  };
}

// datetime-local inputs need "YYYY-MM-DDTHH:mm"; API gives/wants full ISO 8601.
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDevice(device: ApiDeviceDetail): FormState {
  const specs = emptySpecs();
  for (const { key } of SPEC_FIELDS) {
    const spec = device.specs[key];
    if (!spec) continue;
    specs[key] = {
      status: spec.status,
      value: spec.value,
      detail: spec.detail ?? "",
      rawText: spec.raw != null ? JSON.stringify(spec.raw) : "",
    };
  }

  return {
    brandSlug: device.brandSlug,
    brandName: device.brand,
    slug: device.slug,
    name: device.name,
    releaseDate: device.releaseDate,
    variant: device.variant ?? "",
    imageUrl: device.imageUrl ?? "",
    launchVideoUrl: device.launchVideoUrl ?? "",
    publicationStatus: device.publicationStatus,
    aliases: device.aliasDetails.map((alias) => ({ value: alias.value, kind: alias.kind })),
    sources: device.sources.map((source) => ({
      url: source.url,
      title: source.title,
      checkedAt: toDatetimeLocal(source.checkedAt),
      isPrimary: source.isPrimary,
    })),
    configurations: device.configurations.map((config) => ({
      label: config.label,
      storageGb: String(config.storageGb),
      ramGb: config.ramGb != null ? String(config.ramGb) : "",
      ramStatus: config.ramStatus,
    })),
    specs,
  };
}

function buildPayload(form: FormState): { payload: ApiDeviceWriteRequest } | { error: string } {
  const specs: Record<string, ApiSpecInput> = {};

  for (const { key, label } of SPEC_FIELDS) {
    const field = form.specs[key];
    let raw: unknown = null;

    if (field.status === "known") {
      if (!field.rawText.trim()) {
        return { error: `${label}: 상태가 '정보 있음'인 사양은 원시 데이터(JSON)가 필요합니다.` };
      }
      try {
        raw = JSON.parse(field.rawText);
      } catch {
        return { error: `${label}: 원시 데이터가 올바른 JSON 형식이 아닙니다.` };
      }
    }

    if (!field.value.trim()) {
      return { error: `${label}: 표시값을 입력해주세요.` };
    }

    specs[key] = {
      status: field.status as ApiSpecInput["status"],
      raw,
      value: field.value,
      detail: field.detail || null,
    };
  }

  const configurations = [];
  for (const config of form.configurations) {
    const storageGb = Number(config.storageGb);
    if (!config.label.trim() || !Number.isFinite(storageGb) || storageGb <= 0) {
      return { error: "구성 항목의 라벨과 저장 용량(GB)을 확인해주세요." };
    }
    const ramGb = config.ramStatus === "known" ? Number(config.ramGb) : null;
    if (config.ramStatus === "known" && (!Number.isFinite(ramGb) || (ramGb ?? 0) <= 0)) {
      return { error: "RAM 상태가 '정보 있음'이면 RAM 용량(GB)이 필요합니다." };
    }
    configurations.push({ label: config.label, storageGb, ramGb, ramStatus: config.ramStatus });
  }

  const sources = form.sources.map((source) => ({
    url: source.url,
    title: source.title,
    checkedAt: source.checkedAt ? new Date(source.checkedAt).toISOString() : null,
    isPrimary: source.isPrimary,
  }));

  if (!form.brandSlug.trim() || !form.brandName.trim() || !form.slug.trim() || !form.name.trim() || !form.releaseDate) {
    return { error: "브랜드, slug, 기기명, 출시일은 필수입니다." };
  }

  return {
    payload: {
      brandSlug: form.brandSlug,
      brandName: form.brandName,
      slug: form.slug,
      name: form.name,
      releaseDate: form.releaseDate,
      variant: form.variant || null,
      imageUrl: form.imageUrl || null,
      launchVideoUrl: form.launchVideoUrl || null,
      publicationStatus: form.publicationStatus,
      aliases: form.aliases.filter((alias) => alias.value.trim()).map((alias) => ({
        value: alias.value,
        kind: alias.kind as "alias" | "model_number" | "hardware_identifier",
      })),
      sources,
      configurations,
      specs,
    },
  };
}

const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";
const labelClass = "mb-1 block text-xs font-medium text-zinc-500 dark:text-zinc-400";
const sectionClass = "rounded-lg border border-zinc-200 p-4 dark:border-zinc-800";
const removeButtonClass =
  "shrink-0 rounded-lg border border-zinc-300 px-2.5 py-1.5 text-xs text-zinc-500 hover:border-red-400 hover:text-red-600 dark:border-zinc-700 dark:hover:border-red-500 dark:hover:text-red-400";
const addButtonClass =
  "rounded-lg border border-dashed border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:border-zinc-400 hover:text-zinc-950 dark:border-zinc-700 dark:hover:text-zinc-50";

export function DeviceForm({
  mode,
  device,
}: {
  mode: "create" | "edit";
  device?: ApiDeviceDetail;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() => (device ? fromDevice(device) : emptyForm()));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const result = buildPayload(form);
    if ("error" in result) {
      setError(result.error);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(
        mode === "create" ? "/api/admin/devices" : `/api/admin/devices/${device!.id}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(result.payload),
        },
      );

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error?.message ?? "저장하지 못했습니다.");
        return;
      }

      const saved = (await response.json()) as ApiDeviceDetail;
      router.push(`/devices/${saved.id}/edit`);
      router.refresh();
    } catch {
      setError("저장하지 못했습니다. 네트워크 상태를 확인해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <section className={sectionClass}>
        <h2 className="mb-3 text-sm font-semibold text-zinc-950 dark:text-zinc-50">기본 정보</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>브랜드 slug</label>
            <input
              className={inputClass}
              value={form.brandSlug}
              onChange={(e) => setForm({ ...form, brandSlug: e.target.value })}
              placeholder="samsung"
              required
            />
          </div>
          <div>
            <label className={labelClass}>브랜드명</label>
            <input
              className={inputClass}
              value={form.brandName}
              onChange={(e) => setForm({ ...form, brandName: e.target.value })}
              placeholder="SAMSUNG"
              required
            />
          </div>
          <div>
            <label className={labelClass}>slug</label>
            <input
              className={inputClass}
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="galaxy-s27"
              required
            />
          </div>
          <div>
            <label className={labelClass}>기기명</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Galaxy S27"
              required
            />
          </div>
          <div>
            <label className={labelClass}>출시일</label>
            <input
              type="date"
              className={inputClass}
              value={form.releaseDate}
              onChange={(e) => setForm({ ...form, releaseDate: e.target.value })}
              required
            />
          </div>
          <div>
            <label className={labelClass}>공개 상태</label>
            <select
              className={inputClass}
              value={form.publicationStatus}
              onChange={(e) =>
                setForm({ ...form, publicationStatus: e.target.value as ApiPublicationStatus })
              }
            >
              <option value="draft">초안 (draft)</option>
              <option value="published">게시됨 (published)</option>
              <option value="archived">보관됨 (archived)</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>대표 구성 (variant)</label>
            <input
              className={inputClass}
              value={form.variant}
              onChange={(e) => setForm({ ...form, variant: e.target.value })}
              placeholder="12GB · 512GB"
            />
          </div>
          <div>
            <label className={labelClass}>이미지 URL</label>
            <input
              className={inputClass}
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>런칭 영상 URL</label>
            <input
              className={inputClass}
              value={form.launchVideoUrl}
              onChange={(e) => setForm({ ...form, launchVideoUrl: e.target.value })}
              placeholder="https://youtube.com/watch?v=..."
            />
          </div>
        </div>
      </section>

      <ListSection
        title="별칭 / 모델 번호"
        items={form.aliases}
        onAdd={() => setForm({ ...form, aliases: [...form.aliases, { value: "", kind: "model_number" }] })}
        onRemove={(index) =>
          setForm({ ...form, aliases: form.aliases.filter((_, i) => i !== index) })
        }
        renderItem={(alias, index) => (
          <>
            <input
              className={inputClass}
              value={alias.value}
              onChange={(e) =>
                setForm({
                  ...form,
                  aliases: form.aliases.map((a, i) => (i === index ? { ...a, value: e.target.value } : a)),
                })
              }
              placeholder="SM-S921"
            />
            <select
              className={`${inputClass} w-48 shrink-0`}
              value={alias.kind}
              onChange={(e) =>
                setForm({
                  ...form,
                  aliases: form.aliases.map((a, i) => (i === index ? { ...a, kind: e.target.value } : a)),
                })
              }
            >
              <option value="model_number">model_number</option>
              <option value="hardware_identifier">hardware_identifier</option>
              <option value="alias">alias</option>
            </select>
          </>
        )}
      />

      <ListSection
        title="출처"
        items={form.sources}
        onAdd={() =>
          setForm({
            ...form,
            sources: [
              ...form.sources,
              { url: "", title: "", checkedAt: "", isPrimary: form.sources.length === 0 },
            ],
          })
        }
        onRemove={(index) =>
          setForm({ ...form, sources: form.sources.filter((_, i) => i !== index) })
        }
        renderItem={(source, index) => (
          <div className="grid flex-1 grid-cols-[1fr_1fr_auto_auto] gap-2">
            <input
              className={inputClass}
              value={source.url}
              onChange={(e) =>
                setForm({
                  ...form,
                  sources: form.sources.map((s, i) => (i === index ? { ...s, url: e.target.value } : s)),
                })
              }
              placeholder="https://www.samsung.com/..."
            />
            <input
              className={inputClass}
              value={source.title}
              onChange={(e) =>
                setForm({
                  ...form,
                  sources: form.sources.map((s, i) => (i === index ? { ...s, title: e.target.value } : s)),
                })
              }
              placeholder="삼성전자 공식 사양"
            />
            <input
              type="datetime-local"
              className={inputClass}
              value={source.checkedAt}
              onChange={(e) =>
                setForm({
                  ...form,
                  sources: form.sources.map((s, i) => (i === index ? { ...s, checkedAt: e.target.value } : s)),
                })
              }
            />
            <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={source.isPrimary}
                onChange={(e) =>
                  setForm({
                    ...form,
                    sources: form.sources.map((s, i) => ({
                      ...s,
                      isPrimary: i === index ? e.target.checked : e.target.checked ? false : s.isPrimary,
                    })),
                  })
                }
              />
              대표
            </label>
          </div>
        )}
      />

      <ListSection
        title="판매 구성 (RAM/저장 용량)"
        items={form.configurations}
        onAdd={() =>
          setForm({
            ...form,
            configurations: [
              ...form.configurations,
              { label: "", storageGb: "", ramGb: "", ramStatus: "known" },
            ],
          })
        }
        onRemove={(index) =>
          setForm({ ...form, configurations: form.configurations.filter((_, i) => i !== index) })
        }
        renderItem={(config, index) => (
          <div className="grid flex-1 grid-cols-[1fr_auto_auto_auto] gap-2">
            <input
              className={inputClass}
              value={config.label}
              onChange={(e) =>
                setForm({
                  ...form,
                  configurations: form.configurations.map((c, i) =>
                    i === index ? { ...c, label: e.target.value } : c,
                  ),
                })
              }
              placeholder="12GB · 512GB"
            />
            <input
              type="number"
              min={1}
              className={`${inputClass} w-28`}
              value={config.storageGb}
              onChange={(e) =>
                setForm({
                  ...form,
                  configurations: form.configurations.map((c, i) =>
                    i === index ? { ...c, storageGb: e.target.value } : c,
                  ),
                })
              }
              placeholder="저장 GB"
            />
            <input
              type="number"
              min={1}
              className={`${inputClass} w-24`}
              value={config.ramGb}
              disabled={config.ramStatus !== "known"}
              onChange={(e) =>
                setForm({
                  ...form,
                  configurations: form.configurations.map((c, i) =>
                    i === index ? { ...c, ramGb: e.target.value } : c,
                  ),
                })
              }
              placeholder="RAM GB"
            />
            <select
              className={`${inputClass} w-36`}
              value={config.ramStatus}
              onChange={(e) =>
                setForm({
                  ...form,
                  configurations: form.configurations.map((c, i) =>
                    i === index ? { ...c, ramStatus: e.target.value } : c,
                  ),
                })
              }
            >
              {SPEC_STATUSES.filter((status) => status !== "not_applicable").map((status) => (
                <option key={status} value={status}>{SPEC_STATUS_LABELS[status]}</option>
              ))}
            </select>
          </div>
        )}
      />

      <section className={sectionClass}>
        <h2 className="mb-3 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          사양 ({SPEC_FIELDS.length}개, 전부 필수)
        </h2>
        <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
          {SPEC_FIELDS.map(({ key, label, hint }) => {
            const field = form.specs[key];
            return (
              <div key={key} className="grid grid-cols-[110px_120px_1fr_1fr] items-start gap-2 py-2.5">
                <p className="pt-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">{label}</p>
                <select
                  className={inputClass}
                  value={field.status}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      specs: { ...form.specs, [key]: { ...field, status: e.target.value } },
                    })
                  }
                >
                  {SPEC_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {SPEC_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
                <div className="flex flex-col gap-1">
                  <input
                    className={inputClass}
                    value={field.value}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        specs: { ...form.specs, [key]: { ...field, value: e.target.value } },
                      })
                    }
                    placeholder="표시값"
                  />
                  <input
                    className={inputClass}
                    value={field.detail}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        specs: { ...form.specs, [key]: { ...field, detail: e.target.value } },
                      })
                    }
                    placeholder="detail (선택)"
                  />
                </div>
                <textarea
                  className={`${inputClass} h-[62px] resize-none font-mono text-xs disabled:opacity-40`}
                  value={field.rawText}
                  disabled={field.status !== "known"}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      specs: { ...form.specs, [key]: { ...field, rawText: e.target.value } },
                    })
                  }
                  placeholder={hint}
                />
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "저장 중…" : mode === "create" ? "기기 추가" : "변경 사항 저장"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/devices")}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300"
        >
          취소
        </button>
      </div>
    </form>
  );
}

function ListSection<T>({
  title,
  items,
  onAdd,
  onRemove,
  renderItem,
}: {
  title: string;
  items: T[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  renderItem: (item: T, index: number) => React.ReactNode;
}) {
  return (
    <section className={sectionClass}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{title}</h2>
        <button type="button" onClick={onAdd} className={addButtonClass}>
          + 추가
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            {renderItem(item, index)}
            <button type="button" onClick={() => onRemove(index)} className={removeButtonClass}>
              삭제
            </button>
          </div>
        ))}
        {items.length === 0 ? (
          <p className="text-xs text-zinc-400 dark:text-zinc-500">항목이 없습니다.</p>
        ) : null}
      </div>
    </section>
  );
}
