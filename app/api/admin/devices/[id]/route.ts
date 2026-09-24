import { ApiRequestError, getAdminDeviceById, updateDevice } from "@/lib/api/client";
import type { ApiDeviceWriteRequest } from "@/lib/api/types";

// Same-origin proxy so client components (the detail modal, edit form) can
// read/write by id — including drafts and archived devices, which the public
// GET /api/devices/[identifier] route can't see — without hitting the Rust
// API's CORS restrictions.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const device = await getAdminDeviceById(id);
    if (!device) {
      return Response.json(
        { error: { code: "not_found", message: "resource not found" } },
        { status: 404 },
      );
    }
    return Response.json(device);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }

    return Response.json(
      { error: { code: "internal_error", message: "기기 정보를 불러오지 못했습니다." } },
      { status: 502 },
    );
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = (await request.json()) as ApiDeviceWriteRequest;

  try {
    const device = await updateDevice(id, payload);
    return Response.json(device);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }

    return Response.json(
      { error: { code: "internal_error", message: "기기를 수정하지 못했습니다." } },
      { status: 502 },
    );
  }
}
