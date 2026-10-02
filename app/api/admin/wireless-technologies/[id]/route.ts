import {
  ApiRequestError,
  deleteWirelessTechnology,
  updateWirelessTechnology,
} from "@/lib/api/client";
import type { ApiWirelessTechnologyInput } from "@/lib/api/types";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = (await request.json()) as ApiWirelessTechnologyInput;
  try {
    return Response.json(await updateWirelessTechnology(id, payload));
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }
    return Response.json(
      { error: { code: "internal_error", message: "무선 기술을 수정하지 못했습니다." } },
      { status: 502 },
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deleteWirelessTechnology(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }
    return Response.json(
      { error: { code: "internal_error", message: "무선 기술을 삭제하지 못했습니다." } },
      { status: 502 },
    );
  }
}
