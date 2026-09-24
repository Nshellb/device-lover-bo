"use client";

import { useEffect, useRef } from "react";

const THEME_STORAGE_KEY = "device-lover-theme";

export function ThemeToggle() {
  const frame = useRef<number | null>(null);
  const timeout = useRef<number | null>(null);
  const pendingDarkTheme = useRef<boolean | null>(null);

  useEffect(() => {
    return () => {
      if (frame.current !== null) window.cancelAnimationFrame(frame.current);
      if (timeout.current !== null) window.clearTimeout(timeout.current);
      document.documentElement.classList.remove("theme-animating");
    };
  }, []);

  function toggleTheme() {
    const root = document.documentElement;
    const currentDarkTheme =
      pendingDarkTheme.current ?? root.classList.contains("dark");
    const useDarkTheme = !currentDarkTheme;
    pendingDarkTheme.current = useDarkTheme;

    if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    if (timeout.current !== null) window.clearTimeout(timeout.current);

    root.classList.add("theme-animating");
    frame.current = window.requestAnimationFrame(() => {
      frame.current = window.requestAnimationFrame(() => {
        frame.current = null;
        pendingDarkTheme.current = null;
        root.classList.toggle("dark", useDarkTheme);

        try {
          localStorage.setItem(
            THEME_STORAGE_KEY,
            useDarkTheme ? "dark" : "light",
          );
        } catch {}

        timeout.current = window.setTimeout(() => {
          root.classList.remove("theme-animating");
          timeout.current = null;
        }, 460);
      });
    });
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="다크 모드와 라이트 모드 전환"
      title="화면 모드 전환"
      className="grid size-8 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-600 transition-colors hover:border-blue-400 hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:text-blue-300"
    >
      <span className="relative block size-4" aria-hidden="true">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="absolute inset-0 size-4 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none dark:-rotate-45 dark:scale-75 dark:opacity-0"
        >
          <path
            d="M20.5 15.2A8.6 8.6 0 0 1 8.8 3.5a8.6 8.6 0 1 0 11.7 11.7Z"
            fill="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="absolute inset-0 size-4 rotate-45 scale-75 opacity-0 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none dark:rotate-0 dark:scale-100 dark:opacity-100"
        >
          <circle cx="12" cy="12" r="3.5" fill="currentColor" />
          <path
            d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"
            strokeLinecap="round"
          />
        </svg>
      </span>
    </button>
  );
}
