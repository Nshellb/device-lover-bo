"use client";

import { useState } from "react";

import { DeviceDetailModal } from "@/components/devices/device-detail-modal";
import type { ApiDeviceSummary } from "@/lib/api/types";

const PUBLICATION_STATUS_LABELS: Record<string, string> = {
  draft: "초안",
  published: "게시됨",
  archived: "보관됨",
};

export function DeviceTable({ devices }: { devices: ApiDeviceSummary[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-semibold text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-semibold">이미지</th>
              <th className="px-4 py-3 font-semibold">브랜드</th>
              <th className="px-4 py-3 font-semibold">기기명</th>
              <th className="px-4 py-3 font-semibold">모델 번호</th>
              <th className="px-4 py-3 font-semibold">출시일</th>
              <th className="px-4 py-3 font-semibold">상태</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {devices.map((device) => (
              <tr key={device.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                <td className="px-4 py-2.5">
                  {device.imageUrl ? (
                    // Admin-entered imageUrl has no host restriction (see BO's
                    // device form), so it won't generally match next.config.ts's
                    // images.remotePatterns allowlist — plain <img> instead of
                    // next/image avoids that hostname check.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={device.imageUrl}
                      alt=""
                      width={36}
                      height={36}
                      className="size-9 object-contain"
                    />
                  ) : (
                    <div className="size-9 rounded bg-zinc-100 dark:bg-zinc-800" />
                  )}
                </td>
                <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">{device.brand}</td>
                <td className="px-4 py-2.5 font-medium text-zinc-950 dark:text-zinc-50">
                  {device.name}
                </td>
                <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                  {device.modelNumbers.join(", ") || "-"}
                </td>
                <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                  {device.releaseDate}
                </td>
                <td className="px-4 py-2.5">
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {PUBLICATION_STATUS_LABELS[device.publicationStatus] ?? device.publicationStatus}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => setSelectedId(device.id)}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-950 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-50"
                  >
                    상세보기
                  </button>
                </td>
              </tr>
            ))}
            {devices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
                  등록된 기기가 없습니다.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {selectedId ? (
        <DeviceDetailModal id={selectedId} onClose={() => setSelectedId(null)} />
      ) : null}
    </>
  );
}
