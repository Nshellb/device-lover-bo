import { ApiRequestError, createDevice } from "@/lib/api/client";
import type { ApiDeviceWriteRequest } from "@/lib/api/types";

// Same-origin proxy so the create-device form (a client component) can POST
// without hitting the Rust API's CORS restrictions.
export async function POST(request: Request) {
  const payload = (await request.json()) as ApiDeviceWriteRequest;

  try {
    const device = await createDevice(payload);
    return Response.json(device, { status: 201 });
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }

    return Response.json(
      { error: { code: "internal_error", message: "기기를 생성하지 못했습니다." } },
      { status: 502 },
    );
  }
}
