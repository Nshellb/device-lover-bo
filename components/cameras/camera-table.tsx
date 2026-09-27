import Link from "next/link";

import type { ApiCamera } from "@/lib/api/types";

const SENSOR_LABELS = {
  full_frame: "풀프레임",
  aps_c: "APS-C",
  micro_four_thirds: "마이크로 포서드",
  one_inch: "1형",
};

export function CameraTable({ cameras }: { cameras: ApiCamera[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[1200px] text-left text-sm">
        <caption className="sr-only">카메라 모델별 주요 사양과 공식 출처</caption>
        <thead className="bg-zinc-50 text-xs font-semibold text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
          <tr>
            {["브랜드", "모델명", "출시월", "센서", "유효 화소", "이미지 프로세서", "렌즈 마운트", "최대 연사", "동영상", "본체 무게", "출처", ""].map((label) => (
              <th key={label} scope="col" className="whitespace-nowrap px-4 py-3 font-semibold">{label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 text-zinc-600 dark:divide-zinc-800 dark:text-zinc-400">
          {cameras.map((camera) => (
            <tr key={camera.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
              <td className="px-4 py-3">{camera.brand}</td>
              <th scope="row" className="whitespace-nowrap px-4 py-3 font-medium text-zinc-950 dark:text-zinc-50">
                {camera.name}
                <span className="mt-0.5 block text-xs font-normal text-zinc-500 dark:text-zinc-400">
                  {camera.series === "EOS x0D" ? "EOS 10D–90D" : camera.series} · {camera.cameraType}
                </span>
              </th>
              <td className="whitespace-nowrap px-4 py-3 tabular-nums">{camera.releaseMonth}</td>
              <td className="whitespace-nowrap px-4 py-3">{SENSOR_LABELS[camera.sensorFormat]}</td>
              <td className="whitespace-nowrap px-4 py-3 tabular-nums">{camera.effectiveMegapixels} MP</td>
              <td className="whitespace-nowrap px-4 py-3">{camera.imageProcessor}</td>
              <td className="whitespace-nowrap px-4 py-3">{camera.lensMount ?? "—"}</td>
              <td className="px-4 py-3">
                <span className="whitespace-nowrap tabular-nums">{camera.maxContinuousFps} fps</span>
                {camera.continuousShootingNote ? (
                  <span className="mt-1 block min-w-40 text-xs">{camera.continuousShootingNote}</span>
                ) : null}
              </td>
              <td className="whitespace-nowrap px-4 py-3">{camera.videoSpec}</td>
              <td className="whitespace-nowrap px-4 py-3 tabular-nums">{camera.bodyWeightG} g</td>
              <td className="whitespace-nowrap px-4 py-3">
                <a
                  href={camera.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${camera.name} 공식 사양 (새 탭)`}
                  title={camera.sourceTitle}
                  className="text-blue-600 underline underline-offset-2 hover:text-blue-700 dark:text-blue-400"
                >
                  공식 사양 ↗
                </a>
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <Link
                  href={`/cameras/${camera.id}/edit`}
                  className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:border-zinc-400 hover:text-zinc-950 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-50"
                >
                  수정
                </Link>
              </td>
            </tr>
          ))}
          {cameras.length === 0 ? (
            <tr>
              <td colSpan={12} className="px-4 py-12 text-center">표시할 카메라가 없습니다.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
