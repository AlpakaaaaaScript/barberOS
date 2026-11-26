import Link from "next/link";
import { ArrowRight, Award, CalendarPlus, Clock, Scissors, Wallet } from "lucide-react";
import { one, sql } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { fmtDate, fmtDateLong, fmtTime, money } from "@/lib/format";
import { Avatar, Badge, Flash, PageHeader, StatCard } from "@/components/ui";
import { getShop } from "@/lib/shop";

type Appt = { appointment_id: number; start_at: string; status: string; service_name: string; barber_name: string; price: number; duration_min: number };

export default async function CustomerHome({ searchParams }: PageProps<"/customer">) {
  const s = await requireRole("customer");
  const { ok } = (await searchParams) as { ok?: string };
  // SQL: customer summary — loyalty points, visit count, total spent
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
      <PageHeader eyebrow="Customer" title={`Hello, ${s.name.split(" ")[0]}`} desc="Here’s what’s coming up and how your loyalty points are growing."
        action={<Link href="/customer/book" className="btn btn-brand"><CalendarPlus size={16} /> Book appointment</Link>} />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Loyalty points" value={me.loyalty_points} sub={`${tier} member · 1 pt per ฿${shop.baht_per_point}`} icon={<Award size={18} />} />
        <StatCard label="Visits" value={me.visits} sub="Completed appointments" icon={<Scissors size={18} />} />
        <StatCard label="Total spent" value={money(me.spent)} sub="Including tips" icon={<Wallet size={18} />} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="card overflow-hidden">
          <div className="border-b border-line px-6 py-4"><h2 className="font-display text-lg font-semibold">Next appointment</h2></div>
          {next ? (
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="grid w-20 shrink-0 place-items-center rounded-xl bg-side py-3 text-side-ink">
                  <span className="text-xs uppercase tracking-wider text-side-muted">{fmtDate(next.start_at).split(" ")[0]}</span>
                  <span className="font-display text-3xl font-semibold">{fmtDate(next.start_at).split(" ")[1]}</span>
                  <span className="text-xs text-side-muted">{fmtDate(next.start_at).split(" ")[2]}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display text-xl font-semibold">{next.service_name}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted"><Clock size={14} /> {fmtDateLong(next.start_at)} · {fmtTime(next.start_at)} · {next.duration_min} min</p>
                  <div className="mt-3 flex items-center gap-2 text-sm"><Avatar name={next.barber_name} size={26} /> with <b>{next.barber_name}</b></div>
                </div>
                <span className="font-display text-xl font-semibold">{money(next.price)}</span>
              </div>
              <div className="mt-6 flex gap-2">
                <Link href={`/customer/appointments/${next.appointment_id}/reschedule`} className="btn btn-ghost btn-sm">Reschedule</Link>
                <Link href="/customer/appointments" className="btn btn-ghost btn-sm">Manage bookings</Link>
              </div>
            </div>
          ) : (
            <div className="p-6 text-sm text-muted">No upcoming bookings. <Link href="/customer/book" className="font-semibold text-ink underline">Book one now</Link>.</div>
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <h2 className="font-display text-lg font-semibold">Recent visits</h2>
            <Link href="/customer/appointments" className="flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink">All <ArrowRight size={13} /></Link>
          </div>
          <ul>
            {recent.map((a) => (
              <li key={a.appointment_id} className="flex items-center gap-3 border-b border-line px-6 py-3 last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{a.service_name}</p>
                  <p className="text-xs text-muted">{fmtDate(a.start_at)} · {a.barber_name}</p>
                </div>
                <Badge status={a.status} />
              </li>
            ))}
            {!recent.length && <li className="px-6 py-6 text-sm text-muted">No visits yet.</li>}
          </ul>
        </section>
      </div>
    </>
  );
}
