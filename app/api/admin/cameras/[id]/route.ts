import { ApiRequestError, getAdminCameraById, updateCamera } from "@/lib/api/client";
import type { ApiCameraWriteRequest } from "@/lib/api/types";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const camera = await getAdminCameraById(id);
    if (!camera) {
      return Response.json(
        { error: { code: "not_found", message: "resource not found" } },
        { status: 404 },
      );
    }
    return Response.json(camera);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }

    return Response.json(
      { error: { code: "internal_error", message: "카메라 정보를 불러오지 못했습니다." } },
      { status: 502 },
    );
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = (await request.json()) as ApiCameraWriteRequest;

  try {
    const camera = await updateCamera(id, payload);
    return Response.json(camera);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }

    return Response.json(
      { error: { code: "internal_error", message: "카메라를 수정하지 못했습니다." } },
      { status: 502 },
    );
  }
}
