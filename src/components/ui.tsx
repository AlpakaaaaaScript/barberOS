import type { ReactNode } from "react";
import { CheckCircle2, AlertCircle, Star } from "lucide-react";
import { initials } from "@/lib/format";

export function PageHeader({ eyebrow, title, desc, action }: { eyebrow?: string; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-brand">{eyebrow}</p>}
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        {desc && <p className="mt-1.5 max-w-2xl text-sm text-muted">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <div role="status" className={`mb-6 flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium ${
      error ? "border-bad/30 bg-bad-soft text-bad" : "border-ok/30 bg-ok-soft text-ok"}`}>
      {error ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
      {error ?? ok}
    </div>
  );
}

export function StatCard({ label, value, sub, icon }: { label: string; value: ReactNode; sub?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between text-muted">
        <span className="text-xs font-semibold uppercase tracking-[0.08em]">{label}</span>
        {icon}
      </div>
      <div className="mt-3 font-display text-3xl font-semibold tracking-tight">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  );
}

const STATUS: Record<string, string> = {
  booked: "bg-info-soft text-info",
  in_progress: "bg-warn-soft text-warn",
  completed: "bg-ok-soft text-ok",
  cancelled: "bg-bad-soft text-bad",
  no_show: "bg-surface-2 text-muted border border-line",
  active: "bg-ok-soft text-ok",
  inactive: "bg-surface-2 text-muted border border-line",
};

export function Badge({ status, children }: { status: string; children?: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS[status] ?? STATUS.no_show}`}>
      {children ?? status.replace("_", " ")}
    </span>
  );
}

const TONES = ["#b0802f", "#2f6b4f", "#a5372a", "#2c5282", "#6b4f8a", "#3d6d73"];
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const tone = TONES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % TONES.length];
  return (
    <span className="wf-img inline-grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: tone, fontSize: size * 0.36 }}>
      <span>{initials(name)}</span>
    </span>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= Math.round(value) ? "fill-brand text-brand" : "text-line"} />
      ))}
    </span>
  );
}

export function Empty({ title, desc, action }: { title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <p className="font-display text-lg font-semibold">{title}</p>
      {desc && <p className="mt-1 max-w-sm text-sm text-muted">{desc}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
