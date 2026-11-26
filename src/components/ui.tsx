import type { ReactNode } from "react";
import { Star } from "lucide-react";
import { initials } from "@/lib/format";

export function PageHeader({ title, desc, action }: { title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl md:text-[2.5rem]">{title}</h1>
        {desc && <p className="mt-3 max-w-2xl text-ink-2">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <div role={error ? "alert" : "status"} className={`mb-8 rounded-[10px] px-4 py-3 text-sm font-semibold ${
      error ? "border border-error text-error" : "bg-accent-soft text-accent-soft-ink"}`}>
      {error ?? ok}
    </div>
  );
}

/** A figure in plain black over its label, on a paper well. */
export function StatCard({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="well p-5">
      <p className="text-sm text-muted">{label}</p>
      <div className="mt-2 font-display text-3xl font-bold tracking-tight text-ink tabular-nums">{value}</div>
      {sub && <div className="mt-1 text-sm text-muted">{sub}</div>}
    </div>
  );
}

/** State tags: in (teal) only ever means open or free, on (ink) is happening now, grey is booked, outline is over. */
const STATUS: Record<string, string> = {
  booked: "",
  in_progress: "tag-on",
  completed: "tag-out",
  cancelled: "tag-out",
  no_show: "tag-out",
  active: "tag-in",
  inactive: "tag-out",
};

export function Badge({ status, children }: { status: string; children?: ReactNode }) {
  return <span className={`tag capitalize ${STATUS[status] ?? "tag-out"}`}>{children ?? status.replace("_", " ")}</span>;
}

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <span className="wf-img inline-grid shrink-0 place-items-center rounded-full border border-line bg-paper-3 font-semibold text-ink"
      style={{ width: size, height: size, fontSize: size * 0.36 }}>
      <span>{initials(name)}</span>
    </span>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} className={i <= Math.round(value) ? "fill-ink text-ink" : "text-line"} />
      ))}
    </span>
  );
}

export function Empty({ title, desc, action }: { title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="well flex flex-col items-start px-6 py-10">
      <p className="font-display text-lg font-bold text-ink">{title}</p>
      {desc && <p className="mt-1 max-w-md text-sm text-muted">{desc}</p>}
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
