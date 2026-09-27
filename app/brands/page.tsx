import type { Metadata } from "next";

import { BrandManager } from "@/components/brands/brand-manager";
import { listAdminBrands } from "@/lib/api/client";

export const metadata: Metadata = { title: "브랜드 관리" };

export default async function BrandsPage() {
  const brands = await listAdminBrands();

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">브랜드 관리</h1>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        여기서 등록한 브랜드를 기기·카메라 추가 화면에서 선택할 수 있습니다.
      </p>
      <div className="mt-5">
        <BrandManager initialBrands={brands} />
      </div>
    </div>
  );
}
