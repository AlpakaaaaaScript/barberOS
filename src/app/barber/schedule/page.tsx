import Link from "next/link";
import { sql } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { fmtDateLong, fmtTime, money } from "@/lib/format";
import { Badge, Empty, PageHeader } from "@/components/ui";

type Appt = { appointment_id: number; start_at: string; status: string; customer_name: string; service_name: string; duration_min: number; price: number };

export default async function Schedule({ searchParams }: PageProps<"/barber/schedule">) {
  const s = await requireRole("barber");
  const sp = (await searchParams) as { range?: string };
  const past = sp.range === "past";
  // SQL: SELECT the barber's appointments from v_appointment for the next 14 days (or the past 7 days)
  const rows = await sql<Appt>(
    past
      ? `SELECT * FROM v_appointment WHERE barber_id = $1 AND start_at >= current_date - 7 AND start_at < current_date ORDER BY start_at DESC`
      : `SELECT * FROM v_appointment WHERE barber_id = $1 AND start_at >= current_date AND start_at < current_date + 14 ORDER BY start_at`,
    [s.userId]);
  const days = new Map<string, Appt[]>();
  for (const r of rows) { const k = r.start_at.slice(0, 10); days.set(k, [...(days.get(k) ?? []), r]); }

  return (
    <>
      <PageHeader title="Schedule" desc={past ? "Your last 7 days." : "Your next 14 days, including today."} />
      <div className="mb-5 inline-flex rounded-[10px] border border-line bg-paper-2 p-1 text-sm font-semibold">
        {[["upcoming", "Next 14 days", "/barber/schedule"], ["past", "Past 7 days", "/barber/schedule?range=past"]].map(([k, label, href]) => (
          <Link key={k} href={href} className={`rounded-lg px-4 py-1.5 ${(k === "past") === past ? "bg-ink text-surface" : "text-muted hover:text-ink"}`}>{label}</Link>
        ))}
      </div>
      {!rows.length ? <Empty title={past ? "No appointments in the past week" : "Nothing booked in the next 14 days"} /> : (
        <div className="space-y-6">
          {[...days].map(([day, list]) => (
            <section key={day}>
              <h2 className="mb-2 font-display text-lg font-bold">{fmtDateLong(`${day} 00:00:00`)}</h2>
              <div className="card divide-y divide-line">
                {list.map((a) => (
                  <div key={a.appointment_id} className="flex flex-wrap items-center gap-4 px-5 py-3.5">
                    <span className="w-24 shrink-0 font-display font-bold">{fmtTime(a.start_at)}</span>
                    <div className="min-w-48 flex-1"><p className="font-semibold">{a.customer_name}</p><p className="text-sm text-muted">{a.service_name}, {a.duration_min} min</p></div>
                    <span className="font-display font-bold">{money(a.price)}</span>
                    <Badge status={a.status} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
