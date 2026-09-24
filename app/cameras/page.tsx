import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CameraTable } from "@/components/cameras/camera-table";
import { listAdminCameras } from "@/lib/api/client";
import type { ApiCameraSeries } from "@/lib/api/types";

export const metadata: Metadata = { title: "카메라관리" };

const PAGE_SIZE_OPTIONS = [30, 50, 100];
const SERIES_OPTIONS: { value: ApiCameraSeries; label: string }[] = [
  { value: "EOS 5D", label: "EOS 5D 시리즈" },
  { value: "EOS 6D", label: "EOS 6D 시리즈" },
  { value: "EOS x0D", label: "EOS 10D–90D" },
];

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: SearchParams[string]): string {
  return typeof value === "string" ? value : "";
}

export default async function CamerasPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const q = Array.from(single(params.q).replace(/\p{Cc}/gu, " ").trim()).slice(0, 100).join("");
  const series = SERIES_OPTIONS.find((option) => option.value === single(params.series))?.value;
  const requestedPage = Number(single(params.page));
  const page = Number.isInteger(requestedPage) && requestedPage >= 1 && requestedPage <= 10000 ? requestedPage : 1;
  const requestedPageSize = Number(single(params.pageSize));
  const pageSize = PAGE_SIZE_OPTIONS.includes(requestedPageSize) ? requestedPageSize : 30;
  const { items, pagination } = await listAdminCameras({ q, series, page, pageSize });

  function pageHref(nextPage: number) {
    const query = new URLSearchParams({ page: String(nextPage), pageSize: String(pageSize) });
    if (q) query.set("q", q);
    if (series) query.set("series", series);
    return `/cameras?${query.toString()}`;
  }

  if (page > Math.max(1, pagination.totalPages)) {
    redirect(pageHref(Math.max(1, pagination.totalPages)));
  }

  const inputClassName = "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200";

  return (
    <div>
      <h1 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">카메라관리</h1>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
        출시월은 일본 출시 기준이며, 무게는 배터리와 메모리 카드를 제외한 본체 기준입니다.
      </p>

      <form action="/cameras" method="get" className="my-5 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
          모델 검색
          <input key={q} type="search" name="q" defaultValue={q} maxLength={100} placeholder="예: 캐논 5D, EOS 90D" className={`${inputClassName} w-60`} />
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
          시리즈
          <select key={series ?? "all"} name="series" defaultValue={series ?? ""} className={inputClassName}>
            <option value="">전체 시리즈</option>
            {SERIES_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
          페이지당
          <select key={pageSize} name="pageSize" defaultValue={pageSize} className={inputClassName}>
            {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size}개씩 보기</option>)}
          </select>
        </label>
        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">조회</button>
        {q || series ? <Link href="/cameras" className="px-2 py-2 text-sm text-zinc-500 hover:underline dark:text-zinc-400">초기화</Link> : null}
      </form>

      <div className="mb-3 flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
        <p>총 {pagination.total}개</p>
        <p className="text-xs">출시월 최신순</p>
      </div>
      <CameraTable cameras={items} />

      {pagination.totalPages > 1 ? (
        <nav aria-label="카메라 목록 페이지" className="mt-4 flex items-center justify-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
          {page > 1 ? <Link href={pageHref(page - 1)} className="rounded-lg border border-zinc-300 px-3 py-1.5 dark:border-zinc-700">이전</Link> : null}
          <span>{page} / {pagination.totalPages}</span>
          {page < pagination.totalPages ? <Link href={pageHref(page + 1)} className="rounded-lg border border-zinc-300 px-3 py-1.5 dark:border-zinc-700">다음</Link> : null}
        </nav>
      ) : null}
    </div>
  );
}
