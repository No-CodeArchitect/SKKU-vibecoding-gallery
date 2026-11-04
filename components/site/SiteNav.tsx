"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "홈" },
  { href: "/about", label: "해커톤 소개" },
  { href: "/materials", label: "교안" },
  { href: "/archive", label: "아카이브" },
  { href: "/sections", label: "포트폴리오" },
  { href: "/media", label: "미디어" },
  { href: "/apply", label: "문의" },
];

// 현재 페이지 판정: 갤러리(/g/…)·작품 상세(/project/…)는 「포트폴리오」로 본다
function isActive(href: string, path: string): boolean {
  if (href === "/") return path === "/";
  if (href === "/sections") return path.startsWith("/sections") || path.startsWith("/g/") || path.startsWith("/project/");
  return path.startsWith(href);
}

// 데스크톱: 가로 메뉴 / 모바일: 헤더 아래 가로 스크롤 메뉴 (헤더가 sticky 라 스크롤해도 따라온다)
export default function SiteNav({ variant }: { variant: "desktop" | "mobile" }) {
  const path = usePathname() ?? "/";

  if (variant === "desktop") {
    return (
      <nav className="hidden items-center gap-6 md:flex">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={`text-sm font-medium transition hover:text-brand ${
              isActive(n.href, path) ? "text-brand" : "text-white/70"
            }`}
          >
            {n.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-3 [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
      {NAV.map((n) => (
        <Link
          key={n.href}
          href={n.href}
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            isActive(n.href, path)
              ? "bg-brand text-night"
              : "bg-white/5 text-white/70 ring-1 ring-white/10 hover:text-brand"
          }`}
        >
          {n.label}
        </Link>
      ))}
    </nav>
  );
}
