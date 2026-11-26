import Link from "next/link";
import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { logout } from "@/app/actions";
import type { Session } from "@/lib/session";
import { Avatar } from "./ui";
import { NavLink, type NavItem } from "./nav-link";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden className="shrink-0">
        <rect x="8" y="1" width="12" height="26" rx="6" fill={light ? "var(--side-ink)" : "var(--ink)"} />
        <clipPath id="pole"><rect x="10" y="4" width="8" height="20" rx="4" /></clipPath>
        <g clipPath="url(#pole)">
          <rect x="10" y="4" width="8" height="20" fill="var(--surface)" />
          {[0, 6, 12, 18].map((y) => <path key={y} d={`M6 ${y + 8} l16 -8 v4 l-16 8z`} fill="var(--pole)" />)}
        </g>
      </svg>
      <span className={`font-display text-xl font-semibold tracking-tight ${light ? "text-side-ink" : "text-ink"}`}>
        barber<span className={light ? "text-side-accent" : "text-brand"}>OS</span>
      </span>
    </Link>
  );
}

const ROLE_LABEL = { customer: "Customer", barber: "Barber", owner: "Owner" };

export function Shell({ session, nav, children }: { session: Session; nav: NavItem[]; children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="sidebar hidden w-64 shrink-0 bg-side md:block">
       <div className="sticky top-0 flex h-screen flex-col px-4 py-6">
        <div className="px-2"><Logo light /></div>
        <p className="mt-8 px-3 text-xs font-semibold text-side-muted">{ROLE_LABEL[session.role]} portal</p>
        <nav className="mt-3 flex flex-col gap-1">
          {nav.map((n) => <NavLink key={n.href} {...n} />)}
        </nav>
        <div className="mt-auto rounded-xl bg-side-active p-3">
          <div className="flex items-center gap-3">
            <Avatar name={session.name} size={36} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-side-ink">{session.name}</p>
              <p className="text-xs text-side-muted">{ROLE_LABEL[session.role]}</p>
            </div>
          </div>
          <form action={logout} className="mt-3">
            <button className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 py-1.5 text-xs font-semibold text-side-ink hover:bg-white/5">
              <LogOut size={14} /> Sign out
            </button>
          </form>
        </div>
       </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-surface px-5 py-3 md:hidden">
          <Logo />
          <form action={logout}><button className="btn btn-ghost btn-sm"><LogOut size={14} /></button></form>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-line bg-surface px-3 py-2 md:hidden">
          {nav.map((n) => <Link key={n.href} href={n.href} className="rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted hover:bg-surface-2">{n.label}</Link>)}
        </nav>
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 md:px-10 md:py-10">{children}</main>
      </div>
    </div>
  );
}
