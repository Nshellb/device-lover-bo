import {
  ApiRequestError,
  createSoftwareVersion,
  listSoftwareVersions,
} from "@/lib/api/client";
import type { ApiSoftwareVersionInput } from "@/lib/api/types";

export async function GET() {
  try {
    return Response.json(await listSoftwareVersions());
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }
    return Response.json(
      { error: { code: "internal_error", message: "소프트웨어 버전 목록을 불러오지 못했습니다." } },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const payload = (await request.json()) as ApiSoftwareVersionInput;
  try {
    return Response.json(await createSoftwareVersion(payload), { status: 201 });
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }
    return Response.json(
      { error: { code: "internal_error", message: "소프트웨어 버전을 등록하지 못했습니다." } },
      { status: 502 },
    );
  }
}
