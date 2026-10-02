"use client";

import { useState } from "react";

import { resolveImageUrl } from "@/lib/image-url";

/**
 * Small preview of an admin-entered image URL. Plain <img> on purpose: the URL
 * can point at any host, which next/image would reject. Re-mount with a `key`
 * of the URL (done here) so a new URL resets the error state.
 */
export function ImagePreview({ url, alt }: { url: string; alt: string }) {
  const trimmed = url.trim();
  if (!/^(https?:\/\/|\/(?!\/))/i.test(trimmed)) return null;

  return <ImagePreviewImage key={trimmed} url={resolveImageUrl(trimmed)} alt={alt} />;
}

function ImagePreviewImage({ url, alt }: { url: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
      {failed ? (
        <span className="px-2 text-center text-xs text-zinc-400 dark:text-zinc-500">
          이미지를 불러오지 못했습니다
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={alt}
          className="max-h-full max-w-full object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
