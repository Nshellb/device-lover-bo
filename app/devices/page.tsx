import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DeviceListControls } from "@/components/devices/device-list-controls";
import { DeviceTable } from "@/components/devices/device-table";
import { listAdminDeviceBrands, listAdminDevices } from "@/lib/api/client";
import type {
  ApiAdminDeviceSearchField,
  ApiAdminDeviceSort,
  ApiPublicationStatus,
} from "@/lib/api/types";

export const metadata: Metadata = { title: "스마트폰 관리" };

const PAGE_SIZE_OPTIONS = [10, 30, 50, 100];
const PUBLICATION_STATUS_OPTIONS: { value: ApiPublicationStatus; label: string }[] = [
  { value: "draft", label: "초안" },
  { value: "published", label: "게시됨" },
  { value: "archived", label: "보관됨" },
];
const SEARCH_FIELD_OPTIONS: { value: ApiAdminDeviceSearchField; label: string }[] = [
  { value: "name", label: "기기명" },
  { value: "model_number", label: "모델번호" },
];
const SORT_OPTIONS: { value: ApiAdminDeviceSort; label: string }[] = [
  { value: "release_date_desc", label: "출시일 최신순" },
  { value: "release_date_asc", label: "출시일 오래된순" },
];

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: SearchParams[string]): string {
  return typeof value === "string" ? value : "";
}

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = Array.from(single(params.q).replace(/\p{Cc}/gu, " ").trim())
    .slice(0, 100)
    .join("");
  const searchField = SEARCH_FIELD_OPTIONS.find(
    (option) => option.value === single(params.searchField),
  )?.value ?? "name";
  const brandParam = single(params.brand);
  const brand = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(brandParam) ? brandParam : undefined;
  const publicationStatus = PUBLICATION_STATUS_OPTIONS.find(
    (option) => option.value === single(params.publicationStatus),
  )?.value;
  const sort = SORT_OPTIONS.find((option) => option.value === single(params.sort))?.value
    ?? "release_date_desc";
  const requestedPage = Number(single(params.page));
  const page = Number.isInteger(requestedPage) && requestedPage >= 1 && requestedPage <= 10_000
    ? requestedPage
    : 1;
  const requestedPageSize = Number(single(params.pageSize));
  const pageSize = PAGE_SIZE_OPTIONS.includes(requestedPageSize) ? requestedPageSize : 30;

  const [brands, { items, pagination }] = await Promise.all([
    listAdminDeviceBrands(),
    listAdminDevices({
      q,
      searchField,
      brand,
      publicationStatus,
      sort,
      page,
      pageSize,
    }),
  ]);

  function pageHref(nextPage: number) {
    const query = new URLSearchParams({
      page: String(nextPage),
      pageSize: String(pageSize),
      searchField,
      sort,
    });
    if (q) query.set("q", q);
    if (brand) query.set("brand", brand);
    if (publicationStatus) query.set("publicationStatus", publicationStatus);
    return `/devices?${query.toString()}`;
  }

  if (page > Math.max(1, pagination.totalPages)) {
    redirect(pageHref(Math.max(1, pagination.totalPages)));
  }

  const firstVisiblePage = Math.max(1, Math.min(page - 2, pagination.totalPages - 4));
  const visiblePages = Array.from(
    { length: Math.min(5, pagination.totalPages) },
    (_, index) => firstVisiblePage + index,
  );
  const hasFilters = Boolean(
    q || brand || publicationStatus || sort !== "release_date_desc" || pageSize !== 30,
  );
  const inputClassName =
    "rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200";

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">스마트폰 관리</h1>
        <Link
          href="/devices/new"
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
        >
          + 기기 추가
        </Link>
      </div>

      <form action="/devices" method="get" className="my-5 flex flex-wrap items-end gap-3">
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="pageSize" value={pageSize} />

        <label className="flex flex-col gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
          브랜드
          <select name="brand" defaultValue={brand ?? ""} className={inputClassName}>
            <option value="">전체 브랜드</option>
            {brands.map((option) => (
              <option key={option.slug} value={option.slug}>{option.name}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
          게시 상태
          <select
            name="publicationStatus"
            defaultValue={publicationStatus ?? ""}
            className={inputClassName}
          >
            <option value="">전체 상태</option>
            {PUBLICATION_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
          검색 기준
          <select name="searchField" defaultValue={searchField} className={inputClassName}>
            {SEARCH_FIELD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
          검색어
          <input
            type="search"
            name="q"
            defaultValue={q}
            maxLength={100}
            placeholder={searchField === "name" ? "예: Galaxy S24" : "예: SM-S921N"}
            className={`${inputClassName} w-56`}
          />
        </label>

        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          조회
        </button>
        {hasFilters ? (
          <Link
            href="/devices"
            className="px-2 py-2 text-sm text-zinc-500 hover:underline dark:text-zinc-400"
          >
            초기화
          </Link>
        ) : null}
      </form>

      <div className="mb-3 flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
        <p>총 {pagination.total}개</p>
        <DeviceListControls
          sort={sort}
          sortOptions={SORT_OPTIONS}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
        />
      </div>

      <DeviceTable devices={items} />

      {pagination.totalPages > 1 ? (
        <nav
          aria-label="스마트폰 목록 페이지"
          className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm text-zinc-600 dark:text-zinc-400"
        >
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 dark:border-zinc-700"
            >
              이전
            </Link>
          ) : null}
          {visiblePages.map((pageNumber) => (
            <Link
              key={pageNumber}
              href={pageHref(pageNumber)}
              aria-current={pageNumber === page ? "page" : undefined}
              className={pageNumber === page
                ? "rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white"
                : "rounded-lg border border-zinc-300 px-3 py-1.5 dark:border-zinc-700"}
            >
              {pageNumber}
            </Link>
          ))}
          {page < pagination.totalPages ? (
            <Link
              href={pageHref(page + 1)}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 dark:border-zinc-700"
            >
              다음
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
