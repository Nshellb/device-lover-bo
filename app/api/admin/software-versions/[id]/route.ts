import {
  ApiRequestError,
  deleteSoftwareVersion,
  updateSoftwareVersion,
} from "@/lib/api/client";
import type { ApiSoftwareVersionInput } from "@/lib/api/types";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = (await request.json()) as ApiSoftwareVersionInput;
  try {
    return Response.json(await updateSoftwareVersion(id, payload));
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }
    return Response.json(
      { error: { code: "internal_error", message: "소프트웨어 버전을 수정하지 못했습니다." } },
      { status: 502 },
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deleteSoftwareVersion(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }
    return Response.json(
      { error: { code: "internal_error", message: "소프트웨어 버전을 삭제하지 못했습니다." } },
      { status: 502 },
    );
  }
}
