import { ApiRequestError, createBrand, listAdminBrands } from "@/lib/api/client";
import type { ApiBrandInput } from "@/lib/api/types";

// Same-origin proxy so client components (the brand management page, the
// device/camera form's brand dropdown) can read/write without hitting the
// Rust API's CORS restrictions.
export async function GET() {
  try {
    const brands = await listAdminBrands();
    return Response.json(brands);
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }

    return Response.json(
      { error: { code: "internal_error", message: "브랜드 목록을 불러오지 못했습니다." } },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const payload = (await request.json()) as ApiBrandInput;

  try {
    const brand = await createBrand(payload);
    return Response.json(brand, { status: 201 });
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }

    return Response.json(
      { error: { code: "internal_error", message: "브랜드를 생성하지 못했습니다." } },
      { status: 502 },
    );
  }
}
