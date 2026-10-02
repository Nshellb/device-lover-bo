import type { Metadata } from "next";

import { WirelessTechnologyManager } from "@/components/wireless-technologies/wireless-technology-manager";
import { listWirelessTechnologies } from "@/lib/api/client";

export const metadata: Metadata = { title: "무선 연결 규격 관리" };

export default async function WirelessTechnologiesPage() {
  const technologies = await listWirelessTechnologies();

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">무선 연결 규격 관리</h1>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        통신 네트워크, 와이파이, 블루투스, UWB, NFC 선택 항목을 등록하고 관리합니다.
      </p>
      <div className="mt-5">
        <WirelessTechnologyManager initialTechnologies={technologies} />
      </div>
    </div>
  );
}
