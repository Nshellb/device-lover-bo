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
  { key: "displaySize", label: "디스플레이" },
  { key: "displayResolution", label: "해상도" },
  { key: "refreshRate", label: "주사율" },
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
    keys: ["displayPanel", "displayResolution", "refreshRate", "displayFeatures"],
  },
  { title: "카메라", keys: ["telephoto", "digitalZoom", "frontCamera", "videoRecording"] },
  {
    title: "배터리와 충전",
    keys: ["batteryCapacity", "videoPlayback", "fastCharging", "wirelessCharging"],
  },
  { title: "연결과 내구성", keys: ["wireless"] },
];
