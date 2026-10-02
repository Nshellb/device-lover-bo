"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_GROUPS = [
  { title: "계정 관리", items: [{ href: "/accounts", label: "BO 계정 관리" }] },
  {
    title: "기기 관리",
    items: [
      { href: "/brands", label: "브랜드 관리" },
      { href: "/devices", label: "스마트폰 관리" },
      { href: "/cameras", label: "카메라 관리" },
    ],
  },
  {
    title: "연결 관리",
    items: [{ href: "/wireless-technologies", label: "무선 연결 규격 관리" }],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav
      data-app-sidebar
      className="w-56 shrink-0 border-r border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="flex flex-col gap-4">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-1 text-xs font-semibold tracking-wide text-zinc-400 dark:text-zinc-500">
              {group.title}
            </p>
            <ul className="flex flex-col gap-1">
              {group.items.map((item) => {
                const isActive = pathname.startsWith(item.href);

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block rounded-lg py-2 pl-6 pr-3 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : "text-zinc-600 hover:bg-zinc-200/70 hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-50"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
