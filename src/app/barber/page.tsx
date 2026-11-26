import { CalendarCheck, CheckCircle2, Star, Wallet } from "lucide-react";
import { one, sql } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { fmtTime, money } from "@/lib/format";
import { Badge, Empty, Flash, PageHeader, StatCard } from "@/components/ui";
import { checkout, markNoShow, startAppointment } from "./actions";

type Appt = { appointment_id: number; start_at: string; status: string; customer_name: string; customer_phone: string | null;
  service_name: string; note: string | null; price: number; paid_amount: number | null; tip: number | null; method: string | null; started: boolean };

export default async function Today({ searchParams }: PageProps<"/barber">) {
  const s = await requireRole("barber");
  const sp = (await searchParams) as { ok?: string; error?: string };
  // SQL: SELECT today's appointments from v_appointment ordered by start time (started = start_at <= now())
  const rows = await sql<Appt>(
    `SELECT *, start_at <= now() AS started FROM v_appointment
     WHERE barber_id = $1 AND start_at::date = current_date ORDER BY start_at`, [s.userId]);
  // SQL: SELECT today's take-home from barber_earnings(barber, current_date, current_date)
  const earn = await one<{ take_home: number }>("SELECT take_home FROM barber_earnings($1, current_date, current_date)", [s.userId]);
  // SQL: SELECT average rating and review count from v_barber_stats
  const stats = await one<{ avg_rating: number; review_count: number }>("SELECT avg_rating, review_count FROM v_barber_stats WHERE barber_id = $1", [s.userId]);

  return (
    <>
      <PageHeader title="Today"
        desc={new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Appointments" value={rows.length} sub="scheduled today" icon={<CalendarCheck size={16} />} />
        <StatCard label="Completed" value={rows.filter((r) => r.status === "completed").length} sub="visits paid today" icon={<CheckCircle2 size={16} />} />
        <StatCard label="Take-home today" value={money(earn?.take_home)} sub="commission + tips" icon={<Wallet size={16} />} />
        <StatCard label="Rating" value={Number(stats?.avg_rating ?? 0).toFixed(1)} sub={`${stats?.review_count ?? 0} reviews`} icon={<Star size={16} />} />
      </div>

      {!rows.length ? <Empty title="No appointments today" desc="Enjoy the quiet. New bookings will show up here." /> : (
        <div className="space-y-3">
          {rows.map((a) => (
            <div key={a.appointment_id} className="card flex flex-wrap items-center gap-4 p-5">
              <div className="w-20 shrink-0"><p className="font-display text-lg font-semibold">{fmtTime(a.start_at)}</p></div>
              <div className="min-w-48 flex-1">
                <p className="font-semibold">{a.customer_name}{a.customer_phone && <span className="ml-2 text-sm font-normal text-muted">{a.customer_phone}</span>}</p>
                <p className="text-sm text-muted">{a.service_name}</p>
                {a.note && <p className="mt-1 inline-block rounded-lg bg-surface-2 px-2.5 py-1 text-xs text-muted">“{a.note}”</p>}
              </div>
              <div className="flex items-center gap-3 text-right">
                {a.status === "completed" ? (
                  <span className="text-sm text-muted">Paid <b className="text-ink">{money(a.paid_amount)}</b> + {money(a.tip)} tip, <span className="capitalize">{a.method}</span></span>
                ) : <span className="font-display font-semibold">{money(a.price)}</span>}
                <Badge status={a.status} />
              </div>
              {(a.status === "booked" || a.status === "in_progress") && (
                <div className="flex w-full flex-wrap items-center justify-end gap-2">
                  {a.status === "booked" && <>
                    <form action={startAppointment}><input type="hidden" name="id" value={a.appointment_id} /><button className="btn btn-ghost btn-sm">Start</button></form>
                    {a.started && <form action={markNoShow}><input type="hidden" name="id" value={a.appointment_id} /><button className="btn btn-danger btn-sm">No-show</button></form>}
                  </>}
                  <form action={checkout} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={a.appointment_id} />
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-muted">Tip ฿<input name="tip" type="number" min={0} step="1" defaultValue={0} className="input !w-20 !py-1.5 text-sm" /></label>
                    <select name="method" aria-label="Payment method" className="input !w-24 !py-1.5 text-sm"><option value="cash">Cash</option><option value="card">Card</option><option value="qr">QR</option></select>
                    <button className="btn btn-brand btn-sm">Checkout</button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
