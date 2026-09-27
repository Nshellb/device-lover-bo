// Matches the 26 keys in device-lover-api's src/catalog.rs SPEC_KEYS.
// `hint` is a one-line example of the "raw" JSON shape that key expects when
// status is "known" (see device-lover-api/docs/catalog-design.md section 3).
// Colors are no longer one of these generic keys — device-form.tsx has a
// dedicated colors section backed by the API's own `colors` field.
export const SPEC_FIELDS: { key: string; label: string; hint: string }[] = [
  { key: "operatingSystem", label: "운영체제", hint: '{"name":"Android","version":"14","skin":"One UI 6.1"}' },
  { key: "dimensions", label: "크기", hint: '{"heightMm":147,"widthMm":70.6,"depthMm":7.6}' },
  { key: "weight", label: "무게", hint: "167" },
  { key: "storage", label: "저장 용량", hint: '{"optionsGb":[256,512]}' },
  { key: "stylus", label: "펜 지원", hint: '{"supported":false}' },
  { key: "displayPanel", label: "디스플레이 패널", hint: '"Dynamic AMOLED 2X"' },
  { key: "displaySize", label: "디스플레이 크기", hint: '{"diagonalMm":156.4,"marketedInches":6.2}' },
  { key: "displayResolution", label: "해상도", hint: '{"widthPx":1080,"heightPx":2340,"ppi":425}' },
  { key: "refreshRate", label: "재생률", hint: '{"maxHz":120}' },
  { key: "displayFeatures", label: "디스플레이 기능", hint: '["Always On Display"]' },
  { key: "processor", label: "프로세서 (AP)", hint: '{"name":"Exynos 2400"}' },
  { key: "memory", label: "메모리", hint: '{"optionsGb":[8,12]}' },
  { key: "wiredConnection", label: "유선 단자", hint: '{"connector":"USB Type-C","protocol":"USB 3.2 Gen 1"}' },
  { key: "speakers", label: "스피커", hint: '{"layout":"스테레오","count":2}' },
  { key: "rearCameras", label: "후면 카메라", hint: '[{"role":"광각","megapixels":50}]' },
  { key: "telephoto", label: "망원", hint: '{"opticalZoomFactors":[3],"opticalQualityZoomFactors":[10]}' },
  { key: "digitalZoom", label: "디지털 줌", hint: "30" },
  { key: "frontCamera", label: "전면 카메라", hint: '{"megapixels":12,"aperture":2.2}' },
  { key: "videoRecording", label: "동영상 촬영", hint: '{"modes":[{"resolutionLabel":"8K","maxFps":30}]}' },
  { key: "batteryCapacity", label: "배터리 용량", hint: '{"mah":4000,"basis":"typical"}' },
  { key: "videoPlayback", label: "동영상 재생", hint: "29" },
  { key: "fastCharging", label: "급속 충전", hint: '{"maxW":25}' },
  { key: "wirelessCharging", label: "무선 충전", hint: '{"supported":true,"maxW":15}' },
  { key: "wireless", label: "무선 연결", hint: '{"cellular":["5G"],"wifi":["Wi-Fi 6E"],"bluetooth":"5.3"}' },
  { key: "biometrics", label: "생체 인증", hint: '["지문 인식","얼굴 인식"]' },
  { key: "waterResistance", label: "방수·방진", hint: '{"rating":"IP68","maxDepthM":1.5,"maxDurationMinutes":30}' },
];

export const SPEC_STATUSES = ["known", "unknown", "not_disclosed", "not_applicable"] as const;

export const SPEC_STATUS_LABELS: Record<(typeof SPEC_STATUSES)[number], string> = {
  known: "정보 있음",
  unknown: "정보 없음",
  not_disclosed: "제조사 미공개",
  not_applicable: "해당 없음",
};
