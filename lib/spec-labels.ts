// Matches the 26 keys in device-lover-api's src/catalog.rs SPEC_KEYS.
// Colors are no longer one of these generic keys — device-form.tsx has a
// dedicated colors section backed by the API's own `colors` field.
export const SPEC_FIELDS: { key: string; label: string }[] = [
  { key: "operatingSystem", label: "운영체제" },
  { key: "dimensions", label: "크기" },
  { key: "weight", label: "무게" },
  { key: "storage", label: "저장 용량" },
  { key: "stylus", label: "펜 지원" },
  { key: "displayPanel", label: "디스플레이 패널" },
  { key: "displaySize", label: "디스플레이 크기" },
  { key: "displayResolution", label: "해상도" },
  { key: "refreshRate", label: "재생률" },
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
  { key: "fastCharging", label: "급속 충전" },
  { key: "wirelessCharging", label: "무선 충전" },
  { key: "wireless", label: "무선 연결" },
  { key: "biometrics", label: "생체 인증" },
  { key: "waterResistance", label: "방수·방진" },
];

// Rendering order for device-form.tsx's spec input rows only — SPEC_FIELDS itself
// keeps its original order so device-detail-modal.tsx is unaffected. Flattens
// device-lover-web's src/features/devices/model/specification-sections.ts section
// order (first-seen position wins for keys repeated across sections, e.g.
// processor/memory/rearCameras/displaySize/biometrics/waterResistance). `stylus`
// has no standalone FO row (its value is folded into the displaySize description
// per catalog-design.md), so it's placed right after displaySize.
export const SPEC_FORM_ORDER: string[] = [
  "processor",
  "memory",
  "rearCameras",
  "displaySize",
  "stylus",
  "dimensions",
  "weight",
  "wiredConnection",
  "biometrics",
  "waterResistance",
  "speakers",
  "operatingSystem",
  "displayPanel",
  "displayResolution",
  "refreshRate",
  "displayFeatures",
  "storage",
  "telephoto",
  "digitalZoom",
  "frontCamera",
  "videoRecording",
  "batteryCapacity",
  "videoPlayback",
  "fastCharging",
  "wirelessCharging",
  "wireless",
];

export const SPEC_STATUSES = ["known", "unknown", "not_disclosed", "not_applicable"] as const;

export const SPEC_STATUS_LABELS: Record<(typeof SPEC_STATUSES)[number], string> = {
  known: "정보 있음",
  unknown: "정보 없음",
  not_disclosed: "제조사 미공개",
  not_applicable: "해당 없음",
};
