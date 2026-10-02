import { toKoreanErrorMessage } from "@/lib/api/error-messages";
import type {
  ApiAdminBrand,
  ApiAdminDeviceSearchField,
  ApiAdminDeviceSort,
  ApiBrandInput,
  ApiCamera,
  ApiCameraListResponse,
  ApiCameraSeries,
  ApiCameraWriteRequest,
  ApiCatalogBrand,
  ApiDeviceDetail,
  ApiDeviceListResponse,
  ApiDeviceWriteRequest,
  ApiErrorEnvelope,
  ApiPublicationStatus,
  ApiWirelessTechnology,
  ApiWirelessTechnologyInput,
} from "@/lib/api/types";

// Server-only: this calls the Rust API directly (device-lover-api has no CORS
// layer), so it must only run in Server Components or Route Handlers. Client
// components go through this app's own Route Handlers under app/api/* instead.
const API_BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:4040";
const REVALIDATE_SECONDS = 30;

export class ApiRequestError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

function buildUrl(path: string, params?: Record<string, string | undefined>): URL {
  const url = new URL(path, API_BASE_URL);

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) url.searchParams.set(key, value);
  }

  return url;
}

async function apiFetch<T>(
  path: string,
  params?: Record<string, string | undefined>,
  options?:
    | { method: "POST" | "PUT"; body: unknown }
    | { noStore: true },
): Promise<T> {
  const url = buildUrl(path, params);
  const response = await fetch(
    url,
    options && "method" in options
      ? {
          method: options.method,
          headers: { "content-type": "application/json" },
          body: JSON.stringify(options.body),
          cache: "no-store",
        }
      : options && "noStore" in options
        ? { cache: "no-store" }
        : { next: { revalidate: REVALIDATE_SECONDS } },
  );

  if (!response.ok) {
    await throwApiRequestError(path, response);
  }

  return response.json() as Promise<T>;
}

// Same error handling as apiFetch, but for a DELETE whose success response
// (204) has no body to parse.
async function apiDelete(path: string): Promise<void> {
  const response = await fetch(buildUrl(path), { method: "DELETE", cache: "no-store" });
  if (!response.ok) {
    await throwApiRequestError(path, response);
  }
}

async function throwApiRequestError(path: string, response: Response): Promise<never> {
  let code = "unknown_error";
  let message = `API request to ${path} failed with status ${response.status}`;

  try {
    const body = (await response.json()) as ApiErrorEnvelope;
    code = body.error?.code ?? code;
    message = body.error?.message ?? message;
  } catch {
    // Non-JSON error body (e.g. 408 timeout) — keep the default message.
  }

  throw new ApiRequestError(response.status, code, toKoreanErrorMessage(code, message));
}

export async function listDevices(params: { page?: number; pageSize?: number } = {}): Promise<ApiDeviceListResponse> {
  return apiFetch<ApiDeviceListResponse>("/api/v1/devices", {
    page: params.page?.toString(),
    page_size: params.pageSize?.toString(),
  });
}

export async function getDeviceByIdentifier(identifier: string): Promise<ApiDeviceDetail | null> {
  try {
    return await apiFetch<ApiDeviceDetail>(`/api/v1/devices/${encodeURIComponent(identifier)}`);
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null;
    throw error;
  }
}

// Admin reads bypass the public "is this ready to show?" gate, so drafts and
// archived devices are visible too — device-lover-web's endpoints never show
// these. They also skip the response cache: an admin who just saved a change
// expects to see it immediately, not up to REVALIDATE_SECONDS later.
export async function listAdminDevices(
  params: {
    q?: string;
    searchField?: ApiAdminDeviceSearchField;
    brand?: string;
    publicationStatus?: ApiPublicationStatus;
    sort?: ApiAdminDeviceSort;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<ApiDeviceListResponse> {
  return apiFetch<ApiDeviceListResponse>(
    "/api/v1/admin/devices",
    {
      q: params.q || undefined,
      search_field: params.searchField,
      brand: params.brand,
      publication_status: params.publicationStatus,
      sort: params.sort,
      page: params.page?.toString(),
      page_size: params.pageSize?.toString(),
    },
    { noStore: true },
  );
}

export async function listAdminDeviceBrands(): Promise<ApiCatalogBrand[]> {
  return apiFetch<ApiCatalogBrand[]>(
    "/api/v1/admin/device-brands",
    undefined,
    { noStore: true },
  );
}

export async function listAdminCameras(
  params: { q?: string; series?: ApiCameraSeries; page?: number; pageSize?: number } = {},
): Promise<ApiCameraListResponse> {
  return apiFetch<ApiCameraListResponse>(
    "/api/v1/admin/cameras",
    {
      q: params.q || undefined,
      series: params.series,
      page: params.page?.toString(),
      page_size: params.pageSize?.toString(),
    },
    { noStore: true },
  );
}

export async function getAdminDeviceById(id: string): Promise<ApiDeviceDetail | null> {
  try {
    return await apiFetch<ApiDeviceDetail>(
      `/api/v1/devices/by-id/${encodeURIComponent(id)}`,
      undefined,
      { noStore: true },
    );
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null;
    throw error;
  }
}

// Exact slug match only, any publication status — powers the /{slug}/edit
// shortcut route, which (unlike the public identifier resolver) must also
// find drafts and archived devices.
export async function getAdminDeviceBySlug(slug: string): Promise<ApiDeviceDetail | null> {
  try {
    return await apiFetch<ApiDeviceDetail>(
      `/api/v1/devices/by-slug/${encodeURIComponent(slug)}`,
      undefined,
      { noStore: true },
    );
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null;
    throw error;
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Accepts either the device's internal id or its slug — the edit routes take
// either one interchangeably, so callers don't need to know which they have.
export async function getAdminDeviceByIdOrSlug(value: string): Promise<ApiDeviceDetail | null> {
  return UUID_PATTERN.test(value) ? getAdminDeviceById(value) : getAdminDeviceBySlug(value);
}

export async function createDevice(payload: ApiDeviceWriteRequest): Promise<ApiDeviceDetail> {
  return apiFetch<ApiDeviceDetail>("/api/v1/devices", undefined, { method: "POST", body: payload });
}

export async function updateDevice(id: string, payload: ApiDeviceWriteRequest): Promise<ApiDeviceDetail> {
  return apiFetch<ApiDeviceDetail>(`/api/v1/devices/by-id/${encodeURIComponent(id)}`, undefined, {
    method: "PUT",
    body: payload,
  });
}

// Full, unfiltered brand roster (unlike listAdminDeviceBrands, which only
// returns brands that already have a smartphone) — for the brand management
// page and the device/camera form's brand dropdown.
export async function listAdminBrands(): Promise<ApiAdminBrand[]> {
  return apiFetch<ApiAdminBrand[]>("/api/v1/brands", undefined, { noStore: true });
}

export async function getAdminBrandById(id: string): Promise<ApiAdminBrand | null> {
  try {
    return await apiFetch<ApiAdminBrand>(
      `/api/v1/brands/${encodeURIComponent(id)}`,
      undefined,
      { noStore: true },
    );
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null;
    throw error;
  }
}

export async function createBrand(payload: ApiBrandInput): Promise<ApiAdminBrand> {
  return apiFetch<ApiAdminBrand>("/api/v1/brands", undefined, { method: "POST", body: payload });
}

export async function updateBrand(id: string, payload: ApiBrandInput): Promise<ApiAdminBrand> {
  return apiFetch<ApiAdminBrand>(`/api/v1/brands/${encodeURIComponent(id)}`, undefined, {
    method: "PUT",
    body: payload,
  });
}

export async function deleteBrand(id: string): Promise<void> {
  return apiDelete(`/api/v1/brands/${encodeURIComponent(id)}`);
}

export async function listWirelessTechnologies(): Promise<ApiWirelessTechnology[]> {
  return apiFetch<ApiWirelessTechnology[]>(
    "/api/v1/wireless-technologies",
    undefined,
    { noStore: true },
  );
}

export async function createWirelessTechnology(
  payload: ApiWirelessTechnologyInput,
): Promise<ApiWirelessTechnology> {
  return apiFetch<ApiWirelessTechnology>("/api/v1/wireless-technologies", undefined, {
    method: "POST",
    body: payload,
  });
}

export async function updateWirelessTechnology(
  id: string,
  payload: ApiWirelessTechnologyInput,
): Promise<ApiWirelessTechnology> {
  return apiFetch<ApiWirelessTechnology>(
    `/api/v1/wireless-technologies/${encodeURIComponent(id)}`,
    undefined,
    { method: "PUT", body: payload },
  );
}

export async function deleteWirelessTechnology(id: string): Promise<void> {
  return apiDelete(`/api/v1/wireless-technologies/${encodeURIComponent(id)}`);
}

export async function getAdminCameraById(id: string): Promise<ApiCamera | null> {
  try {
    return await apiFetch<ApiCamera>(
      `/api/v1/cameras/by-id/${encodeURIComponent(id)}`,
      undefined,
      { noStore: true },
    );
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return null;
    throw error;
  }
}

export async function createCamera(payload: ApiCameraWriteRequest): Promise<ApiCamera> {
  return apiFetch<ApiCamera>("/api/v1/cameras", undefined, { method: "POST", body: payload });
}

export async function updateCamera(id: string, payload: ApiCameraWriteRequest): Promise<ApiCamera> {
  return apiFetch<ApiCamera>(`/api/v1/cameras/by-id/${encodeURIComponent(id)}`, undefined, {
    method: "PUT",
    body: payload,
  });
}
