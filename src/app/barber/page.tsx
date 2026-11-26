import { one, sql } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { fmtTime, money } from "@/lib/format";
import { Badge, Empty, Flash, PageHeader } from "@/components/ui";
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

  const open = rows.filter((r) => r.status === "booked" || r.status === "in_progress");
  const nextId = (rows.find((r) => r.status === "in_progress") ?? open[0])?.appointment_id;
  const done = rows.filter((r) => r.status === "completed").length;

  return (
    <>
      <PageHeader title="Today"
        desc={new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Bangkok" })} />
      <Flash ok={sp.ok} error={sp.error} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_16rem]">
        {/* The queue: the day as a ruled timetable, the next chair inked */}
        <section aria-label="Today's appointments">
          {!rows.length ? <Empty title="No appointments today" desc="New bookings show up here as customers make them." /> : (
            <ol className="ruled">
              {rows.map((a) => {
                const next = a.appointment_id === nextId;
                return (
                  <li key={a.appointment_id} className={`grid gap-x-6 gap-y-3 px-4 py-5 sm:grid-cols-[5rem_minmax(0,1fr)_auto] ${next ? "bg-paper-2" : ""}`}>
                    <p className="font-mono text-xl text-ink">{fmtTime(a.start_at)}</p>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-lg font-semibold text-ink">
                        {a.customer_name}{next && a.status === "booked" && <span className="tag tag-on">Next</span>}
                      </p>
                      <p className="text-ink-2">{a.service_name}{a.customer_phone && <span className="text-muted">, {a.customer_phone}</span>}</p>
                      {a.note && <p className="mt-2 text-sm text-muted">Note: {a.note}</p>}
                    </div>
                    <div className="flex items-start gap-3 sm:justify-end">
                      {a.status === "completed"
                        ? <p className="text-sm text-ink-2">Paid <b className="text-ink">{money(a.paid_amount)}</b> and {money(a.tip)} tip, <span className="capitalize">{a.method === "qr" ? "QR" : a.method}</span></p>
                        : <p className="font-display text-lg font-bold text-ink tabular-nums">{money(a.price)}</p>}
                      <Badge status={a.status} />
                    </div>
                    {(a.status === "booked" || a.status === "in_progress") && (
                      <div className="flex flex-wrap items-center gap-2 sm:col-start-2 sm:col-span-2">
                        {a.status === "booked" && <>
                          <form action={startAppointment}><input type="hidden" name="id" value={a.appointment_id} /><button className="btn btn-sm">Start</button></form>
                          {a.started && <form action={markNoShow}><input type="hidden" name="id" value={a.appointment_id} /><button className="btn btn-danger btn-sm">No-show</button></form>}
                        </>}
                        <form action={checkout} className="flex flex-wrap items-center gap-2 sm:ml-auto">
                          <input type="hidden" name="id" value={a.appointment_id} />
                          <label className="flex items-center gap-2 text-sm text-muted">Tip (฿)<input name="tip" type="number" min={0} step="1" defaultValue={0} className="input !min-h-8 !w-20 !py-1" /></label>
                          <select name="method" aria-label="Payment method" className="input !min-h-8 !w-24 !py-1"><option value="cash">Cash</option><option value="card">Card</option><option value="qr">QR</option></select>
                          <button className="btn btn-primary btn-sm">Checkout</button>
                        </form>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        {/* The day in figures */}
        <aside className="well h-fit divide-y divide-line">
          <div className="p-5"><p className="text-sm text-muted">Visits finished</p><p className="font-display text-4xl font-bold text-ink tabular-nums">{done} <span className="text-xl text-muted">of {rows.length}</span></p></div>
          <div className="p-5"><p className="text-sm text-muted">Take-home today</p><p className="font-display text-4xl font-bold text-ink tabular-nums">{money(earn?.take_home)}</p><p className="text-sm text-muted">commission and tips</p></div>
          <div className="p-5"><p className="text-sm text-muted">Your rating</p><p className="font-display text-4xl font-bold text-ink tabular-nums">{Number(stats?.avg_rating ?? 0).toFixed(1)}</p><p className="text-sm text-muted">{stats?.review_count ?? 0} reviews</p></div>
        </aside>
      </div>
    </>
  );
}
