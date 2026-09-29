import Image from "next/image";

import { mockSession } from "@/lib/mock-session";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export function Header() {
  return (
    <header
      data-app-header
      className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-6 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex items-center gap-2.5">
        <Image
          src="/device-lover-logo.svg"
          alt=""
          aria-hidden="true"
          width={657}
          height={726}
          className="h-5 w-auto"
        />
        <span className="text-sm font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Device Lover BO
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs text-zinc-500 dark:text-zinc-400">
        <ThemeToggle />
        <span className="font-medium text-zinc-700 dark:text-zinc-300">
          {mockSession.accountName}
        </span>
        <span>로그인 {mockSession.loginAt}</span>
        <button
          type="button"
          className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:text-zinc-950 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-50"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
