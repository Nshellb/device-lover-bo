import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DeviceForm } from "@/components/devices/device-form";
import {
  getAdminDeviceByIdOrSlug,
  listAdminBrands,
  listSoftwareVersions,
  listWirelessTechnologies,
} from "@/lib/api/client";

// A shorter alternative to /devices/[id]/edit — lets you jump straight to
// e.g. /galaxy-s24/edit, or /{id}/edit, without going through /devices first.
type EditBySlugPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: EditBySlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  const device = await getAdminDeviceByIdOrSlug(slug);
  return { title: device ? `${device.name} 수정` : "기기 수정" };
}

export default async function EditBySlugPage({ params }: EditBySlugPageProps) {
  const { slug } = await params;
  const [device, brands, wirelessTechnologies, softwareVersions] = await Promise.all([
    getAdminDeviceByIdOrSlug(slug),
    listAdminBrands(),
    listWirelessTechnologies(),
    listSoftwareVersions(),
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
        softwareVersions={softwareVersions}
      />
    </div>
  );
}
