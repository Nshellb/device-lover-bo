"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { ApiAdminDeviceSort } from "@/lib/api/types";

type SortOption = { value: ApiAdminDeviceSort; label: string };

export function DeviceListControls({
  sort,
  sortOptions,
  pageSize,
  pageSizeOptions,
}: {
  sort: ApiAdminDeviceSort;
  sortOptions: SortOption[];
  pageSize: number;
  pageSizeOptions: number[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(name: "sort" | "pageSize", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set(name, value);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  const selectClassName =
    "rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200";

  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="출시일 정렬"
        value={sort}
        onChange={(event) => updateParam("sort", event.target.value)}
        className={selectClassName}
      >
        {sortOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      <select
        aria-label="페이지당 표시 개수"
        value={pageSize}
        onChange={(event) => updateParam("pageSize", event.target.value)}
        className={selectClassName}
      >
        {pageSizeOptions.map((option) => (
          <option key={option} value={option}>{option}개씩 보기</option>
        ))}
      </select>
    </div>
  );
}
