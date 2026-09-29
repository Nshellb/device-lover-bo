import { ApiRequestError, deleteBrand, getAdminBrandById, updateBrand } from "@/lib/api/client";
import type { ApiBrandInput } from "@/lib/api/types";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const brand = await getAdminBrandById(id);
    if (!brand) {
      return Response.json(
        { error: { code: "not_found", message: "요청한 항목을 찾을 수 없습니다." } },
        { status: 404 },
      );
    }
    return Response.json(brand);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }

    return Response.json(
      { error: { code: "internal_error", message: "브랜드 정보를 불러오지 못했습니다." } },
      { status: 502 },
    );
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = (await request.json()) as ApiBrandInput;

  try {
    const brand = await updateBrand(id, payload);
    return Response.json(brand);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }

    return Response.json(
      { error: { code: "internal_error", message: "브랜드를 수정하지 못했습니다." } },
      { status: 502 },
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await deleteBrand(id);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }

    return Response.json(
      { error: { code: "internal_error", message: "브랜드를 삭제하지 못했습니다." } },
      { status: 502 },
    );
  }
}
