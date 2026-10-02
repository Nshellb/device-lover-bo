import type { Metadata } from "next";

import { SoftwareVersionManager } from "@/components/software-versions/software-version-manager";
import { listSoftwareVersions } from "@/lib/api/client";

export const metadata: Metadata = { title: "운영체제 / UX 관리" };

export default async function SoftwareVersionsPage() {
  const versions = await listSoftwareVersions();

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">운영체제 / UX 관리</h1>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        운영체제(Android, iOS 등)와 UX(One UI 등) 버전을 등록하고 관리합니다. 정렬 순서는 오래된 버전일수록 작게 입력하세요.
      </p>
      <div className="mt-5">
        <SoftwareVersionManager initialVersions={versions} />
      </div>
    </div>
  );
}
