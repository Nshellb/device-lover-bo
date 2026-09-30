"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { ApiDeviceDetail } from "@/lib/api/types";
import { SPEC_FIELDS, SPEC_SECTIONS } from "@/lib/spec-labels";

const SPEC_LABELS = Object.fromEntries(SPEC_FIELDS.map(({ key, label }) => [key, label]));

const PUBLICATION_STATUS_LABELS: Record<string, string> = {
  draft: "초안",
  published: "게시됨",
  archived: "보관됨",
};

type ModalState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; device: ApiDeviceDetail };

export function DeviceDetailModal({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  // `id: null` never matches a real id, so `isLoading` starts true.
  const [fetched, setFetched] = useState<{ id: string | null; state: ModalState }>({
    id: null,
    state: { status: "loading" },
  });
  const isLoading = fetched.id !== id;
  const state: ModalState = isLoading ? { status: "loading" } : fetched.state;

  // Fetches through the same-origin Route Handler (app/api/admin/devices/[id]),
  // which proxies to the Rust API — the browser can't call it directly (no CORS layer there).
  // This admin-by-id route sees drafts/archived devices too, unlike the public one.
  useEffect(() => {
    let cancelled = false;

    fetch(`/api/admin/devices/${encodeURIComponent(id)}`)
      .then(async (response) => {
        if (cancelled) return;
        if (!response.ok) {
          setFetched({ id, state: { status: "error" } });
          return;
        }
        const device = (await response.json()) as ApiDeviceDetail;
        setFetched({ id, state: { status: "ready", device } });
      })
      .catch(() => {
        if (!cancelled) setFetched({ id, state: { status: "error" } });
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose]);

  return createPortal(
    <div
      role="presentation"
      onMouseDown={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-zinc-950/50 px-4 py-10"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="기기 상세 정보"
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-2xl rounded-xl bg-white shadow-2xl dark:bg-zinc-900"
      >
        {state.status === "loading" ? (
          <p className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">불러오는 중…</p>
        ) : state.status === "error" ? (
          <p className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            기기 정보를 불러오지 못했습니다.
          </p>
        ) : (
          <DeviceDetailContent device={state.device} onClose={onClose} />
        )}
      </section>
    </div>,
    document.body,
  );
}

function DeviceDetailContent({
  device,
  onClose,
}: {
  device: ApiDeviceDetail;
  onClose: () => void;
}) {
  return (
    <div className="flex max-h-[85vh] flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-5 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-xs font-semibold tracking-wide text-zinc-500 dark:text-zinc-400">
              {device.brand}
            </p>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {PUBLICATION_STATUS_LABELS[device.publicationStatus] ?? device.publicationStatus}
            </span>
          </div>
          <h2 className="mt-0.5 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            {device.name}
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {device.slug} · {device.releaseDate}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/devices/${device.id}/edit`}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-950 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-50"
          >
            수정
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="grid size-7 shrink-0 place-items-center rounded-full text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="모델 번호" value={device.modelNumbers.join(", ") || "-"} />
          <Field label="별칭" value={device.aliases.join(", ") || "-"} />
          <Field label="시장" value={device.marketCode} />
          <Field label="대표 구성" value={device.variant ?? "-"} />
          <Field label="출처" value={device.sourceUrl} href={device.sourceUrl || undefined} />
          <Field
            label="런칭 영상"
            value={device.launchVideoUrl ?? "-"}
            href={device.launchVideoUrl ?? undefined}
          />
          <Field label="갱신일" value={new Date(device.updatedAt).toLocaleString("ko-KR")} />
        </dl>

        <h3 className="mb-2 mt-6 text-xs font-semibold tracking-wide text-zinc-500 dark:text-zinc-400">
          사양 ({Object.keys(device.specs).length}개)
        </h3>
        {SPEC_SECTIONS.map((section) => {
          const rows = section.keys.filter((key) => device.specs[key]);
          if (rows.length === 0) return null;

          return (
            <div key={section.title} className="mb-6">
              <div className="mb-1 flex items-baseline justify-between border-b-2 border-zinc-300 pb-2 dark:border-zinc-600">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  {section.title}
                </h4>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">{rows.length}개</span>
              </div>
              <dl className="divide-y divide-zinc-100 text-sm dark:divide-zinc-800">
                {rows.map((key) => {
                  const spec = device.specs[key];
                  const label = SPEC_LABELS[key];

                  return (
                    <div key={key} className="grid grid-cols-[120px_1fr] gap-3 py-2">
                      <dt className="text-zinc-500 dark:text-zinc-400">{label}</dt>
                      <dd className="text-zinc-900 dark:text-zinc-100">
                        {spec.value}
                        {spec.detail ? (
                          <span className="ml-1 text-xs text-zinc-400 dark:text-zinc-500">
                            ({spec.detail})
                          </span>
                        ) : null}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="truncate text-zinc-900 dark:text-zinc-100">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
