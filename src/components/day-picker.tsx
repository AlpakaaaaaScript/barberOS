import Link from "next/link";
import { isoDay } from "@/lib/format";

/** 14 upcoming days as link chips; `href(day)` builds the URL for each. */
export function DayPicker({ selected, href }: { selected?: string; href: (day: string) => string }) {
  const days = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; });
  return (
    <div className="flex gap-2 overflow-x-auto pb-2">
      {days.map((day) => {
        const v = isoDay(day), on = v === selected;
        const d = new Date(`${v}T12:00:00`); // label from the shop-local date, safe in any server time zone
        return (
          <Link key={v} href={href(v)} scroll={false}
            className={`flex w-16 shrink-0 flex-col items-center rounded-xl border py-2.5 transition-colors ${
              on ? "border-ink bg-ink text-surface" : "border-line bg-surface hover:border-muted"}`}>
            <span className={`text-xs font-semibold ${on ? "text-surface/70" : "text-muted"}`}>{d.toLocaleDateString("en-GB", { weekday: "short" })}</span>
            <span className="font-display text-xl font-semibold">{d.getDate()}</span>
            <span className={`text-xs ${on ? "text-surface/70" : "text-muted"}`}>{d.toLocaleDateString("en-GB", { month: "short" })}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function SlotGrid({ slots, name = "slot" }: { slots: string[]; name?: string }) {
  if (!slots.length) return <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">No free slots on this day. Try another date.</p>;
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
      {slots.map((t, i) => (
        <label key={t} className="cursor-pointer">
          <input type="radio" name={name} value={t} required defaultChecked={i === 0} className="peer sr-only" />
          <span className="block rounded-lg border border-line bg-surface py-2 text-center text-sm font-semibold transition-colors peer-checked:border-brand peer-checked:bg-brand peer-checked:text-brand-ink hover:border-muted">
            {t.slice(11, 16)}
          </span>
        </label>
      ))}
    </div>
  );
}
