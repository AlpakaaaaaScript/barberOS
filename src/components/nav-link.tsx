"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export type NavItem = { href: string; label: string; icon: ReactNode };

export function NavLink({ href, label, icon }: NavItem) {
  const path = usePathname();
  const active = path === href || (href.split("/").length > 2 && path.startsWith(href));
  return (
    <Link href={href} aria-current={active ? "page" : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active ? "bg-side-active text-side-ink [&_svg]:text-side-accent" : "text-side-muted hover:bg-side-active/60 hover:text-side-ink"}`}>
      {icon}
      {label}
    </Link>
  );
}
