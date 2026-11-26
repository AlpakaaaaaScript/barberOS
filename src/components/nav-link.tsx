"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string };

export function NavLink({ href, label }: NavItem) {
  const path = usePathname();
  const active = path === href || (href.split("/").length > 2 && path.startsWith(href));
  return (
    <Link href={href} aria-current={active ? "page" : undefined}
      className={`inline-flex h-12 shrink-0 items-center border-b-2 px-3 text-sm font-semibold whitespace-nowrap transition-colors md:h-16 ${
        active ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"}`}>
      {label}
    </Link>
  );
}
