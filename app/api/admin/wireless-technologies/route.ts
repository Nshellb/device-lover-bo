import {
  ApiRequestError,
  createWirelessTechnology,
  listWirelessTechnologies,
} from "@/lib/api/client";
import type { ApiWirelessTechnologyInput } from "@/lib/api/types";

export async function GET() {
  try {
    return Response.json(await listWirelessTechnologies());
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }
    return Response.json(
      { error: { code: "internal_error", message: "무선 기술 목록을 불러오지 못했습니다." } },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const payload = (await request.json()) as ApiWirelessTechnologyInput;
  try {
    return Response.json(await createWirelessTechnology(payload), { status: 201 });
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }
    return Response.json(
      { error: { code: "internal_error", message: "무선 기술을 등록하지 못했습니다." } },
      { status: 502 },
    );
  }
}
