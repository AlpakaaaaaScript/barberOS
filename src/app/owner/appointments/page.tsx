import { sql } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { dayOffset, fmtDate, fmtTime, isoDay, money } from "@/lib/format";
import { Badge, Empty, Flash, PageHeader } from "@/components/ui";
import { setAppointmentStatus } from "../actions";

type A = { appointment_id: number; start_at: string; status: string; price: number; customer_name: string; customer_phone: string | null;
  barber_name: string; service_name: string; paid_amount: number | null; tip: number | null; method: string | null };

const STATUSES = ["booked", "in_progress", "completed", "cancelled", "no_show"];

export default async function OwnerAppointments({ searchParams }: PageProps<"/owner/appointments">) {
  await requireRole("owner");
  const sp = (await searchParams) as Record<string, string | undefined>;
  const from = sp.from || isoDay(), to = sp.to || dayOffset(6);
  const status = sp.status || "", barber = Number(sp.barber) || 0, q = sp.q?.trim() || "";

  // SQL: filtered appointment search (date range, status, barber, customer name)
  const rows = await sql<A>(`
    SELECT * FROM v_appointment
    WHERE start_at::date BETWEEN $1::date AND $2::date
      AND ($3 = '' OR status = $3::appt_status)
      AND ($4 = 0  OR barber_id = $4)
      AND ($5 = '' OR customer_name ILIKE '%' || $5 || '%')
    ORDER BY start_at LIMIT 300`, [from, to, status, barber, q]);
  // SQL: barber list for the filter dropdown
  const barbers = await sql<{ barber_id: number; full_name: string }>("SELECT barber_id, full_name FROM v_barber_stats ORDER BY full_name");

  const revenue = rows.reduce((a, r) => a + (r.paid_amount ?? 0), 0);
  const ret = `/owner/appointments?${new URLSearchParams(Object.entries({ from, to, status, barber: String(barber || ""), q }).filter(([, v]) => v)).toString()}`;

  return (
    <>
      <PageHeader title="Appointments" desc="Every booking in the shop. Filter, follow up and override statuses when needed." />
      <Flash ok={sp.ok} error={sp.error} />

      <form className="card mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[repeat(5,1fr)_auto]">
        <input type="date" name="from" defaultValue={from} className="input" aria-label="From date" />
        <input type="date" name="to" defaultValue={to} className="input" aria-label="To date" />
        <select name="status" defaultValue={status} className="input" aria-label="Status">
          <option value="">All statuses</option>{STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
        <select name="barber" defaultValue={barber || ""} className="input" aria-label="Barber">
          <option value="">All barbers</option>{barbers.map((b) => <option key={b.barber_id} value={b.barber_id}>{b.full_name}</option>)}
        </select>
        <input name="q" defaultValue={q} placeholder="Customer name…" className="input" aria-label="Customer name" />
        <button className="btn btn-primary">Filter</button>
      </form>

      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
        <span><b className="text-ink">{rows.length}</b> appointments</span>
        <span><b className="text-ink">{money(revenue)}</b> collected</span>
        <span><b className="text-ink">{rows.filter((r) => r.status === "booked").length}</b> still booked</span>
      </div>

      {!rows.length ? <Empty title="No appointments match" desc="Try widening the date range or clearing filters." /> : (
        <div className="card overflow-x-auto">
          <table className="table min-w-[860px]">
            <thead><tr><th>#</th><th>When</th><th>Customer</th><th>Service</th><th>Barber</th><th className="text-right">Price</th><th>Payment</th><th>Status</th><th /></tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.appointment_id}>
                  <td className="text-xs text-muted">{a.appointment_id}</td>
                  <td className="whitespace-nowrap"><b>{fmtTime(a.start_at)}</b> <span className="text-muted">{fmtDate(a.start_at)}</span></td>
                  <td><span className="block font-medium">{a.customer_name}</span><span className="text-xs text-muted">{a.customer_phone}</span></td>
                  <td>{a.service_name}</td>
                  <td>{a.barber_name}</td>
                  <td className="text-right tabular-nums">{money(a.price)}</td>
                  <td className="text-xs">{a.paid_amount != null ? <><b className="capitalize">{a.method === "qr" ? "QR" : a.method}</b>, tip {money(a.tip)}</> : <span className="text-muted">Not paid</span>}</td>
                  <td><Badge status={a.status} /></td>
                  <td>
                    {(a.status === "booked" || a.status === "in_progress") && (
                      <form action={setAppointmentStatus} className="flex justify-end gap-1">
                        <input type="hidden" name="id" value={a.appointment_id} /><input type="hidden" name="return" value={ret} />
                        {a.status === "booked" && <button name="status" value="cancelled" className="btn btn-danger btn-sm">Cancel</button>}
                        <button name="status" value="no_show" className="btn btn-ghost btn-sm">No-show</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
