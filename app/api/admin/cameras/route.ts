import { ApiRequestError, createCamera } from "@/lib/api/client";
import type { ApiCameraWriteRequest } from "@/lib/api/types";

// Same-origin proxy so the create-camera form (a client component) can POST
// without hitting the Rust API's CORS restrictions.
export async function POST(request: Request) {
  const payload = (await request.json()) as ApiCameraWriteRequest;

  try {
    const camera = await createCamera(payload);
    return Response.json(camera, { status: 201 });
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }

    return Response.json(
      { error: { code: "internal_error", message: "카메라를 생성하지 못했습니다." } },
      { status: 502 },
    );
  }
}
