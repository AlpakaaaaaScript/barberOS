import type { ReactNode } from "react";
import { MapPin } from "lucide-react";
import { getShop } from "@/lib/shop";
import { Logo } from "./shell";

export async function AuthLayout({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  const shop = await getShop();
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-side p-12 text-side-ink md:flex">
        <div className="wf-hide pole-stripes pointer-events-none absolute inset-0 opacity-[0.07]" />
        <div className="relative"><Logo light /></div>
        <div className="relative">
          <p className="font-display text-5xl leading-tight font-semibold">{shop.tagline ?? shop.name}</p>
          <p className="mt-6 flex items-center gap-2 text-side-muted"><MapPin size={16} className="text-side-accent" /> {shop.address}</p>
          <p className="mt-1 text-side-muted">Free cancellation up to {shop.cancel_window_hours} hours before.</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 md:hidden"><Logo /></div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-muted">{desc}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
