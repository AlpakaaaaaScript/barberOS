import Link from "next/link";
import { one, sql } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { fmtDate, fmtDateLong, fmtTime, money } from "@/lib/format";
import { Badge, Flash, PageHeader } from "@/components/ui";
import { getShop } from "@/lib/shop";

type Appt = { appointment_id: number; start_at: string; status: string; service_name: string; barber_name: string; price: number; duration_min: number };

export default async function CustomerHome({ searchParams }: PageProps<"/customer">) {
  const s = await requireRole("customer");
  const { ok } = (await searchParams) as { ok?: string };
  // SQL: customer summary: loyalty points, visit count, total spent
  const me = (await one<{ loyalty_points: number; visits: number; spent: number }>(
    `SELECT c.loyalty_points,
            count(p.payment_id) AS visits,
            COALESCE(sum(p.amount + p.tip), 0) AS spent
     FROM customer c
     LEFT JOIN appointment a ON a.customer_id = c.customer_id
     LEFT JOIN payment p ON p.appointment_id = a.appointment_id
     WHERE c.customer_id = $1 GROUP BY c.customer_id`, [s.userId]))!;
  // SQL: next upcoming appointment
  const next = await one<Appt>(
    `SELECT * FROM v_appointment WHERE customer_id = $1 AND status = 'booked' AND start_at > now() ORDER BY start_at LIMIT 1`, [s.userId]);
  // SQL: recent visit history
  const recent = await sql<Appt>(
    `SELECT * FROM v_appointment WHERE customer_id = $1 AND start_at <= now() ORDER BY start_at DESC LIMIT 5`, [s.userId]);

  const shop = await getShop();
  const tier = me.loyalty_points >= 500 ? "Gold" : me.loyalty_points >= 200 ? "Silver" : "Bronze";

  return (
    <>
      <Flash ok={ok} />
      <PageHeader title={`Hello, ${s.name.split(" ")[0]}`}
        action={<Link href="/customer/book" className="btn btn-primary">Book appointment</Link>} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        {/* The next visit, set as the screen's one object */}
        <section aria-labelledby="next-h">
          <h2 id="next-h" className="text-xl">Your next visit</h2>
          {next ? (
            <div className="mt-4 border-t border-ink pt-6">
              <p className="font-display text-[clamp(2rem,4vw,3.25rem)] leading-none font-bold text-ink">{fmtDateLong(next.start_at)}</p>
              <p className="mt-2 font-mono text-2xl text-ink">{fmtTime(next.start_at)}</p>
              <dl className="mt-8 grid gap-6 border-t border-line pt-6 sm:grid-cols-3">
                <div><dt className="text-sm text-muted">Service</dt><dd className="font-semibold text-ink">{next.service_name}</dd><dd className="text-sm text-muted">{next.duration_min} min</dd></div>
                <div><dt className="text-sm text-muted">Barber</dt><dd className="font-semibold text-ink">{next.barber_name}</dd></div>
                <div><dt className="text-sm text-muted">Price</dt><dd className="font-display text-xl font-bold text-ink tabular-nums">{money(next.price)}</dd></div>
              </dl>
              <div className="mt-8 flex flex-wrap gap-2">
                <Link href={`/customer/appointments/${next.appointment_id}/reschedule`} className="btn">Reschedule</Link>
                <Link href="/customer/appointments" className="btn">Manage bookings</Link>
              </div>
              <p className="mt-4 text-sm text-muted">Free cancellation up to {shop.cancel_window_hours} hours before.</p>
            </div>
          ) : (
            <div className="well mt-4 p-6">
              <p className="font-semibold text-ink">Nothing booked yet.</p>
              <p className="mt-1 text-sm text-muted">Pick a service, a barber and a free time.</p>
              <Link href="/customer/book" className="btn btn-primary mt-5">Book appointment</Link>
            </div>
          )}

          <div className="mt-14 flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-xl">Recent visits</h2>
            <Link href="/customer/appointments" className="link text-sm">All appointments</Link>
          </div>
          <ul className="ruled mt-4">
            {recent.map((a) => (
              <li key={a.appointment_id} className="flex items-center gap-4 py-3">
                <span className="w-24 shrink-0 font-mono text-sm text-muted">{fmtDate(a.start_at)}</span>
                <span className="min-w-0 flex-1 truncate"><b className="text-ink">{a.service_name}</b> <span className="text-muted">with {a.barber_name}</span></span>
                <Badge status={a.status} />
              </li>
            ))}
            {!recent.length && <li className="py-6 text-sm text-muted">No visits yet.</li>}
          </ul>
        </section>

        {/* Loyalty, in plain figures */}
        <aside className="well h-fit divide-y divide-line">
          <div className="p-5">
            <p className="text-sm text-muted">Loyalty points</p>
            <p className="font-display text-5xl font-bold text-ink tabular-nums">{me.loyalty_points}</p>
            <p className="mt-1 text-sm text-muted">{tier} member, 1 point per ฿{shop.baht_per_point}</p>
          </div>
          <div className="p-5"><p className="text-sm text-muted">Visits</p><p className="font-display text-3xl font-bold text-ink tabular-nums">{me.visits}</p></div>
          <div className="p-5"><p className="text-sm text-muted">Spent, tips included</p><p className="font-display text-3xl font-bold text-ink tabular-nums">{money(me.spent)}</p></div>
        </aside>
      </div>
    </>
  );
}
