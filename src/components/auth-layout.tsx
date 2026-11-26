import type { ReactNode } from "react";
import { Logo } from "./shell";

export function AuthLayout({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-side p-12 text-side-ink md:flex">
        <div className="wf-hide pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "repeating-linear-gradient(135deg, #a5372a 0 18px, transparent 18px 36px, #e9e2d6 36px 54px, transparent 54px 72px)" }} />
        <div className="relative"><Logo light /></div>
        <blockquote className="relative">
          <p className="font-display text-3xl leading-snug font-medium">“Booked my fade on the bus, walked in at 6 sharp, out by 6:45. That’s how a barber shop should work.”</p>
          <footer className="mt-4 text-sm text-side-muted">James C. · regular since 2021</footer>
        </blockquote>
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
