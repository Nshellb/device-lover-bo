// Mirrors the JSON contract served by device-lover-api (src/dto/catalog.rs).
// Field names are camelCase to match the API's #[serde(rename_all = "camelCase")] output.

export type ApiSpecStatus = "known" | "unknown" | "not_disclosed" | "not_applicable";

export type ApiSpecValue = {
  status: ApiSpecStatus;
  raw: unknown;
  value: string;
  detail: string | null;
  muted: boolean;
  sourceId: string | null;
};

export type ApiPublicationStatus = "draft" | "published" | "archived";
export type ApiAdminDeviceSearchField = "name" | "model_number";
export type ApiAdminDeviceSort = "release_date_asc" | "release_date_desc";

export type ApiCatalogBrand = {
  slug: string;
  name: string;
};

export type ApiDeviceSummary = {
  id: string;
  slug: string;
  category: string;
  brand: string;
  brandSlug: string;
  name: string;
  releaseDate: string;
  marketCode: string;
  aliases: string[];
  modelNumbers: string[];
  imageUrl: string | null;
  publicationStatus: ApiPublicationStatus;
};

export type ApiDeviceConfiguration = {
  id: string;
  label: string;
  storageGb: number;
  ramGb: number | null;
  ramStatus: string;
};

export type ApiDeviceSource = {
  id: string;
  url: string;
  title: string;
  checkedAt: string | null;
  isPrimary: boolean;
};

export type ApiAliasDetail = {
  value: string;
  kind: "alias" | "model_number" | "hardware_identifier";
};

export type ApiDeviceDetail = ApiDeviceSummary & {
  variant: string | null;
  configurations: ApiDeviceConfiguration[];
  sourceUrl: string;
  sources: ApiDeviceSource[];
  specs: Record<string, ApiSpecValue>;
  updatedAt: string;
  launchVideoUrl: string | null;
  aliasDetails: ApiAliasDetail[];
};

export type ApiPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ApiDeviceListResponse = {
  items: ApiDeviceSummary[];
  pagination: ApiPagination;
};

// Mirrors the BO-only camera contract in device-lover-api/src/dto/camera.rs.
export type ApiCameraSeries = "EOS 5D" | "EOS 6D" | "EOS x0D";

export type ApiCamera = {
  id: string;
  slug: string;
  brand: string;
  brandSlug: string;
  name: string;
  series: ApiCameraSeries;
  releaseMonth: string;
  cameraType: string;
  sensorFormat: "full_frame" | "aps_c";
  effectiveMegapixels: number;
  imageProcessor: string;
  lensMount: string;
  maxContinuousFps: number;
  continuousShootingNote: string | null;
  videoSpec: string;
  bodyWeightG: number;
  sourceUrl: string;
  sourceTitle: string;
  checkedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiCameraListResponse = {
  items: ApiCamera[];
  pagination: ApiPagination;
};

export type ApiSpecInput = {
  status: ApiSpecStatus;
  raw: unknown;
  value: string;
  detail: string | null;
};

export type ApiAliasInput = {
  value: string;
  kind: "alias" | "model_number" | "hardware_identifier";
};

export type ApiSourceInput = {
  url: string;
  title: string;
  checkedAt: string | null;
  isPrimary: boolean;
};

export type ApiConfigurationInput = {
  label: string;
  storageGb: number;
  ramGb: number | null;
  ramStatus: string;
};

export type ApiDeviceWriteRequest = {
  brandSlug: string;
  brandName: string;
  slug: string;
  name: string;
  releaseDate: string;
  variant: string | null;
  imageUrl: string | null;
  launchVideoUrl: string | null;
  publicationStatus: ApiPublicationStatus;
  aliases: ApiAliasInput[];
  sources: ApiSourceInput[];
  configurations: ApiConfigurationInput[];
  specs: Record<string, ApiSpecInput>;
};

export type ApiErrorCode =
  | "validation_error"
  | "not_found"
  | "internal_error"
  | "database_unavailable"
  | "unauthorized"
  | "conflict"
  | "unknown_error";

export type ApiErrorEnvelope = {
  error: {
    code: ApiErrorCode;
    message: string;
  };
};
