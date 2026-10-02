import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DeviceForm } from "@/components/devices/device-form";
import {
  getAdminDeviceByIdOrSlug,
  listAdminBrands,
  listWirelessTechnologies,
} from "@/lib/api/client";

type EditDevicePageProps = {
  // Despite the folder name, this accepts either the device's id or its slug
  // — see getAdminDeviceByIdOrSlug.
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: EditDevicePageProps): Promise<Metadata> {
  const { id } = await params;
  const device = await getAdminDeviceByIdOrSlug(id);
  return { title: device ? `${device.name} 수정` : "기기 수정" };
}

export default async function EditDevicePage({ params }: EditDevicePageProps) {
  const { id } = await params;
  const [device, brands, wirelessTechnologies] = await Promise.all([
    getAdminDeviceByIdOrSlug(id),
    listAdminBrands(),
    listWirelessTechnologies(),
  ]);

  if (!device) {
    notFound();
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
        {device.name} 수정
      </h1>
      <DeviceForm
        mode="edit"
        device={device}
        brands={brands}
        wirelessTechnologies={wirelessTechnologies}
      />
    </div>
  );
}
