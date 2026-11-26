import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/app/actions";
import type { Session } from "@/lib/session";
import { NavLink, type NavItem } from "./nav-link";

/** The barber-pole wordmark: the brand mark, the only place the pole red appears. */
export function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2 no-underline">
      <svg width="22" height="22" viewBox="0 0 28 28" aria-hidden className="shrink-0">
        <rect x="8" y="1" width="12" height="26" rx="6" fill="var(--color-ink)" />
        <clipPath id="pole"><rect x="10" y="4" width="8" height="20" rx="4" /></clipPath>
        <g clipPath="url(#pole)">
          <rect x="10" y="4" width="8" height="20" fill="var(--color-paper)" />
          {[0, 6, 12, 18].map((y) => <path key={y} d={`M6 ${y + 8} l16 -8 v4 l-16 8z`} fill="var(--color-pole)" />)}
        </g>
      </svg>
      <span className="font-display text-lg font-bold tracking-tight text-ink">barberOS</span>
    </Link>
  );
}

const ROLE_LABEL = { customer: "Customer", barber: "Barber", owner: "Owner" };

export function Shell({ session, nav, children }: { session: Session; nav: NavItem[]; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-[300] border-b border-ink bg-paper">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-5 md:h-16 md:px-10">
          <Logo />
          <nav aria-label={`${ROLE_LABEL[session.role]} portal`} className="hidden items-center md:flex">
            {nav.map((n) => <NavLink key={n.href} {...n} />)}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <p className="hidden text-sm text-muted lg:block"><span className="font-semibold text-ink">{session.name}</span> ({ROLE_LABEL[session.role]})</p>
            <form action={logout}><button className="btn btn-sm">Sign out</button></form>
          </div>
        </div>
        <nav aria-label={`${ROLE_LABEL[session.role]} portal`} className="flex overflow-x-auto border-t border-line px-3 md:hidden">
          {nav.map((n) => <NavLink key={n.href} {...n} />)}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 md:px-10 md:py-12">{children}</main>
    </div>
  );
}
