import { ApiRequestError, getDeviceByIdentifier } from "@/lib/api/client";

// Same-origin proxy so the device detail modal (a client component) can fetch
// full spec data without hitting the Rust API's CORS restrictions.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ identifier: string }> },
) {
  const { identifier } = await params;

  try {
    const device = await getDeviceByIdentifier(identifier);

    if (!device) {
      return Response.json(
        { error: { code: "not_found", message: "요청한 항목을 찾을 수 없습니다." } },
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
