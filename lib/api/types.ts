// Mirrors the JSON contract served by device-lover-api (src/dto/catalog.rs).
// Field names are camelCase to match the API's #[serde(rename_all = "camelCase")] output.

export type ApiSpecValue = {
  value: string;
  detail: string | null;
  sourceId: string | null;
};

export type ApiPublicationStatus = "draft" | "published" | "archived";
export type ApiAdminDeviceSearchField = "name" | "model_number";
export type ApiAdminDeviceSort = "release_date_asc" | "release_date_desc";

export type ApiCatalogBrand = {
  slug: string;
  name: string;
};

// The full brand roster (unfiltered by category or device/camera existence),
// for the brand management page and the device/camera form's brand dropdown.
export type ApiAdminBrand = {
  id: string;
  slug: string;
  name: string;
};

export type ApiBrandInput = {
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
};

export type ApiDeviceColor = {
  id: string;
  name: string;
  imageUrl: string | null;
  colorCode: string | null;
  exclusive: boolean;
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

export type ApiDimension = {
  label: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  note: string | null;
};

export type ApiDeviceDetail = ApiDeviceSummary & {
  variant: string | null;
  configurations: ApiDeviceConfiguration[];
  dimensions: ApiDimension[];
  colors: ApiDeviceColor[];
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
// `series` is free text (product-line label, e.g. "NX", "EOS 5D") — no
// longer a closed Canon-only enum now that other brands can be added.
export type ApiCameraSeries = string;
export type ApiCameraType = "DSLR" | "mirrorless" | "compact";
export type ApiCameraSensorFormat = "full_frame" | "aps_c" | "micro_four_thirds" | "one_inch";

export type ApiCamera = {
  id: string;
  slug: string;
  brand: string;
  brandSlug: string;
  name: string;
  series: ApiCameraSeries;
  releaseMonth: string;
  cameraType: string;
  sensorFormat: ApiCameraSensorFormat;
  effectiveMegapixels: number;
  imageProcessor: string;
  // null for fixed-lens (compact) cameras — there's no interchangeable mount.
  lensMount: string | null;
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

export type ApiCameraWriteRequest = {
  brandSlug: string;
  brandName: string;
  slug: string;
  name: string;
  series: string;
  releaseMonth: string;
  cameraType: string;
  sensorFormat: ApiCameraSensorFormat;
  effectiveMegapixels: number;
  imageProcessor: string;
  lensMount: string | null;
  maxContinuousFps: number;
  continuousShootingNote: string | null;
  videoSpec: string;
  bodyWeightG: number;
  sourceUrl: string;
  sourceTitle: string;
  checkedAt: string;
};

export type ApiSpecInput = {
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
};

export type ApiColorInput = {
  name: string;
  imageUrl: string | null;
  colorCode: string | null;
  exclusive: boolean;
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
  dimensions: ApiDimension[];
  colors: ApiColorInput[];
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
