import type { Metadata } from "next";

import { DeviceForm } from "@/components/devices/device-form";

export const metadata: Metadata = { title: "기기 추가" };

export default function NewDevicePage() {
  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-zinc-950 dark:text-zinc-50">기기 추가</h1>
      <DeviceForm mode="create" />
    </div>
  );
}
