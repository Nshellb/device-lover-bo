"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ConfirmDialog, Toast } from "@/components/ui/confirm-dialog";
import { ImagePreview } from "@/components/ui/image-preview";
import { ThousandsInput } from "@/components/ui/thousands-input";
import { formatThousands } from "@/lib/format-number";
import {
  MAX_SUB_DISPLAYS,
  SPEC_FIELDS,
  SPEC_SECTIONS,
  SUB_DISPLAY_FIELDS,
  VIRTUAL_SPEC_KEYS,
  defaultSubDisplayName,
  specKind,
  subDisplayNameKey,
} from "@/lib/spec-labels";
import type {
  ApiAdminBrand,
  ApiDeviceDetail,
  ApiDimension,
  ApiMaterial,
  ApiPower,
  ApiDeviceWriteRequest,
  ApiPublicationStatus,
  ApiSpecInput,
  ApiSoftwareInput,
  ApiSoftwareVersion,
  ApiWirelessTechnology,
} from "@/lib/api/types";

const ALL_SPEC_FIELDS = [...SPEC_FIELDS, ...SUB_DISPLAY_FIELDS];
const SPEC_FIELDS_BY_KEY = new Map(SPEC_FIELDS.map((field) => [field.key, field]));
const SPEC_FORM_SECTIONS = SPEC_SECTIONS.map(({ title, keys }) => ({
  title,
  fields: keys.map((key) => SPEC_FIELDS_BY_KEY.get(key)!),
}));
const SPEC_FORM_COUNT = SPEC_FORM_SECTIONS.reduce((sum, section) => sum + section.fields.length, 0);

type SpecFieldState = { value: string; detail: string; parts?: string[] };
type AliasFieldState = { value: string; kind: string };
type SourceFieldState = { url: string; title: string; checkedAt: string; isPrimary: boolean };
type ConfigFieldState = { label: string; storageGb: string; ramGb: string; priceKrw: string; priceUsd: string };
type SoftwareFieldState = { versionId: string; isLaunch: boolean; note: string };

type MaterialFieldState = { part: string; material: string; note: string };
type PowerFieldState = {
  batteryMah: string;
  batteryNote: string;
  wiredW: string;
  wiredNote: string;
  wirelessW: string;
  wirelessNote: string;
};
type ColorFieldState = { name: string; imageUrl: string; colorCode: string; exclusive: boolean };

type DimensionFieldState = {
  label: string;
  width: string;
  height: string;
  depth: string;
  note: string;
};

type FormState = {
  brandId: string;
  slug: string;
  name: string;
  releaseDate: string;
  variant: string;
  imageUrl: string;
  imageAlt: string;
  launchVideoUrl: string;
  publicationStatus: ApiPublicationStatus;
  aliases: AliasFieldState[];
  sources: SourceFieldState[];
  configurations: ConfigFieldState[];
  colors: ColorFieldState[];
  specs: Record<string, SpecFieldState>;
  subDisplayCount: number;
  dimensions: DimensionFieldState[];
  materials: MaterialFieldState[];
  software: { os: SoftwareFieldState[]; ux: SoftwareFieldState[] };
  power: PowerFieldState;
};

// displaySize is entered as two fields, stored as value "6.3인치" and
// detail "19.5:9 비율". In form state `value` holds the inches and `detail`
// the ratio, without those suffixes.
const DISPLAY_SIZE_KEY = "displaySize";
// dimensions is a separate structured field (up to 3 labelled width/height/depth
// entries, in mm), not a spec row; the "dimensions" key only positions its editor.
const DIMENSIONS_KEY = "dimensions";
const MAX_DIMENSIONS = 3;
const DIMENSION_PARTS = ["width", "height", "depth"] as const;
const DIMENSION_PART_LABELS = ["가로", "세로", "두께"];

const WEIGHT_KEY = "weight";

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

// wiredConnection and sim are dropdowns of common choices plus "그외" with a
// free-text value (form state `parts`: option, custom text).
const WIRED_KEY = "wiredConnection";
const SIM_KEY = "sim";
const CHOICE_OPTIONS: Record<string, string[]> = {
  [WIRED_KEY]: ["USB Type-C", "Lightning", "micro-USB", "Apple 30-pin"],
  displaySupplier: ["Samsung Display", "LG Display", "BOE", "Tianma", "CSOT", "Visionox", "미확인"],
  [SIM_KEY]: [
    "Nano-SIM 1개",
    "Nano-SIM 1개 + eSIM",
    "Nano-SIM 2개",
    "Nano-SIM 2개 + eSIM",
    "eSIM 전용",
    "미확인",
  ],
};
const WIRED_OTHER = "그외";

function parseChoice(kind: string, spec: { value: string; detail: string | null }): SpecFieldState {
  const known = CHOICE_OPTIONS[kind].includes(spec.value);
  return {
    value: "",
    detail: spec.detail ?? "",
    parts: known ? [spec.value, ""] : [spec.value ? WIRED_OTHER : "", spec.value],
  };
}

// displayPeakBrightness (and subNPeakBrightness) is a number stored as "2600니트";
// empty is stored as "미확인".
const PEAK_KEY = "displayPeakBrightness";

// displayLamination / displayAntiReflective (and the sub display variants) are
// 있음 / 없음 / 미확인 selects; the detail is optional. FO shows them only for "있음".
// displayColorGamut is free text ("DCI-P3 100%"); displayContrastRatio is a number
// stored as "2,000,000:1". Both are stored as "미확인" when left empty.
const GAMUT_KEY = "displayColorGamut";
const CONTRAST_KEY = "displayContrastRatio";
const SUPPLIER_KEY = "displaySupplier";

const TREATMENT_KEYS = ["displayLamination", "displayAntiReflective"];
const TREATMENT_OPTIONS = ["있음", "없음", "미확인"];

// wireless is stored as one display value for API/FO compatibility, but BO
// edits its three components independently with dropdowns.
const WIRELESS_KEY = "wireless";

function parseWireless(spec: { value: string; detail: string | null }): SpecFieldState {
  const raw = spec.value;
  const rawParts = raw.split(/\s*[·,]\s*/);
  const detailParts = (spec.detail ?? "").split(/\s*[·,]\s*/).filter(Boolean);
  const combinedParts = [...rawParts, ...detailParts];
  const network = /(?:^|\W)5G(?:\W|$)/i.test(raw)
    ? "5G"
    : /(?:4G|LTE)/i.test(raw)
      ? "4G"
      : /(?:^|\W)3G(?:\W|$)/i.test(raw)
        ? "3G"
        : rawParts.find((part) => /(?:2G|3G|4G|5G|LTE)/i.test(part)) ?? "";

  const wifiPart = rawParts.find((part) => /Wi-?Fi/i.test(part)) ?? "";
  const wifi = /Wi-?Fi\s*7\b|802\.11be/i.test(wifiPart)
    ? "Wi-Fi 7"
    : /Wi-?Fi\s*6E\b/i.test(wifiPart)
      ? "Wi-Fi 6E"
      : /Wi-?Fi\s*6\b|802\.11ax/i.test(wifiPart)
        ? "Wi-Fi 6"
        : /Wi-?Fi\s*5\b|802\.11ac|(?:^|\/)ac(?:\/|$)/i.test(wifiPart)
          ? "Wi-Fi 5"
          : /Wi-?Fi\s*4\b|802\.11n|(?:^|\/)n(?:\/|$)/i.test(wifiPart)
            ? "Wi-Fi 4"
            : /Wi-?Fi\s*3\b|802\.11g|(?:^|\/)g(?:\/|$)/i.test(wifiPart)
              ? "Wi-Fi 3"
              : /Wi-?Fi\s*2\b|802\.11a|(?:^|\/)a(?:\/|$)/i.test(wifiPart)
                ? "Wi-Fi 2"
                : /Wi-?Fi\s*1\b|802\.11b|(?:^|\/)b(?:\/|$)/i.test(wifiPart)
                  ? "Wi-Fi 1"
                  : wifiPart;

  const bluetoothPart = rawParts.find((part) => /Bluetooth/i.test(part)) ?? "";
  const bluetoothVersion = bluetoothPart.match(/\d+(?:\.\d+)?/)?.[0] ?? "";
  const bluetooth = bluetoothVersion
    ? `Bluetooth ${bluetoothVersion.includes(".") ? bluetoothVersion : `${bluetoothVersion}.0`}`
    : bluetoothPart;

  const parseSupport = (name: "UWB" | "NFC") => {
    const part = combinedParts.find((item) => new RegExp(`\\b${name}\\b`, "i").test(item));
    if (!part) return "";
    return /미지원|지원\s*(?:안|하지\s*않)/.test(part) ? "미지원" : "지원";
  };
  const uwb = parseSupport("UWB");
  const nfc = parseSupport("NFC");
  const detail = detailParts
    .filter((part) => !/^(?:UWB|NFC)\s*(?:지원|미지원)$/i.test(part.trim()))
    .join(" · ");

  return { value: "", detail, parts: [network, wifi, bluetooth, uwb, nfc] };
}

// memory and storage keep their capacity text in `value`; the technology standard
// (LPDDR5X, UFS 4.0, ...) is a dropdown stored as the first token of the detail
// ("LPDDR5X, 나머지 설명"). Form state: `parts[0]` = standard, `detail` = the rest.
const MEMORY_KEY = "memory";
const STORAGE_KEY = "storage";
const STANDARD_OPTIONS: Record<string, string[]> = {
  [MEMORY_KEY]: ["LPDDR2", "LPDDR3", "LPDDR4", "LPDDR4X", "LPDDR5", "LPDDR5X", "LPDDR6"],
  [STORAGE_KEY]: [
    "eMMC 4.5",
    "eMMC 5.0",
    "eMMC 5.1",
    "UFS 2.0",
    "UFS 2.1",
    "UFS 2.2",
    "UFS 3.0",
    "UFS 3.1",
    "UFS 4.0",
    "UFS 4.1",
    "NVMe",
  ],
};

function parseWithStandard(
  kind: string,
  spec: { value: string; detail: string | null },
): SpecFieldState {
  const detail = spec.detail ?? "";
  const options = [...(STANDARD_OPTIONS[kind] ?? [])].sort((a, b) => b.length - a.length);
  for (const option of options) {
    if (!detail.toLowerCase().startsWith(option.toLowerCase())) continue;
    const rest = detail.slice(option.length);
    if (rest && !/^[\s,·]/.test(rest)) continue;
    return { value: spec.value, detail: rest.replace(/^[\s,·]+/, ""), parts: [option] };
  }
  return { value: spec.value, detail, parts: [""] };
}

const RATIO_PATTERN = /^\d+(?:\.\d+)?:\d+(?:\.\d+)?$/;

function parseDisplaySize(spec: { value: string; detail: string | null }): SpecFieldState {
  const inches = spec.value.match(/\d+(?:\.\d+)?/)?.[0] ?? "";
  const ratio = `${spec.detail ?? ""} ${spec.value}`.match(/\d+(?:\.\d+)?\s*:\s*\d+(?:\.\d+)?/)?.[0];
  return { value: inches, detail: ratio ? ratio.replace(/\s+/g, "") : "" };
}

function emptySpecs(): Record<string, SpecFieldState> {
  return Object.fromEntries([
    ...[1, 2].map((sub): [string, SpecFieldState] => [
      subDisplayNameKey(sub),
      { value: defaultSubDisplayName(sub), detail: "" },
    ]),
    ...Object.entries(emptyFieldSpecs()),
  ]);
}

function emptyFieldSpecs(): Record<string, SpecFieldState> {
  return Object.fromEntries(
    ALL_SPEC_FIELDS.map(({ key }) => {
      const kind = specKind(key);
      return [
      key,
      kind === SUPPLIER_KEY
        ? { value: "", detail: "", parts: ["미확인", ""] }
        : kind in STANDARD_OPTIONS
        ? { value: "정보 없음", detail: "", parts: [""] }
        : kind === SPEAKERS_KEY || kind === RESOLUTION_KEY || kind === REFRESH_RATE_KEY || kind in CHOICE_OPTIONS || kind === SIM_KEY
        ? { value: "", detail: "", parts: ["", ""] }
        : kind === WIRELESS_KEY
        ? { value: "", detail: "", parts: ["", "", "", "", ""] }
        : kind === WATER_RESISTANCE_KEY
        ? { value: "", detail: "", parts: IP_LABELS.map(() => "") }
        : { value: TREATMENT_KEYS.includes(kind) ? "미확인" : kind === GAMUT_KEY || kind === CONTRAST_KEY || key.startsWith("sub") || kind === DISPLAY_SIZE_KEY || kind === WEIGHT_KEY || kind === PEAK_KEY ? "" : kind === STYLUS_KEY ? "미지원" : "정보 없음", detail: "" },
    ];
    }),
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
    imageAlt: "",
    launchVideoUrl: "",
    publicationStatus: "draft",
    aliases: [],
    sources: [],
    configurations: [],
    colors: [],
    specs: emptySpecs(),
    subDisplayCount: 0,
    dimensions: [{ label: "본체", width: "", height: "", depth: "", note: "" }],
    materials: [],
    software: { os: [], ux: [] },
    power: {
      batteryMah: "",
      batteryNote: "",
      wiredW: "",
      wiredNote: "",
      wirelessW: "",
      wirelessNote: "",
    },
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
  for (const { key } of ALL_SPEC_FIELDS) {
    const kind = specKind(key);
    const spec = device.specs[key];
    if (!spec) continue;
    if (kind === DISPLAY_SIZE_KEY) {
      specs[key] = parseDisplaySize(spec);
      continue;
    }
    if (kind in STANDARD_OPTIONS) {
      specs[key] = parseWithStandard(kind, spec);
      continue;
    }
    if (kind === WEIGHT_KEY) {
      specs[key] = parseWeight(spec);
      continue;
    }
    if (kind === WATER_RESISTANCE_KEY) {
      specs[key] = parseWaterResistance(spec);
      continue;
    }
    if (kind === SPEAKERS_KEY) {
      specs[key] = parseSpeakers(spec);
      continue;
    }
    if (kind in CHOICE_OPTIONS) {
      specs[key] = parseChoice(kind, spec);
      continue;
    }
    if (TREATMENT_KEYS.includes(kind)) {
      specs[key] = {
        value: TREATMENT_OPTIONS.includes(spec.value) ? spec.value : "미확인",
        detail: spec.detail ?? "",
      };
      continue;
    }
    if (kind === GAMUT_KEY) {
      specs[key] = { value: spec.value === "미확인" ? "" : spec.value, detail: spec.detail ?? "" };
      continue;
    }
    if (kind === CONTRAST_KEY) {
      specs[key] = {
        value: spec.value.split(":")[0].replace(/\D/g, ""),
        detail: spec.detail ?? "",
      };
      continue;
    }
    if (kind === PEAK_KEY) {
      specs[key] = {
        value: spec.value.match(/\d+(?:\.\d+)?/)?.[0] ?? "",
        detail: spec.detail ?? "",
      };
      continue;
    }
    if (kind === RESOLUTION_KEY) {
      specs[key] = parseResolution(spec);
      continue;
    }
    if (kind === REFRESH_RATE_KEY) {
      specs[key] = parseRefreshRate(spec);
      continue;
    }
    if (kind === WIRELESS_KEY) {
      specs[key] = parseWireless(spec);
      continue;
    }
    specs[key] = {
      value: spec.value,
      detail: spec.detail ?? "",
    };
  }

  for (const sub of [1, 2]) {
    const name = device.specs[subDisplayNameKey(sub)]?.value;
    if (name) specs[subDisplayNameKey(sub)] = { value: name, detail: "" };
  }

  return {
    brandId: brands.find((brand) => brand.slug === device.brandSlug)?.id ?? "",
    slug: device.slug,
    name: device.name,
    releaseDate: device.releaseDate,
    variant: device.variant ?? "",
    imageUrl: device.imageUrl ?? "",
    imageAlt: device.imageAlt ?? "",
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
      priceKrw: config.priceKrw != null ? String(config.priceKrw) : "",
      priceUsd: config.priceUsd != null ? String(config.priceUsd) : "",
    })),
    colors: device.colors.map((color) => ({
      name: color.name,
      imageUrl: color.imageUrl ?? "",
      colorCode: color.colorCode ?? "",
      exclusive: color.exclusive,
    })),
    specs,
    subDisplayCount: device.specs.sub2DisplaySize ? 2 : device.specs.sub1DisplaySize ? 1 : 0,
    software: {
      os: device.software
        .filter((item) => item.category === "os")
        .map((item) => ({ versionId: item.versionId, isLaunch: item.isLaunch, note: item.note ?? "" })),
      ux: device.software
        .filter((item) => item.category === "ux")
        .map((item) => ({ versionId: item.versionId, isLaunch: item.isLaunch, note: item.note ?? "" })),
    },
    materials: device.materials.map((item) => ({
      part: item.part,
      material: item.material,
      note: item.note ?? "",
    })),
    power: {
      batteryMah: device.power.batteryMah != null ? String(device.power.batteryMah) : "",
      batteryNote: device.power.batteryNote ?? "",
      wiredW: device.power.wiredW != null ? String(device.power.wiredW) : "",
      wiredNote: device.power.wiredNote ?? "",
      wirelessW: device.power.wirelessW != null ? String(device.power.wirelessW) : "",
      wirelessNote: device.power.wirelessNote ?? "",
    },
    dimensions: device.dimensions.map((dimension) => ({
      label: dimension.label,
      width: String(dimension.widthMm),
      height: String(dimension.heightMm),
      depth: String(dimension.depthMm),
      note: dimension.note ?? "",
    })),
  };
}

function buildPayload(form: FormState, softwareVersions: ApiSoftwareVersion[]): { payload: ApiDeviceWriteRequest } | { error: string } {
  const specs: Record<string, ApiSpecInput> = {};

  for (let sub = 1; sub <= form.subDisplayCount; sub++) {
    const name = form.specs[subDisplayNameKey(sub)]?.value.trim();
    if (!name) return { error: `서브${sub} 디스플레이: 이름을 입력해주세요.` };
    specs[subDisplayNameKey(sub)] = { value: name, detail: null };
  }

  const specFields = [
    ...SPEC_FIELDS,
    ...SUB_DISPLAY_FIELDS.filter((field) => field.sub <= form.subDisplayCount),
  ];
  for (const { key, label } of specFields) {
    const kind = specKind(key);
    const field = form.specs[key];

    if (kind === DISPLAY_SIZE_KEY) {
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

    if (VIRTUAL_SPEC_KEYS.has(kind)) continue;

    if (kind === GAMUT_KEY) {
      specs[key] = { value: field.value.trim() || "미확인", detail: field.detail || null };
      continue;
    }

    if (kind === CONTRAST_KEY) {
      const ratio = field.value.trim();
      if (ratio && !(Number(ratio) > 0)) {
        return { error: `${label}: 명암비를 0보다 큰 숫자로 입력하거나, 모르면 비워주세요.` };
      }
      specs[key] = {
        value: ratio ? `${formatThousands(ratio)}:1` : "미확인",
        detail: field.detail || null,
      };
      continue;
    }

    if (kind === PEAK_KEY) {
      const nits = field.value.trim();
      if (nits && !(Number(nits) > 0)) {
        return { error: `${label}: 니트를 0보다 큰 숫자로 입력하거나, 모르면 비워주세요.` };
      }
      specs[key] = { value: nits ? `${nits}니트` : "미확인", detail: field.detail || null };
      continue;
    }

    if (kind in STANDARD_OPTIONS) {
      if (!field.value.trim()) return { error: `${label}: 용량을 입력해주세요.` };
      const standard = field.parts?.[0] ?? "";
      specs[key] = {
        value: field.value,
        detail: [standard, field.detail.trim()].filter(Boolean).join(", ") || null,
      };
      continue;
    }

    if (kind in CHOICE_OPTIONS) {
      const [option = "", custom = ""] = field.parts ?? [];
      if (!option) return { error: `${label}: 종류를 선택해주세요.` };
      if (option === WIRED_OTHER && !custom.trim()) {
        return { error: `${label}: '그외'를 선택하면 이름을 직접 입력해주세요.` };
      }
      specs[key] = {
        value: option === WIRED_OTHER ? custom.trim() : option,
        detail: field.detail || null,
      };
      continue;
    }

    if (kind === WIRELESS_KEY) {
      const [network = "", wifi = "", bluetooth = "", uwb = "", nfc = ""] = field.parts ?? [];
      if (!network || !wifi || !bluetooth || !uwb || !nfc) {
        return {
          error: `${label}: 통신 네트워크, 와이파이 규격, 블루투스 버전, UWB, NFC를 모두 선택해주세요.`,
        };
      }
      specs[key] = {
        value: [network, wifi, bluetooth].join(" · "),
        detail: [`UWB ${uwb}`, `NFC ${nfc}`, field.detail.trim()].filter(Boolean).join(" · "),
      };
      continue;
    }

    if (kind === RESOLUTION_KEY) {
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

    if (kind === REFRESH_RATE_KEY) {
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

    if (kind === SPEAKERS_KEY) {
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

    if (kind === WATER_RESISTANCE_KEY) {
      const [dust = "", water = ""] = (field.parts ?? []).map((part) => part.trim());
      specs[key] = {
        value: dust || water ? `IP${dust || "X"}${water || "X"}` : WATER_RESISTANCE_NONE,
        detail: field.detail || null,
      };
      continue;
    }

    if (kind === WEIGHT_KEY) {
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

  // Entries are sent oldest -> newest (by the managed sort order) so the last one
  // of a category is its latest version.
  const sortOrderOf = new Map(softwareVersions.map((version) => [version.id, version.sortOrder]));
  const software: ApiSoftwareInput[] = [];
  for (const [category, label] of [["os", "운영체제"], ["ux", "UX"]] as const) {
    const entries = form.software[category];
    if (entries.some((item) => !item.versionId)) {
      return { error: `${label}: 버전을 선택해주세요.` };
    }
    if (new Set(entries.map((item) => item.versionId)).size !== entries.length) {
      return { error: `${label}: 같은 버전이 중복되어 있습니다.` };
    }
    if (entries.length > 0 && entries.filter((item) => item.isLaunch).length !== 1) {
      return { error: `${label}: 출시 버전을 하나만 지정해주세요.` };
    }
    [...entries]
      .sort((a, b) => (sortOrderOf.get(a.versionId) ?? 0) - (sortOrderOf.get(b.versionId) ?? 0))
      .forEach((item) =>
        software.push({
          versionId: item.versionId,
          isLaunch: item.isLaunch,
          note: item.note.trim() || null,
        }),
      );
  }

  const materials: ApiMaterial[] = [];
  for (const [index, item] of form.materials.entries()) {
    if (!item.part || !item.material) {
      return { error: `소재 ${index + 1}: 부위와 소재를 선택해주세요.` };
    }
    materials.push({ part: item.part, material: item.material, note: item.note.trim() || null });
  }

  const parsePower = (raw: string, label: string, integer = false): number | null | "error" => {
    if (!raw.trim()) return null;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || (integer && !Number.isInteger(value))) return "error";
    return value;
  };
  const batteryMah = parsePower(form.power.batteryMah, "배터리", true);
  const wiredW = parsePower(form.power.wiredW, "유선 충전");
  const wirelessW = parsePower(form.power.wirelessW, "무선 충전");
  if (batteryMah === "error" || batteryMah === 0) {
    return { error: "배터리 용량(mAh)은 0보다 큰 정수로 입력해주세요." };
  }
  if (wiredW === "error" || wirelessW === "error") {
    return { error: "충전 W는 0 이상의 숫자로 입력해주세요 (0 = 미지원, 비우면 미확인)." };
  }
  const power: ApiPower = {
    batteryMah,
    batteryNote: form.power.batteryNote.trim() || null,
    wiredW,
    wiredNote: form.power.wiredNote.trim() || null,
    wirelessW,
    wirelessNote: form.power.wirelessNote.trim() || null,
  };

  const dimensions: ApiDimension[] = [];
  for (const [index, dimension] of form.dimensions.entries()) {
    const values = DIMENSION_PARTS.map((part) => Number(dimension[part]));
    if (!dimension.label.trim() || values.some((value) => !Number.isFinite(value) || value <= 0)) {
      return { error: `크기 ${index + 1}: 이름과 가로·세로·두께(mm)를 0보다 큰 숫자로 입력해주세요.` };
    }
    dimensions.push({
      label: dimension.label.trim(),
      widthMm: values[0],
      heightMm: values[1],
      depthMm: values[2],
      note: dimension.note.trim() || null,
    });
  }
  if (dimensions.length === 0) return { error: "크기를 1개 이상 입력해주세요." };

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
    const priceKrw = config.priceKrw.trim() ? Number(config.priceKrw) : null;
    if (priceKrw !== null && (!Number.isInteger(priceKrw) || priceKrw <= 0)) {
      return { error: "출시가(원)는 0보다 큰 정수로 입력해주세요." };
    }
    const priceUsd = config.priceUsd.trim() ? Number(config.priceUsd) : null;
    if (priceUsd !== null && (!Number.isFinite(priceUsd) || priceUsd <= 0)) {
      return { error: "출시가(달러)는 0보다 큰 숫자로 입력해주세요." };
    }
    configurations.push({ label: config.label, storageGb, ramGb, priceKrw, priceUsd });
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
      imageAlt: form.imageAlt.trim() || null,
      launchVideoUrl: form.launchVideoUrl || null,
      publicationStatus: form.publicationStatus,
      aliases: form.aliases.filter((alias) => alias.value.trim()).map((alias) => ({
        value: alias.value,
        kind: alias.kind as "alias" | "model_number" | "hardware_identifier",
      })),
      sources,
      configurations,
      dimensions,
      materials,
      software,
      power,
      colors,
      specs,
    },
  };
}

// Compact inputs (explicit width) use inputBaseClass: inputClass includes w-full,
// which would otherwise win over a w-NN utility and stretch the field.
const inputBaseClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";
const inputClass = `w-full ${inputBaseClass}`;
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
  wirelessTechnologies,
  softwareVersions,
}: {
  mode: "create" | "edit";
  device?: ApiDeviceDetail;
  brands: ApiAdminBrand[];
  wirelessTechnologies: ApiWirelessTechnology[];
  softwareVersions: ApiSoftwareVersion[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() =>
    device ? fromDevice(device, brands) : emptyForm(),
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmingPayload, setConfirmingPayload] = useState<ApiDeviceWriteRequest | null>(null);
  const networkOptions = wirelessTechnologies.filter((item) => item.category === "network");
  const wifiOptions = wirelessTechnologies.filter((item) => item.category === "wifi");
  const bluetoothOptions = wirelessTechnologies.filter((item) => item.category === "bluetooth");

  useEffect(() => {
    if (error) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [error]);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const result = buildPayload(form, softwareVersions);
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
        router.push(`/devices/${saved.slug}/edit`);
        router.refresh();
        setSubmitting(false);
        setToast(null);
      }, 900);
    } catch {
      setError("저장하지 못했습니다. 네트워크 상태를 확인해주세요.");
      setSubmitting(false);
    }
  }

  const setDimension = (index: number, patch: Partial<DimensionFieldState>) =>
    setForm({
      ...form,
      dimensions: form.dimensions.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });

  const renderDimensions = () => (
    <div className="flex flex-col gap-2">
      {form.dimensions.map((dimension, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
          <input
            className={`${inputBaseClass} w-28`}
            value={dimension.label}
            onChange={(e) => setDimension(index, { label: e.target.value })}
            placeholder="이름 (본체)"
          />
          {DIMENSION_PARTS.map((part, partIndex) => (
            <div key={part} className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                step="any"
                className={`${inputBaseClass} w-24`}
                value={dimension[part]}
                onChange={(e) => setDimension(index, { [part]: e.target.value })}
                placeholder={DIMENSION_PART_LABELS[partIndex]}
              />
              <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                {partIndex === DIMENSION_PARTS.length - 1 ? "mm" : "×"}
              </span>
            </div>
          ))}
          <input
            className={`${inputBaseClass} w-48`}
            value={dimension.note}
            onChange={(e) => setDimension(index, { note: e.target.value })}
            placeholder="메모 (선택)"
          />
          {form.dimensions.length > 1 ? (
            <button
              type="button"
              className={removeButtonClass}
              onClick={() =>
                setForm({ ...form, dimensions: form.dimensions.filter((_, i) => i !== index) })
              }
            >
              제거
            </button>
          ) : null}
        </div>
      ))}
      {form.dimensions.length < MAX_DIMENSIONS ? (
        <div>
          <button
            type="button"
            className={addButtonClass}
            onClick={() =>
              setForm({
                ...form,
                dimensions: [
                  ...form.dimensions,
                  { label: "", width: "", height: "", depth: "", note: "" },
                ],
              })
            }
          >
            + 크기 추가 (최대 {MAX_DIMENSIONS}개, 예: 접은 상태)
          </button>
        </div>
      ) : null}
    </div>
  );

  const MATERIAL_PARTS = ["전면", "후면", "프레임", "힌지", "커버 디스플레이", "기타"];
  const MATERIAL_TYPES = ["유리", "알루미늄", "티타늄", "스테인리스", "플라스틱", "세라믹", "가죽", "기타"];

  const setMaterial = (index: number, patch: Partial<MaterialFieldState>) =>
    setForm({
      ...form,
      materials: form.materials.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    });

  const renderMaterials = () => (
    <div className="flex flex-col gap-2">
      {form.materials.map((item, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
          <select
            className={`${inputBaseClass} w-36`}
            value={item.part}
            onChange={(e) => setMaterial(index, { part: e.target.value })}
          >
            <option value="" disabled>
              부위 선택
            </option>
            {MATERIAL_PARTS.map((part) => (
              <option key={part} value={part}>
                {part}
              </option>
            ))}
          </select>
          <select
            className={`${inputBaseClass} w-32`}
            value={item.material}
            onChange={(e) => setMaterial(index, { material: e.target.value })}
          >
            <option value="" disabled>
              소재 선택
            </option>
            {MATERIAL_TYPES.map((material) => (
              <option key={material} value={material}>
                {material}
              </option>
            ))}
          </select>
          <input
            className={`${inputBaseClass} w-64`}
            value={item.note}
            onChange={(e) => setMaterial(index, { note: e.target.value })}
            placeholder="세부 (Gorilla Glass Victus 2, Armor Aluminum 등)"
          />
          <button
            type="button"
            className={removeButtonClass}
            onClick={() =>
              setForm({ ...form, materials: form.materials.filter((_, i) => i !== index) })
            }
          >
            제거
          </button>
        </div>
      ))}
      <div>
        <button
          type="button"
          className={addButtonClass}
          onClick={() =>
            setForm({ ...form, materials: [...form.materials, { part: "", material: "", note: "" }] })
          }
        >
          + 소재 추가
        </button>
      </div>
    </div>
  );

  const setPower = (patch: Partial<PowerFieldState>) =>
    setForm({ ...form, power: { ...form.power, ...patch } });

  const renderPower = (which: "battery" | "wired" | "wireless") => {
    const config = {
      battery: { value: form.power.batteryMah, note: form.power.batteryNote, unit: "mAh", hint: "비우면 미확인", valueKey: "batteryMah", noteKey: "batteryNote" },
      wired: { value: form.power.wiredW, note: form.power.wiredNote, unit: "W", hint: "0 = 미지원, 비우면 미확인", valueKey: "wiredW", noteKey: "wiredNote" },
      wireless: { value: form.power.wirelessW, note: form.power.wirelessNote, unit: "W", hint: "0 = 미지원, 비우면 미확인", valueKey: "wirelessW", noteKey: "wirelessNote" },
    }[which];

    return (
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <input
            type="number"
            min={0}
            step={which === "battery" ? 1 : "any"}
            className={`${inputBaseClass} w-36 min-w-36 shrink-0`}
            value={config.value}
            onChange={(e) => setPower({ [config.valueKey]: e.target.value } as Partial<PowerFieldState>)}
            placeholder={which === "battery" ? "4400" : "25"}
          />
          <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">{config.unit}</span>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">{config.hint}</span>
        </div>
        <input
          className={inputClass}
          value={config.note}
          onChange={(e) => setPower({ [config.noteKey]: e.target.value } as Partial<PowerFieldState>)}
          placeholder="detail (선택)"
        />
      </div>
    );
  };

  const setSoftware = (category: "os" | "ux", entries: SoftwareFieldState[]) =>
    setForm({ ...form, software: { ...form.software, [category]: entries } });

  const renderSoftware = (category: "os" | "ux") => {
    const entries = form.software[category];
    const options = softwareVersions
      .filter((version) => version.category === category)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
    const update = (index: number, patch: Partial<SoftwareFieldState>) =>
      setSoftware(
        category,
        entries.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)),
      );

    return (
      <div className="flex flex-col gap-2">
        {entries.map((entry, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2">
            <select
              className={`${inputBaseClass} w-56`}
              value={entry.versionId}
              onChange={(e) => update(index, { versionId: e.target.value })}
            >
              <option value="" disabled>
                버전 선택
              </option>
              {options.map((version) => (
                <option key={version.id} value={version.id}>
                  {version.label}
                </option>
              ))}
            </select>
            <label className="flex shrink-0 items-center gap-1 text-xs text-zinc-600 dark:text-zinc-300">
              <input
                type="radio"
                name={`${category}-launch`}
                checked={entry.isLaunch}
                onChange={() =>
                  setSoftware(
                    category,
                    entries.map((item, i) => ({ ...item, isLaunch: i === index })),
                  )
                }
              />
              출시 버전
            </label>
            <input
              className={`${inputBaseClass} w-64`}
              value={entry.note}
              onChange={(e) => update(index, { note: e.target.value })}
              placeholder="메모 (선택)"
            />
            <button
              type="button"
              className={removeButtonClass}
              onClick={() => setSoftware(category, entries.filter((_, i) => i !== index))}
            >
              제거
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={addButtonClass}
            onClick={() =>
              setSoftware(category, [
                ...entries,
                { versionId: "", isLaunch: entries.length === 0, note: "" },
              ])
            }
          >
            + {category === "os" ? "운영체제" : "UX"} 버전 추가
          </button>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            출시 버전과 업그레이드되는 모든 버전을 추가하세요. 목록은 BO &gt; 운영체제 / UX 관리에서 관리합니다.
          </span>
        </div>
      </div>
    );
  };

  const renderSpecRow = ({ key, label }: { key: string; label: string }) => {
    const kind = specKind(key);
            const field = form.specs[key];
            const fieldParts = field.parts ?? [];
            const updateWirelessPart = (partIndex: number, value: string) => {
              const parts = Array.from({ length: 5 }, (_, index) => fieldParts[index] ?? "");
              parts[partIndex] = value;
              setForm({
                ...form,
                specs: { ...form.specs, [key]: { ...field, parts } },
              });
            };
            return (
              <div key={key} className="grid grid-cols-[110px_1fr] items-start gap-2 py-2.5">
                <p className="pt-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">{label}</p>
                {kind === DIMENSIONS_KEY ? (
                  renderDimensions()
                ) : kind === "operatingSystem" ? (
                  renderSoftware("os")
                ) : kind === "ux" ? (
                  renderSoftware("ux")
                ) : kind === "materials" ? (
                  renderMaterials()
                ) : kind === "batteryCapacity" ? (
                  renderPower("battery")
                ) : kind === "fastCharging" ? (
                  renderPower("wired")
                ) : kind === "wirelessCharging" ? (
                  renderPower("wireless")
                ) : kind === GAMUT_KEY || kind === CONTRAST_KEY ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      {kind === CONTRAST_KEY ? (
                        <>
                          <ThousandsInput
                            className={`${inputBaseClass} w-40`}
                            value={field.value}
                            onValueChange={(value) =>
                              setForm({
                                ...form,
                                specs: { ...form.specs, [key]: { ...field, value } },
                              })
                            }
                            placeholder="2,000,000"
                          />
                          <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">: 1</span>
                        </>
                      ) : (
                        <input
                          className={`${inputBaseClass} w-64`}
                          value={field.value}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              specs: { ...form.specs, [key]: { ...field, value: e.target.value } },
                            })
                          }
                          placeholder="DCI-P3 100%"
                        />
                      )}
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">비우면 미확인</span>
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
                ) : TREATMENT_KEYS.includes(kind) ? (
                  <div className="flex flex-col gap-1">
                    <select
                      className={`${inputBaseClass} w-28`}
                      value={field.value}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          specs: { ...form.specs, [key]: { ...field, value: e.target.value } },
                        })
                      }
                    >
                      {TREATMENT_OPTIONS.map((option) => (
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
                ) : kind === PEAK_KEY ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <input
                        type="number"
                        min={0}
                        step="any"
                        className={`${inputBaseClass} w-28`}
                        value={field.value}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            specs: { ...form.specs, [key]: { ...field, value: e.target.value } },
                          })
                        }
                        placeholder="2600"
                      />
                      <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">니트</span>
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">비우면 미확인</span>
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
                  </div>                ) : kind in CHOICE_OPTIONS ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <select
                        className={`${inputBaseClass} ${kind === SIM_KEY ? "w-72" : "w-40"}`}
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
                        {[...CHOICE_OPTIONS[kind], WIRED_OTHER].map((option) => (
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
                ) : kind === WIRELESS_KEY ? (
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                      <label>
                        <span className={labelClass}>통신 네트워크</span>
                        <select
                          className={inputClass}
                          value={fieldParts[0] ?? ""}
                          onChange={(e) => updateWirelessPart(0, e.target.value)}
                        >
                          <option value="" disabled>
                            3G / 4G / 5G 선택
                          </option>
                          {fieldParts[0] &&
                          !networkOptions.some((option) => option.value === fieldParts[0]) ? (
                            <option value={fieldParts[0]}>{fieldParts[0]} (기존값)</option>
                          ) : null}
                          {networkOptions.map((option) => (
                            <option key={option.id} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span className={labelClass}>와이파이 규격</span>
                        <select
                          className={inputClass}
                          value={fieldParts[1] ?? ""}
                          onChange={(e) => updateWirelessPart(1, e.target.value)}
                        >
                          <option value="" disabled>
                            규격 선택
                          </option>
                          {fieldParts[1] &&
                          !wifiOptions.some((option) => option.value === fieldParts[1]) ? (
                            <option value={fieldParts[1]}>{fieldParts[1]} (기존값)</option>
                          ) : null}
                          {wifiOptions.map((option) => (
                            <option key={option.id} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        <span className={labelClass}>블루투스 버전</span>
                        <select
                          className={inputClass}
                          value={fieldParts[2] ?? ""}
                          onChange={(e) => updateWirelessPart(2, e.target.value)}
                        >
                          <option value="" disabled>
                            버전 선택
                          </option>
                          {fieldParts[2] &&
                          !bluetoothOptions.some((option) => option.value === fieldParts[2]) ? (
                            <option value={fieldParts[2]}>{fieldParts[2]} (기존값)</option>
                          ) : null}
                          {bluetoothOptions.map((option) => (
                            <option key={option.id} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      {(
                        [
                          { category: "uwb", label: "UWB" },
                          { category: "nfc", label: "NFC" },
                        ] as const
                      ).map((capability, capabilityIndex) => {
                        const supportOptions = wirelessTechnologies.filter(
                          (item) => item.category === capability.category,
                        );
                        const currentValue = fieldParts[capabilityIndex + 3] ?? "";
                        return (
                        <label key={capability.category}>
                          <span className={labelClass}>{capability.label}</span>
                          <select
                            className={inputClass}
                            value={currentValue}
                            onChange={(e) =>
                              updateWirelessPart(capabilityIndex + 3, e.target.value)
                            }
                          >
                            <option value="" disabled>
                              지원 여부 선택
                            </option>
                            {currentValue &&
                            !supportOptions.some((option) => option.value === currentValue) ? (
                              <option value={currentValue}>{currentValue} (기존값)</option>
                            ) : null}
                            {supportOptions.map((option) => (
                              <option key={option.id} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        );
                      })}
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
                      placeholder="추가 detail (선택)"
                    />
                  </div>
                ) : kind === RESOLUTION_KEY || kind === REFRESH_RATE_KEY ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      {(kind === RESOLUTION_KEY ? RESOLUTION_LABELS : REFRESH_RATE_LABELS).map(
                        (partLabel, partIndex) => (
                          <div key={partLabel} className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              step={kind === RESOLUTION_KEY ? 1 : "any"}
                              className={`${inputBaseClass} w-28`}
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
                              {partIndex === 0 ? (kind === RESOLUTION_KEY ? "×" : "~") : kind === RESOLUTION_KEY ? "px" : "Hz"}
                            </span>
                          </div>
                        ),
                      )}
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        {kind === REFRESH_RATE_KEY ? "같으면 한 값으로 표시, " : ""}비우면 미확인
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
                ) : kind in STANDARD_OPTIONS ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        className={`${inputBaseClass} w-56`}
                        value={field.value}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            specs: { ...form.specs, [key]: { ...field, value: e.target.value } },
                          })
                        }
                        placeholder={kind === MEMORY_KEY ? "용량 (12GB, 16GB)" : "용량 (256GB, 512GB)"}
                      />
                      <select
                        className={`${inputBaseClass} w-40`}
                        value={field.parts?.[0] ?? ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            specs: { ...form.specs, [key]: { ...field, parts: [e.target.value] } },
                          })
                        }
                      >
                        <option value="">규격 선택 안 함</option>
                        {STANDARD_OPTIONS[kind].map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
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
                ) : kind === STYLUS_KEY ? (
                  <div className="flex flex-col gap-1">
                    <select
                      className={`${inputBaseClass} w-44`}
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
                ) : kind === SPEAKERS_KEY ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <select
                        className={`${inputBaseClass} w-36`}
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
                        className={`${inputBaseClass} w-20`}
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
                ) : kind === WATER_RESISTANCE_KEY ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">IP</span>
                      {IP_LABELS.map((partLabel, partIndex) => (
                        <input
                          key={partLabel}
                          inputMode="numeric"
                          maxLength={1}
                          className={`${inputBaseClass} w-16 shrink-0 text-center`}
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
                      <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
                        빈칸은 X로 저장, 둘 다 비우면 지원 안 함
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
                ) : kind === WEIGHT_KEY ? (
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
                ) : kind === DISPLAY_SIZE_KEY ? (
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
  };

  const renderSubDisplays = () => (
    <div className="flex flex-col gap-3 pt-3">
      {SUB_DISPLAY_FIELDS.filter((field) => field.sub <= form.subDisplayCount).length > 0
        ? Array.from({ length: form.subDisplayCount }, (_, index) => index + 1).map((sub) => (
            <div key={sub} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
              <div className="mb-1 flex items-center justify-between">
                <input
                  className={`${inputClass} max-w-56 font-semibold`}
                  value={form.specs[subDisplayNameKey(sub)]?.value ?? ""}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      specs: {
                        ...form.specs,
                        [subDisplayNameKey(sub)]: { value: e.target.value, detail: "" },
                      },
                    })
                  }
                  placeholder={defaultSubDisplayName(sub)}
                />
                <span className="mr-auto ml-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                  디스플레이
                </span>
                {sub === form.subDisplayCount ? (
                  <button
                    type="button"
                    className={removeButtonClass}
                    onClick={() => setForm({ ...form, subDisplayCount: sub - 1 })}
                  >
                    제거
                  </button>
                ) : null}
              </div>
              <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
                {SUB_DISPLAY_FIELDS.filter((field) => field.sub === sub).map(renderSpecRow)}
              </div>
            </div>
          ))
        : null}
      {form.subDisplayCount < MAX_SUB_DISPLAYS ? (
        <div>
          <button
            type="button"
            className={addButtonClass}
            onClick={() => setForm({ ...form, subDisplayCount: form.subDisplayCount + 1 })}
          >
            + 서브 디스플레이 추가 (메인 포함 최대 {MAX_SUB_DISPLAYS + 1}개)
          </button>
        </div>
      ) : null}
    </div>
  );

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
          <div className="col-span-2">
            <label className={labelClass}>대표 이미지 URL (색상 미선택 시 표시) / 대체 텍스트 (alt)</label>
            <div className="flex items-end gap-3">
              <ImagePreview url={form.imageUrl} alt={form.imageAlt || `${form.name || "기기"} 대표 이미지`} />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <input
                  className={inputClass}
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  placeholder="https://..."
                />
                <input
                  className={inputClass}
                  value={form.imageAlt}
                  maxLength={200}
                  onChange={(e) => setForm({ ...form, imageAlt: e.target.value })}
                  placeholder={`대체 텍스트 (alt) — ${form.name || "기기명"} 대표 이미지, 비우면 기기명 사용`}
                />
              </div>
            </div>
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
              placeholder="모델 번호 또는 별칭 (예: SM-S921)"
            />
            <select
              className={`${inputBaseClass} w-48`}
              value={alias.kind}
              onChange={(e) =>
                setForm({
                  ...form,
                  aliases: form.aliases.map((a, i) => (i === index ? { ...a, kind: e.target.value } : a)),
                })
              }
            >
              <option value="model_number">모델 번호</option>
              <option value="hardware_identifier">하드웨어 식별자</option>
              <option value="alias">별칭</option>
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
              { label: "", storageGb: "", ramGb: "", priceKrw: "", priceUsd: "" },
            ],
          })
        }
        onRemove={(index) =>
          setForm({ ...form, configurations: form.configurations.filter((_, i) => i !== index) })
        }
        renderItem={(config, index) => (
          <div className="grid flex-1 grid-cols-[1fr_auto_auto_auto_auto_auto] gap-2">
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
              className={`${inputBaseClass} w-28`}
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
              className={`${inputBaseClass} w-24`}
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
            <ThousandsInput
              className={`${inputBaseClass} w-36`}
              value={config.priceKrw}
              onValueChange={(priceKrw) =>
                setForm({
                  ...form,
                  configurations: form.configurations.map((c, i) =>
                    i === index ? { ...c, priceKrw } : c,
                  ),
                })
              }
              placeholder="출시가 (원)"
            />
            <ThousandsInput
              decimals={2}
              className={`${inputBaseClass} w-32`}
              value={config.priceUsd}
              onValueChange={(priceUsd) =>
                setForm({
                  ...form,
                  configurations: form.configurations.map((c, i) =>
                    i === index ? { ...c, priceUsd } : c,
                  ),
                })
              }
              placeholder="출시가 ($)"
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
          {section.fields.map(renderSpecRow)}
          {section.title === "디스플레이" ? renderSubDisplays() : null}
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
