import type { Metadata } from "next";

import { DeviceForm } from "@/components/devices/device-form";
import { listAdminBrands, listSoftwareVersions, listWirelessTechnologies } from "@/lib/api/client";

export const metadata: Metadata = { title: "기기 추가" };

export default async function NewDevicePage() {
  const [brands, wirelessTechnologies, softwareVersions] = await Promise.all([
    listAdminBrands(),
    listWirelessTechnologies(),
    listSoftwareVersions(),
  ]);

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">기기 추가</h1>
      <DeviceForm mode="create" brands={brands} wirelessTechnologies={wirelessTechnologies}
        softwareVersions={softwareVersions} />
    </div>
  );
}
