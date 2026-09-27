import type { Metadata } from "next";

import { CameraForm } from "@/components/cameras/camera-form";
import { listAdminBrands } from "@/lib/api/client";

export const metadata: Metadata = { title: "카메라 추가" };

export default async function NewCameraPage() {
  const brands = await listAdminBrands();

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">카메라 추가</h1>
      <CameraForm mode="create" brands={brands} />
    </div>
  );
}
