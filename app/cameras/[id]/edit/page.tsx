import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CameraForm } from "@/components/cameras/camera-form";
import { getAdminCameraById, listAdminBrands } from "@/lib/api/client";

type EditCameraPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: EditCameraPageProps): Promise<Metadata> {
  const { id } = await params;
  const camera = await getAdminCameraById(id);
  return { title: camera ? `${camera.name} 수정` : "카메라 수정" };
}

export default async function EditCameraPage({ params }: EditCameraPageProps) {
  const { id } = await params;
  const [camera, brands] = await Promise.all([
    getAdminCameraById(id),
    listAdminBrands(),
  ]);

  if (!camera) {
    notFound();
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        {camera.name} 수정
      </h1>
      <CameraForm mode="edit" camera={camera} brands={brands} />
    </div>
  );
}
