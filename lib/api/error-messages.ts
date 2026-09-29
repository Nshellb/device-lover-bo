import { SPEC_FIELDS } from "@/lib/spec-labels";

const FIELD_LABELS: Record<string, string> = {
  brandSlug: "브랜드 슬러그",
  brandName: "브랜드 이름",
  slug: "슬러그",
  name: "이름",
  series: "시리즈",
  imageProcessor: "이미지 프로세서",
  videoSpec: "동영상 사양",
  sourceTitle: "출처 제목",
  releaseMonth: "출시월",
  cameraType: "카메라 종류",
  sensorFormat: "센서 포맷",
  lensMount: "렌즈 마운트",
  effectiveMegapixels: "유효 화소",
  maxContinuousFps: "최대 연속 촬영 속도",
  bodyWeightG: "바디 무게",
  publicationStatus: "공개 상태",
};

const SPEC_LABEL_MAP = new Map(SPEC_FIELDS.map((field) => [field.key, field.label]));

const fieldLabel = (key: string) => FIELD_LABELS[key] ?? key;
const specLabel = (key: string) => SPEC_LABEL_MAP.get(key) ?? key;

const EXACT: Record<string, string> = {
  "resource not found": "요청한 항목을 찾을 수 없습니다.",
  "authentication required or invalid credentials": "인증이 필요하거나 인증 정보가 올바르지 않습니다.",
  "database unavailable": "데이터베이스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
  "internal server error": "서버 내부 오류가 발생했습니다.",
  "category must be smartphone": "카테고리는 스마트폰이어야 합니다.",
  "publicationStatus must be draft, published, or archived":
    "공개 상태는 초안, 공개, 보관 중 하나여야 합니다.",
  "alias kind must be alias, model_number, or hardware_identifier":
    "별칭 종류는 별칭, 모델 번호, 하드웨어 식별자 중 하나여야 합니다.",
  "alias value must not be empty": "별칭 값은 비워둘 수 없습니다.",
  "configuration ramGb must be present only when ramStatus is known":
    "구성의 RAM 용량은 RAM 상태가 '확인됨'일 때만 입력해야 합니다.",
  "configuration storageGb must be positive": "구성의 저장 용량은 0보다 커야 합니다.",
  "color name must not be empty": "색상 이름은 비워둘 수 없습니다.",
  "only one source may be marked primary": "대표 출처는 하나만 지정할 수 있습니다.",
  "source title must not be empty": "출처 제목은 비워둘 수 없습니다.",
  "releaseMonth must match YYYY-MM": "출시월은 YYYY-MM 형식이어야 합니다.",
  "cameraType must be DSLR, mirrorless, or compact":
    "카메라 종류는 DSLR, 미러리스, 컴팩트 중 하나여야 합니다.",
  "sensorFormat must be full_frame, aps_c, micro_four_thirds, or one_inch":
    "센서 포맷은 풀프레임, APS-C, 마이크로 포서즈, 1인치 중 하나여야 합니다.",
  "lensMount must not be empty when present": "렌즈 마운트는 입력하는 경우 비워둘 수 없습니다.",
  "effectiveMegapixels must be a positive, finite number": "유효 화소는 0보다 큰 유한한 숫자여야 합니다.",
  "maxContinuousFps must be a positive, finite number":
    "최대 연속 촬영 속도는 0보다 큰 유한한 숫자여야 합니다.",
  "bodyWeightG must be positive": "바디 무게는 0보다 커야 합니다.",
  "email already exists": "이미 사용 중인 이메일입니다.",
};

const PATTERNS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [/^(\w+) must be a lowercase slug$/, (m) => `${fieldLabel(m[1])}은(는) 영문 소문자, 숫자, 하이픈으로 된 슬러그여야 합니다.`],
  [/^(\w+) must not be empty$/, (m) => `${fieldLabel(m[1])}은(는) 비워둘 수 없습니다.`],
  [/^specs must include exactly the (\d+) known keys for category .+$/, (m) => `사양 항목은 정해진 ${m[1]}개 항목이 모두 있어야 합니다.`],
  [/^spec (\w+): invalid status$/, (m) => `사양 '${specLabel(m[1])}'의 상태가 올바르지 않습니다.`],
  [/^spec (\w+): value must not be empty$/, (m) => `사양 '${specLabel(m[1])}'의 값은 비워둘 수 없습니다.`],
  [/^duplicate color name: (.+)$/, (m) => `색상 이름이 중복되었습니다: ${m[1]}`],
  [/^spec (\w+): raw must be present only when status is known$/, (m) => `사양 '${specLabel(m[1])}': 상태가 '확인됨'일 때만 세부 값(raw)을 입력할 수 있습니다. 상태가 확인됨이 아니라면 세부 값을 비워주세요.`],
  [/^spec (\w+): raw must be present when status is known$/, (m) => `사양 '${specLabel(m[1])}': 상태가 '확인됨'이면 세부 값(raw)이 필요합니다.`],
  [/^spec (\w+): (.+)$/, (m) => `사양 '${specLabel(m[1])}' 오류: ${m[2]}`],
  [/^duplicate key value violates unique constraint "(.+)"$/, (m) => `이미 존재하는 값입니다. (중복 제약: ${m[1]})`],
  [/^null value in column "(.+?)".* violates not-null constraint$/, (m) => `필수 값이 비어 있습니다. (항목: ${m[1]})`],
  [/^new row for relation "(.+?)" violates check constraint "(.+)"$/, (m) => `입력값이 허용 범위를 벗어났습니다. (테이블: ${m[1]}, 제약: ${m[2]})`],
  [/^insert or update on table "(.+?)" violates foreign key constraint "(.+)"$/, (m) => `연결된 항목이 존재하지 않습니다. (테이블: ${m[1]}, 제약: ${m[2]})`],
  [/^(\w+) must be an integer$/, (m) => `${fieldLabel(m[1])}은(는) 정수여야 합니다.`],
];

// Translates the Rust API's English error messages into Korean for the admin
// UI. Unknown messages are returned as-is so nothing is ever swallowed.
export function translateApiErrorMessage(message: string): string {
  const exact = EXACT[message];
  if (exact) return exact;

  for (const [pattern, format] of PATTERNS) {
    const match = message.match(pattern);
    if (match) return format(match);
  }

  return message;
}

const FALLBACK_BY_CODE: Record<string, string> = {
  validation_error: "입력값이 올바르지 않습니다.",
  conflict: "이미 존재하는 값과 충돌합니다. (슬러그 등 중복 여부를 확인해주세요.)",
  not_found: "요청한 항목을 찾을 수 없습니다.",
  unauthorized: "인증이 필요하거나 인증 정보가 올바르지 않습니다.",
  database_unavailable: "데이터베이스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.",
  internal_error: "서버 내부 오류가 발생했습니다.",
  unknown_error: "요청을 처리하지 못했습니다.",
};

// Like translateApiErrorMessage, but a message that stays untranslated (still
// English, e.g. a raw Postgres constraint error or a JSON body rejection)
// falls back to a generic Korean message chosen by error code, with the
// original text appended so the cause is still visible.
export function toKoreanErrorMessage(code: string, message: string): string {
  const translated = translateApiErrorMessage(message);
  if (translated !== message || /[가-힣]/.test(message)) return translated;
  const fallback = FALLBACK_BY_CODE[code] ?? FALLBACK_BY_CODE.unknown_error;
  return message ? `${fallback} (${message})` : fallback;
}
