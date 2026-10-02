// Matches device-lover-api's src/catalog.rs SPEC_KEYS, plus "virtual" rows that
// only position their dedicated editors in the form (VIRTUAL_SPEC_KEYS): they are
// stored in their own structured fields, not as spec rows.
// Colors are no longer one of these generic keys — device-form.tsx has a
// dedicated colors section backed by the API's own `colors` field.
export const SPEC_FIELDS: { key: string; label: string }[] = [
  { key: "operatingSystem", label: "운영체제" },
  { key: "dimensions", label: "크기" },
  { key: "weight", label: "무게" },
  { key: "materials", label: "소재" },
  { key: "storage", label: "저장 용량" },
  { key: "stylus", label: "펜 지원" },
  { key: "displayPanel", label: "디스플레이 패널" },
  { key: "displaySize", label: "디스플레이" },
  { key: "displayResolution", label: "해상도" },
  { key: "refreshRate", label: "주사율" },
  { key: "displayPeakBrightness", label: "피크 밝기" },
  { key: "displayLamination", label: "라미네이팅" },
  { key: "displayAntiReflective", label: "반사 방지" },
  { key: "displayFeatures", label: "디스플레이 기능" },
  { key: "processor", label: "프로세서 (AP)" },
  { key: "memory", label: "메모리" },
  { key: "wiredConnection", label: "유선 단자" },
  { key: "speakers", label: "스피커" },
  { key: "rearCameras", label: "후면 카메라" },
  { key: "telephoto", label: "망원" },
  { key: "digitalZoom", label: "디지털 줌" },
  { key: "frontCamera", label: "전면 카메라" },
  { key: "videoRecording", label: "동영상 촬영" },
  { key: "batteryCapacity", label: "배터리 용량" },
  { key: "videoPlayback", label: "동영상 재생" },
  { key: "fastCharging", label: "유선 충전" },
  { key: "wirelessCharging", label: "무선 충전" },
  { key: "sim", label: "SIM" },
  { key: "wireless", label: "무선 연결" },
  { key: "biometrics", label: "생체 인증" },
  { key: "waterResistance", label: "방수·방진" },
];

// Section grouping and row order for the spec rows in device-form.tsx and
// device-detail-modal.tsx, following device-lover-web's
// src/features/devices/model/specification-sections.ts top to bottom. FO repeats
// some keys across sections (processor, memory, rearCameras, displaySize,
// wiredConnection, biometrics, waterResistance), so each key is listed once at
// its first appearance. `stylus` sits right above operatingSystem.
export const SPEC_SECTIONS: { title: string; keys: string[] }[] = [
  {
    title: "기본 정보",
    keys: [
      "processor",
      "memory",
      "displaySize",
      "dimensions",
      "weight",
      "rearCameras",
      "wiredConnection",
      "biometrics",
      "waterResistance",
      "speakers",
      "stylus",
      "operatingSystem",
    ],
  },
  { title: "성능", keys: ["storage"] },
  {
    title: "디스플레이",
    keys: ["displayPanel", "displayResolution", "refreshRate", "displayPeakBrightness", "displayLamination", "displayAntiReflective", "displayFeatures"],
  },
  { title: "카메라", keys: ["telephoto", "digitalZoom", "frontCamera", "videoRecording"] },
  {
    title: "배터리와 충전",
    keys: ["batteryCapacity", "videoPlayback", "fastCharging", "wirelessCharging"],
  },
  { title: "연결과 내구성", keys: ["wireless", "sim"] },
  { title: "기타", keys: ["materials"] },
];

// Optional extra displays for foldables (device-lover-api's SUB_DISPLAY_KEY_GROUPS).
// Each sub display behaves like the main one: key `sub1DisplaySize` is edited
// like `displaySize`, `sub1RefreshRate` like `refreshRate`, and so on.
const SUB_DISPLAY_PARTS: { suffix: string; label: string }[] = [
  { suffix: "DisplayPanel", label: "패널" },
  { suffix: "DisplaySize", label: "디스플레이" },
  { suffix: "DisplayResolution", label: "해상도" },
  { suffix: "RefreshRate", label: "주사율" },
  { suffix: "PeakBrightness", label: "피크 밝기" },
  { suffix: "DisplayLamination", label: "라미네이팅" },
  { suffix: "DisplayAntiReflective", label: "반사 방지" },
  { suffix: "DisplayFeatures", label: "디스플레이 기능" },
];

export const VIRTUAL_SPEC_KEYS = new Set([
  "dimensions",
  "materials",
  "batteryCapacity",
  "fastCharging",
  "wirelessCharging",
]);

export const MAX_SUB_DISPLAYS = 2;

// Editable name of each sub display (optional on the API; the form always sets it).
export const subDisplayNameKey = (sub: number) => `sub${sub}DisplayName`;
// Stored without the trailing word; every view renders it as "<이름> 디스플레이".
export const defaultSubDisplayName = (sub: number) => `서브${sub}`;

export const SUB_DISPLAY_FIELDS: { key: string; label: string; sub: number }[] = [1, 2].flatMap(
  (sub) =>
    SUB_DISPLAY_PARTS.map(({ suffix, label }) => ({
      key: `sub${sub}${suffix}`,
      label: `서브${sub} ${label}`,
      sub,
    })),
);

// subNDisplaySize -> displaySize; plain keys are returned unchanged.
export function specKind(key: string): string {
  const kind = key.replace(/^sub\d(.)/, (_, first: string) => first.toLowerCase());
  return kind === "peakBrightness" ? "displayPeakBrightness" : kind;
}

// Sections for read-only views: SPEC_SECTIONS with the sub displays right after 디스플레이.
export const SUB_DISPLAY_SECTIONS: { title: string; keys: string[]; sub: number }[] = [1, 2].map((sub) => ({
  sub,
  title: `서브${sub} 디스플레이`,
  keys: SUB_DISPLAY_PARTS.map(({ suffix }) => `sub${sub}${suffix}`),
}));

export const SPEC_DETAIL_SECTIONS: { title: string; keys: string[]; sub?: number }[] = SPEC_SECTIONS.flatMap(
  (section) => (section.title === "디스플레이" ? [section, ...SUB_DISPLAY_SECTIONS] : [section]),
);
