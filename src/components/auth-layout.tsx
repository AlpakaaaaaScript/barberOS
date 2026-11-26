import type { ReactNode } from "react";
import { getOpeningHours, getShop } from "@/lib/shop";
import { Logo } from "./shell";

export async function AuthLayout({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  const shop = await getShop();
  const hours = await getOpeningHours();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-ink">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-5 md:px-10"><Logo /></div>
      </header>
      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-12 px-5 py-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-20 md:px-10 md:py-20">
        <div className="w-full max-w-sm">
          <h1 className="text-[2.5rem]">{title}</h1>
          <p className="mt-3 text-ink-2">{desc}</p>
          <div className="mt-8">{children}</div>
        </div>
        <aside className="hidden md:block">
          <p className="font-display text-3xl font-bold tracking-tight text-ink">{shop.tagline ?? shop.name}</p>
          <p className="mt-3 text-ink-2">{shop.address}</p>
          <ul className="ruled mt-8 max-w-sm">
            {hours.map((h) => (
              <li key={h.day} className="flex justify-between py-2.5 text-sm">
                <span>{h.day}</span><span className="font-mono">{h.open ? `${h.open} to ${h.close}` : "Closed"}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}
