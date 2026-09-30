"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ConfirmDialog, Toast } from "@/components/ui/confirm-dialog";
import { SPEC_FIELDS, SPEC_SECTIONS } from "@/lib/spec-labels";
import type {
  ApiAdminBrand,
  ApiDeviceDetail,
  ApiDeviceWriteRequest,
  ApiPublicationStatus,
  ApiSpecInput,
} from "@/lib/api/types";

const SPEC_FIELDS_BY_KEY = new Map(SPEC_FIELDS.map((field) => [field.key, field]));
const SPEC_FORM_SECTIONS = SPEC_SECTIONS.map(({ title, keys }) => ({
  title,
  fields: keys.map((key) => SPEC_FIELDS_BY_KEY.get(key)!),
}));
const SPEC_FORM_COUNT = SPEC_FORM_SECTIONS.reduce((sum, section) => sum + section.fields.length, 0);

type SpecFieldState = { value: string; detail: string; parts?: string[] };
type AliasFieldState = { value: string; kind: string };
type SourceFieldState = { url: string; title: string; checkedAt: string; isPrimary: boolean };
type ConfigFieldState = { label: string; storageGb: string; ramGb: string };
type ColorFieldState = { name: string; imageUrl: string; colorCode: string; exclusive: boolean };

type FormState = {
  brandId: string;
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
  colors: ColorFieldState[];
  specs: Record<string, SpecFieldState>;
};

// displaySize is entered as two fields, stored as value "6.3인치" and
// detail "19.5:9 비율". In form state `value` holds the inches and `detail`
// the ratio, without those suffixes.
const DISPLAY_SIZE_KEY = "displaySize";
// dimensions is entered as width/height/depth (form state `parts`), stored as
// "146.7 × 71.5 × 7.65 mm"; weight is entered as a number, stored as "177 g".
const DIMENSIONS_KEY = "dimensions";
const WEIGHT_KEY = "weight";
const DIMENSION_LABELS = ["가로", "세로", "두께"];

function parseDimensions(spec: { value: string; detail: string | null }): SpecFieldState {
  const numbers = spec.value.match(/\d+(?:\.\d+)?/g) ?? [];
  return {
    value: "",
    detail: spec.detail ?? "",
    parts: DIMENSION_LABELS.map((_, i) => numbers[i] ?? ""),
  };
}

function parseWeight(spec: { value: string; detail: string | null }): SpecFieldState {
  return { value: spec.value.match(/\d+(?:\.\d+)?/)?.[0] ?? "", detail: spec.detail ?? "" };
}

// waterResistance is entered as the two IP digits (form state `parts`: dust,
// water), stored as "IP68". An empty digit is stored as "X" ("IPX8"); both
// empty stores "방수·방진 지원 안 함". The detail text stays a free-form field.
const WATER_RESISTANCE_KEY = "waterResistance";
const IP_LABELS = ["방진", "방수"];
const WATER_RESISTANCE_NONE = "방수·방진 지원 안 함";

function parseWaterResistance(spec: { value: string; detail: string | null }): SpecFieldState {
  const digits = spec.value.match(/IP(\d|X)(\d|X)/i);
  const digit = (raw?: string) => (raw && /\d/.test(raw) ? raw : "");
  return { value: "", detail: spec.detail ?? "", parts: [digit(digits?.[1]), digit(digits?.[2])] };
}

// speakers is entered as a type dropdown plus a count (form state `parts`: type,
// count), stored as "스테레오 2개" / "모노 1개" / "스피커 없음".
const SPEAKERS_KEY = "speakers";
const SPEAKER_TYPES = [
  { id: "none", label: "스피커 없음" },
  { id: "mono", label: "모노" },
  { id: "stereo", label: "스테레오" },
];

function parseSpeakers(spec: { value: string; detail: string | null }): SpecFieldState {
  const type = /없음/.test(spec.value)
    ? "none"
    : /모노/.test(spec.value)
      ? "mono"
      : /스테레오/.test(spec.value)
        ? "stereo"
        : "";
  return {
    value: "",
    detail: spec.detail ?? "",
    parts: [type, spec.value.match(/(\d+)\s*개/)?.[1] ?? ""],
  };
}

// stylus is a dropdown; the selected label is stored as the display value.
const STYLUS_KEY = "stylus";
const STYLUS_OPTIONS = ["미지원", "필압 미확인", "1024단계", "2048단계", "4096단계", "8192단계"];

// displayResolution is entered as width × height (form state `parts`), stored as
// "2532 × 1170"; refreshRate as min/max (form state `parts`), stored as "60Hz"
// when equal or "1~120Hz" for a range. Empty input is stored as "미확인".
const RESOLUTION_KEY = "displayResolution";
const REFRESH_RATE_KEY = "refreshRate";
const RESOLUTION_LABELS = ["가로", "세로"];
const REFRESH_RATE_LABELS = ["최소", "최대"];
const UNCONFIRMED = "미확인";

function parseResolution(spec: { value: string; detail: string | null }): SpecFieldState {
  const numbers = spec.value.match(/\d+/g) ?? [];
  return { value: "", detail: spec.detail ?? "", parts: [numbers[0] ?? "", numbers[1] ?? ""] };
}

function parseRefreshRate(spec: { value: string; detail: string | null }): SpecFieldState {
  const numbers = spec.value.match(/\d+(?:\.\d+)?/g) ?? [];
  return {
    value: "",
    detail: spec.detail ?? "",
    parts: [numbers[0] ?? "", numbers[1] ?? numbers[0] ?? ""],
  };
}

// wiredConnection is a dropdown of common ports plus "그외" with a free-text
// value (form state `parts`: option, custom text).
const WIRED_KEY = "wiredConnection";
const WIRED_OPTIONS = ["USB Type-C", "Lightning", "micro-USB", "Apple 30-pin"];
const WIRED_OTHER = "그외";

function parseWiredConnection(spec: { value: string; detail: string | null }): SpecFieldState {
  const known = WIRED_OPTIONS.includes(spec.value);
  return {
    value: "",
    detail: spec.detail ?? "",
    parts: known ? [spec.value, ""] : [spec.value ? WIRED_OTHER : "", spec.value],
  };
}

const RATIO_PATTERN = /^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/;

function parseDisplaySize(spec: { value: string; detail: string | null }): SpecFieldState {
  const inches = spec.value.match(/\d+(?:\.\d+)?/)?.[0] ?? "";
  const ratio = `${spec.detail ?? ""} ${spec.value}`.match(/\d+(?:\.\d+)?\s*:\s*\d+(?:\.\d+)?/)?.[0];
  return { value: inches, detail: ratio ? ratio.replace(/\s+/g, "") : "" };
}

function emptySpecs(): Record<string, SpecFieldState> {
  return Object.fromEntries(
    SPEC_FIELDS.map(({ key }) => [
      key,
      key === DIMENSIONS_KEY
        ? { value: "", detail: "", parts: DIMENSION_LABELS.map(() => "") }
        : key === SPEAKERS_KEY || key === RESOLUTION_KEY || key === REFRESH_RATE_KEY || key === WIRED_KEY
        ? { value: "", detail: "", parts: ["", ""] }
        : key === WATER_RESISTANCE_KEY
        ? { value: "", detail: "", parts: IP_LABELS.map(() => "") }
        : { value: key === DISPLAY_SIZE_KEY || key === WEIGHT_KEY ? "" : key === STYLUS_KEY ? "미지원" : "정보 없음", detail: "" },
    ]),
  );
}

function emptyForm(): FormState {
  return {
    brandId: "",
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
    colors: [],
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

function fromDevice(device: ApiDeviceDetail, brands: ApiAdminBrand[]): FormState {
  const specs = emptySpecs();
  for (const { key } of SPEC_FIELDS) {
    const spec = device.specs[key];
    if (!spec) continue;
    if (key === DISPLAY_SIZE_KEY) {
      specs[key] = parseDisplaySize(spec);
      continue;
    }
    if (key === DIMENSIONS_KEY) {
      specs[key] = parseDimensions(spec);
      continue;
    }
    if (key === WEIGHT_KEY) {
      specs[key] = parseWeight(spec);
      continue;
    }
    if (key === WATER_RESISTANCE_KEY) {
      specs[key] = parseWaterResistance(spec);
      continue;
    }
    if (key === SPEAKERS_KEY) {
      specs[key] = parseSpeakers(spec);
      continue;
    }
    if (key === WIRED_KEY) {
      specs[key] = parseWiredConnection(spec);
      continue;
    }
    if (key === RESOLUTION_KEY) {
      specs[key] = parseResolution(spec);
      continue;
    }
    if (key === REFRESH_RATE_KEY) {
      specs[key] = parseRefreshRate(spec);
      continue;
    }
    specs[key] = {
      value: spec.value,
      detail: spec.detail ?? "",
    };
  }

  return {
    brandId: brands.find((brand) => brand.slug === device.brandSlug)?.id ?? "",
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
    })),
    colors: device.colors.map((color) => ({
      name: color.name,
      imageUrl: color.imageUrl ?? "",
      colorCode: color.colorCode ?? "",
      exclusive: color.exclusive,
    })),
    specs,
  };
}

function buildPayload(form: FormState): { payload: ApiDeviceWriteRequest } | { error: string } {
  const specs: Record<string, ApiSpecInput> = {};

  for (const { key, label } of SPEC_FIELDS) {
    const field = form.specs[key];

    if (key === DISPLAY_SIZE_KEY) {
      const inches = Number(field.value);
      if (!field.value.trim() || !Number.isFinite(inches) || inches <= 0) {
        return { error: `${label}: 인치를 0보다 큰 숫자로 입력해주세요.` };
      }
      if (!RATIO_PATTERN.test(field.detail.trim())) {
        return { error: `${label}: 비율을 19.5:9 형식으로 입력해주세요.` };
      }
      specs[key] = { value: `${field.value.trim()}인치`, detail: `${field.detail.trim()} 비율` };
      continue;
    }

    if (key === DIMENSIONS_KEY) {
      const parts = (field.parts ?? []).map((part) => part.trim());
      if (parts.length !== DIMENSION_LABELS.length || parts.some((part) => !(Number(part) > 0))) {
        return { error: `${label}: 가로·세로·두께를 0보다 큰 숫자로 입력해주세요.` };
      }
      specs[key] = { value: `${parts.join(" × ")} mm`, detail: field.detail || null };
      continue;
    }

    if (key === WIRED_KEY) {
      const [option = "", custom = ""] = field.parts ?? [];
      if (!option) return { error: `${label}: 단자 종류를 선택해주세요.` };
      if (option === WIRED_OTHER && !custom.trim()) {
        return { error: `${label}: '그외'를 선택하면 단자 이름을 입력해주세요.` };
      }
      specs[key] = {
        value: option === WIRED_OTHER ? custom.trim() : option,
        detail: field.detail || null,
      };
      continue;
    }

    if (key === RESOLUTION_KEY) {
      const [width = "", height = ""] = (field.parts ?? []).map((part) => part.trim());
      if (!width && !height) {
        specs[key] = { value: UNCONFIRMED, detail: field.detail || null };
        continue;
      }
      if (!/^[1-9]\d*$/.test(width) || !/^[1-9]\d*$/.test(height)) {
        return { error: `${label}: 가로·세로를 모두 정수로 입력하거나, 모르면 모두 비워주세요.` };
      }
      specs[key] = { value: `${width} × ${height}`, detail: field.detail || null };
      continue;
    }

    if (key === REFRESH_RATE_KEY) {
      const [rawMin = "", rawMax = ""] = (field.parts ?? []).map((part) => part.trim());
      if (!rawMin && !rawMax) {
        specs[key] = { value: UNCONFIRMED, detail: field.detail || null };
        continue;
      }
      const min = Number(rawMin || rawMax);
      const max = Number(rawMax || rawMin);
      if (!(min > 0) || !(max > 0)) {
        return { error: `${label}: 주사율을 0보다 큰 숫자로 입력해주세요.` };
      }
      if (min > max) {
        return { error: `${label}: 최소 주사율이 최대보다 클 수 없습니다.` };
      }
      specs[key] = {
        value: min === max ? `${min}Hz` : `${min}~${max}Hz`,
        detail: field.detail || null,
      };
      continue;
    }

    if (key === SPEAKERS_KEY) {
      const [typeId = "", count = ""] = field.parts ?? [];
      const type = SPEAKER_TYPES.find((item) => item.id === typeId);
      if (!type) return { error: `${label}: 스피커 종류를 선택해주세요.` };
      if (type.id === "none") {
        specs[key] = { value: type.label, detail: field.detail || null };
        continue;
      }
      if (!/^[1-9]\d*$/.test(count.trim())) {
        return { error: `${label}: 스피커 개수를 1 이상의 정수로 입력해주세요.` };
      }
      specs[key] = { value: `${type.label} ${count.trim()}개`, detail: field.detail || null };
      continue;
    }

    if (key === WATER_RESISTANCE_KEY) {
      const [dust = "", water = ""] = (field.parts ?? []).map((part) => part.trim());
      specs[key] = {
        value: dust || water ? `IP${dust || "X"}${water || "X"}` : WATER_RESISTANCE_NONE,
        detail: field.detail || null,
      };
      continue;
    }

    if (key === WEIGHT_KEY) {
      if (!(Number(field.value) > 0)) {
        return { error: `${label}: 무게(g)를 0보다 큰 숫자로 입력해주세요.` };
      }
      specs[key] = { value: `${field.value.trim()} g`, detail: field.detail || null };
      continue;
    }

    if (!field.value.trim()) {
      return { error: `${label}: 표시값을 입력해주세요.` };
    }

    specs[key] = {
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
    const ramGb = config.ramGb.trim() ? Number(config.ramGb) : null;
    if (ramGb !== null && (!Number.isFinite(ramGb) || ramGb <= 0)) {
      return { error: "RAM 용량(GB)은 0보다 큰 숫자여야 합니다." };
    }
    configurations.push({ label: config.label, storageGb, ramGb });
  }

  const colors = [];
  const seenColorNames = new Set<string>();
  for (const color of form.colors) {
    if (!color.name.trim()) {
      return { error: "색상의 이름을 입력해주세요." };
    }
    if (seenColorNames.has(color.name)) {
      return { error: `색상 이름이 중복되었습니다: ${color.name}` };
    }
    seenColorNames.add(color.name);
    colors.push({
      name: color.name,
      imageUrl: color.imageUrl || null,
      colorCode: color.colorCode || null,
      exclusive: color.exclusive,
    });
  }

  const sources = form.sources.map((source) => ({
    url: source.url,
    title: source.title,
    checkedAt: source.checkedAt ? new Date(source.checkedAt).toISOString() : null,
    isPrimary: source.isPrimary,
  }));

  if (!form.brandId) {
    return { error: "브랜드를 선택해주세요." };
  }
  if (!form.slug.trim() || !form.name.trim() || !form.releaseDate) {
    return { error: "slug, 기기명, 출시일은 필수입니다." };
  }

  return {
    payload: {
      // Placeholders — confirmSave re-resolves these fresh from form.brandId
      // right before sending (see its comment), so a brand renamed after
      // this form was loaded can't silently create a duplicate brand.
      brandSlug: "",
      brandName: "",
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
      colors,
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
  brands,
}: {
  mode: "create" | "edit";
  device?: ApiDeviceDetail;
  brands: ApiAdminBrand[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() =>
    device ? fromDevice(device, brands) : emptyForm(),
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmingPayload, setConfirmingPayload] = useState<ApiDeviceWriteRequest | null>(null);

  useEffect(() => {
    if (error) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [error]);

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
      // Re-resolve the brand fresh right before saving (not from the
      // possibly-stale `brands` list this form was opened with) — closes
      // the race where someone renames the brand's slug while this form is
      // open, which would otherwise make the stale slug upsert into a new,
      // duplicate brand row instead of updating the intended one.
      const brandResponse = await fetch(`/api/admin/brands/${form.brandId}`);
      if (!brandResponse.ok) {
        setError("선택한 브랜드를 찾을 수 없습니다. 새로고침 후 다시 시도해주세요.");
        setSubmitting(false);
        return;
      }
      const brand = (await brandResponse.json()) as ApiAdminBrand;
      const payload: ApiDeviceWriteRequest = {
        ...draftPayload,
        brandSlug: brand.slug,
        brandName: brand.name,
      };

      const response = await fetch(
        mode === "create" ? "/api/admin/devices" : `/api/admin/devices/${device!.id}`,
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

      const saved = (await response.json()) as ApiDeviceDetail;
      setToast("저장되었습니다");
      // Give the toast a moment on screen before navigating away — a create
      // navigates to a brand-new /edit URL and unmounts this component, so
      // the toast would otherwise never actually be seen.
      window.setTimeout(() => {
        router.push(`/devices/${saved.id}/edit`);
        router.refresh();
        setSubmitting(false);
        setToast(null);
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
              placeholder="12GB, 512GB"
            />
          </div>
          <div>
            <label className={labelClass}>대표 이미지 URL (색상 미선택 시 표시)</label>
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
          <div className="grid flex-1 grid-cols-[1fr_auto] gap-2">
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
              className={`${inputClass} w-48`}
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
          </div>
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
              { label: "", storageGb: "", ramGb: "" },
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
              placeholder="12GB, 512GB"
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
          </div>
        )}
      />

      <ListSection
        title="색상"
        items={form.colors}
        onAdd={() =>
          setForm({
            ...form,
            colors: [...form.colors, { name: "", imageUrl: "", colorCode: "", exclusive: false }],
          })
        }
        onRemove={(index) => setForm({ ...form, colors: form.colors.filter((_, i) => i !== index) })}
        renderItem={(color, index) => (
          <div className="grid flex-1 grid-cols-[1fr_2fr_140px_auto] gap-2">
            <input
              className={inputClass}
              value={color.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  colors: form.colors.map((c, i) => (i === index ? { ...c, name: e.target.value } : c)),
                })
              }
              placeholder="사파이어 블루"
            />
            <input
              className={inputClass}
              value={color.imageUrl}
              onChange={(e) =>
                setForm({
                  ...form,
                  colors: form.colors.map((c, i) => (i === index ? { ...c, imageUrl: e.target.value } : c)),
                })
              }
              placeholder="https://... (색상별 이미지 URL)"
            />
            <div className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-6 w-6 shrink-0 rounded-full border border-zinc-300 dark:border-zinc-600"
                style={{ backgroundColor: color.colorCode || "transparent" }}
              />
              <input
                className={inputClass}
                value={color.colorCode}
                onChange={(e) =>
                  setForm({
                    ...form,
                    colors: form.colors.map((c, i) =>
                      i === index ? { ...c, colorCode: e.target.value } : c,
                    ),
                  })
                }
                placeholder="#FFD700"
              />
            </div>
            <label className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={color.exclusive}
                onChange={(e) =>
                  setForm({
                    ...form,
                    colors: form.colors.map((c, i) =>
                      i === index ? { ...c, exclusive: e.target.checked } : c,
                    ),
                  })
                }
              />
              단독 색상
            </label>
          </div>
        )}
      />

      <section className={sectionClass}>
        <h2 className="mb-3 text-sm font-semibold text-zinc-950 dark:text-zinc-50">
          사양 ({SPEC_FORM_COUNT}개, 전부 필수)
        </h2>
        <div className="flex flex-col gap-8">
          {SPEC_FORM_SECTIONS.map((section) => (
            <div key={section.title}>
              <div className="mb-1 flex items-baseline justify-between border-b-2 border-zinc-300 pb-2 dark:border-zinc-600">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  {section.title}
                </h3>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">{section.fields.length}개</span>
              </div>
              <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
          {section.fields.map(({ key, label }) => {
            const field = form.specs[key];
            return (
              <div key={key} className="grid grid-cols-[110px_1fr] items-start gap-2 py-2.5">
                <p className="pt-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">{label}</p>
                {key === DIMENSIONS_KEY ? (
                  <div className="grid grid-cols-3 gap-2">
                    {DIMENSION_LABELS.map((partLabel, partIndex) => (
                      <div key={partLabel} className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          step="any"
                          className={inputClass}
                          value={field.parts?.[partIndex] ?? ""}
                          onChange={(e) => {
                            const parts = DIMENSION_LABELS.map((_, i) => field.parts?.[i] ?? "");
                            parts[partIndex] = e.target.value;
                            setForm({
                              ...form,
                              specs: { ...form.specs, [key]: { ...field, parts } },
                            });
                          }}
                          placeholder={partLabel}
                        />
                        <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                          {partIndex === DIMENSION_LABELS.length - 1 ? "mm" : "×"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : key === WIRED_KEY ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <select
                        className={`${inputClass} w-40`}
                        value={field.parts?.[0] ?? ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            specs: {
                              ...form.specs,
                              [key]: { ...field, parts: [e.target.value, field.parts?.[1] ?? ""] },
                            },
                          })
                        }
                      >
                        <option value="" disabled>
                          선택
                        </option>
                        {[...WIRED_OPTIONS, WIRED_OTHER].map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                      {field.parts?.[0] === WIRED_OTHER ? (
                        <input
                          className={inputClass}
                          value={field.parts?.[1] ?? ""}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              specs: {
                                ...form.specs,
                                [key]: { ...field, parts: [WIRED_OTHER, e.target.value] },
                              },
                            })
                          }
                          placeholder="단자 이름 (예: Mini-USB)"
                        />
                      ) : null}
                    </div>
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
                ) : key === RESOLUTION_KEY || key === REFRESH_RATE_KEY ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      {(key === RESOLUTION_KEY ? RESOLUTION_LABELS : REFRESH_RATE_LABELS).map(
                        (partLabel, partIndex) => (
                          <div key={partLabel} className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              step={key === RESOLUTION_KEY ? 1 : "any"}
                              className={`${inputClass} w-28`}
                              value={field.parts?.[partIndex] ?? ""}
                              onChange={(e) => {
                                const parts = [field.parts?.[0] ?? "", field.parts?.[1] ?? ""];
                                parts[partIndex] = e.target.value;
                                setForm({
                                  ...form,
                                  specs: { ...form.specs, [key]: { ...field, parts } },
                                });
                              }}
                              placeholder={partLabel}
                            />
                            <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                              {partIndex === 0 ? (key === RESOLUTION_KEY ? "×" : "~") : key === RESOLUTION_KEY ? "px" : "Hz"}
                            </span>
                          </div>
                        ),
                      )}
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        {key === REFRESH_RATE_KEY ? "같으면 한 값으로 표시, " : ""}비우면 미확인
                      </span>
                    </div>
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
                ) : key === STYLUS_KEY ? (
                  <div className="flex flex-col gap-1">
                    <select
                      className={`${inputClass} w-44`}
                      value={field.value}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          specs: { ...form.specs, [key]: { ...field, value: e.target.value } },
                        })
                      }
                    >
                      {!STYLUS_OPTIONS.includes(field.value) ? (
                        <option value={field.value} disabled>
                          {field.value || "선택"}
                        </option>
                      ) : null}
                      {STYLUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
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
                ) : key === SPEAKERS_KEY ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <select
                        className={`${inputClass} w-36`}
                        value={field.parts?.[0] ?? ""}
                        onChange={(e) => {
                          const type = e.target.value;
                          const count = type === "none" ? "" : (field.parts?.[1] ?? "");
                          setForm({
                            ...form,
                            specs: { ...form.specs, [key]: { ...field, parts: [type, count] } },
                          });
                        }}
                      >
                        <option value="" disabled>
                          선택
                        </option>
                        {SPEAKER_TYPES.map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        className={`${inputClass} w-20`}
                        value={field.parts?.[1] ?? ""}
                        disabled={(field.parts?.[0] ?? "") === "none"}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            specs: {
                              ...form.specs,
                              [key]: { ...field, parts: [field.parts?.[0] ?? "", e.target.value] },
                            },
                          })
                        }
                        placeholder="2"
                      />
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">개</span>
                    </div>
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
                ) : key === WATER_RESISTANCE_KEY ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">IP</span>
                      {IP_LABELS.map((partLabel, partIndex) => (
                        <input
                          key={partLabel}
                          inputMode="numeric"
                          maxLength={1}
                          className={`${inputClass} w-16 text-center`}
                          value={field.parts?.[partIndex] ?? ""}
                          onChange={(e) => {
                            const parts = IP_LABELS.map((_, i) => field.parts?.[i] ?? "");
                            parts[partIndex] = e.target.value.replace(/\D/g, "").slice(0, 1);
                            setForm({
                              ...form,
                              specs: { ...form.specs, [key]: { ...field, parts } },
                            });
                          }}
                          placeholder={partLabel}
                        />
                      ))}
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        빈칸은 X, 둘 다 비우면 지원 안 함
                      </span>
                    </div>
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
                ) : key === WEIGHT_KEY ? (
                  <div className="flex max-w-xs items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      step="any"
                      className={inputClass}
                      value={field.value}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          specs: { ...form.specs, [key]: { ...field, value: e.target.value } },
                        })
                      }
                      placeholder="177"
                    />
                    <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">g</span>
                  </div>
                ) : key === DISPLAY_SIZE_KEY ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        className={inputClass}
                        value={field.value}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            specs: { ...form.specs, [key]: { ...field, value: e.target.value } },
                          })
                        }
                        placeholder="6.3"
                      />
                      <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">인치</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        className={inputClass}
                        value={field.detail}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            specs: { ...form.specs, [key]: { ...field, detail: e.target.value } },
                          })
                        }
                        placeholder="19.5:9"
                      />
                      <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">비율</span>
                    </div>
                  </div>
                ) : (
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
                )}
              </div>
            );
          })}
              </div>
            </div>
          ))}
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
