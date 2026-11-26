import Link from "next/link";
import { ArrowRight, CalendarCheck, Star, TrendingDown, TrendingUp, UsersRound, Wallet } from "lucide-react";
import { one, sql } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { fmtTime, money } from "@/lib/format";
import { Avatar, Badge, PageHeader, StatCard, Stars } from "@/components/ui";

export default async function OwnerDashboard() {
  await requireRole("owner");

  // SQL: KPI summary — revenue this month vs last month, bookings, rating, active customers
  const k = (await one<{ rev: number; rev_prev: number; tips: number; bookings: number; cancel_rate: number; rating: number; customers: number }>(`
    SELECT
      (SELECT COALESCE(sum(amount),0) FROM payment WHERE paid_at >= date_trunc('month', now()))                                   AS rev,
      (SELECT COALESCE(sum(amount),0) FROM payment WHERE paid_at >= date_trunc('month', now()) - interval '1 month'
                                                     AND paid_at <  now() - interval '1 month')                                 AS rev_prev,
      (SELECT COALESCE(sum(tip),0)    FROM payment WHERE paid_at >= date_trunc('month', now()))                                   AS tips,
      (SELECT count(*) FROM appointment WHERE start_at >= date_trunc('month', now()) AND status <> 'cancelled')                   AS bookings,
      (SELECT round(100.0 * count(*) FILTER (WHERE status IN ('cancelled','no_show')) / NULLIF(count(*),0), 1)
         FROM appointment WHERE start_at >= now() - interval '30 days' AND start_at < now())                                     AS cancel_rate,
      (SELECT round(avg(rating),2) FROM review)                                                                                   AS rating,
      (SELECT count(DISTINCT customer_id) FROM appointment WHERE start_at >= now() - interval '30 days')                          AS customers`))!;

  // SQL: daily revenue for the last 30 days (generate_series fills days with no sales)
  const daily = await sql<{ day: string; revenue: number; visits: number }>(`
    SELECT d::date::text AS day, COALESCE(sum(p.amount),0) AS revenue, count(p.payment_id) AS visits
    FROM generate_series(current_date - 29, current_date, interval '1 day') d
    LEFT JOIN payment p ON p.paid_at::date = d::date
    GROUP BY d ORDER BY d`);

  // SQL: barber leaderboard for the last 30 days
  const barbers = await sql<{ barber_id: number; full_name: string; visits: number; revenue: number; avg_rating: number }>(`
    SELECT v.barber_id, v.full_name, v.avg_rating,
           count(p.payment_id) AS visits, COALESCE(sum(p.amount),0) AS revenue
    FROM v_barber_stats v
    LEFT JOIN appointment a ON a.barber_id = v.barber_id
    LEFT JOIN payment p ON p.appointment_id = a.appointment_id AND p.paid_at >= now() - interval '30 days'
    WHERE v.is_active GROUP BY v.barber_id, v.full_name, v.avg_rating ORDER BY revenue DESC`);

  // SQL: most popular services in the last 30 days
  const services = await sql<{ name: string; n: number; revenue: number }>(`
    SELECT s.name, count(*) AS n, sum(a.price) AS revenue
    FROM appointment a JOIN service s USING (service_id)
    WHERE a.status = 'completed' AND a.start_at >= now() - interval '30 days'
    GROUP BY s.name ORDER BY n DESC LIMIT 5`);

  // SQL: today's appointments across the shop
  const today = await sql<{ appointment_id: number; start_at: string; customer_name: string; barber_name: string; service_name: string; status: string }>(`
    SELECT appointment_id, start_at, customer_name, barber_name, service_name, status
    FROM v_appointment WHERE start_at::date = current_date AND status <> 'cancelled' ORDER BY start_at`);

  const max = Math.max(...daily.map((d) => d.revenue), 1);
  const total30 = daily.reduce((a, d) => a + d.revenue, 0);
  const delta = k.rev_prev ? Math.round(((k.rev - k.rev_prev) / k.rev_prev) * 100) : 0;
  const maxSvc = Math.max(...services.map((s) => s.n), 1);
  const ticks = [1, 0.5, 0];

  return (
    <>
      <PageHeader eyebrow="Owner" title="Shop dashboard" desc="Revenue, bookings and staff performance at a glance."
        action={<Link href="/owner/appointments" className="btn btn-ghost">All appointments <ArrowRight size={16} /></Link>} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue · this month" value={money(k.rev)} icon={<Wallet size={18} />}
          sub={<span className={`inline-flex items-center gap-1 font-semibold ${delta >= 0 ? "text-ok" : "text-bad"}`}>
            {delta >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}{delta >= 0 ? "+" : ""}{delta}% vs same point last month</span>} />
        <StatCard label="Bookings · this month" value={k.bookings} sub={`${k.cancel_rate ?? 0}% cancel / no-show (30d)`} icon={<CalendarCheck size={18} />} />
        <StatCard label="Average rating" value={<span className="flex items-center gap-2">{k.rating}<Stars value={k.rating} size={16} /></span>} sub="All-time customer reviews" icon={<Star size={18} />} />
        <StatCard label="Active customers" value={k.customers} sub={`Tips this month ${money(k.tips)}`} icon={<UsersRound size={18} />} />
      </div>

      {/* Revenue chart — single series, one hue, hover tooltip per bar */}
      <section className="card mt-6 p-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-semibold">Daily revenue · last 30 days</h2>
            <p className="text-sm text-muted">Service revenue from payments, excluding tips</p>
          </div>
          <p className="font-display text-2xl font-semibold">{money(total30)}</p>
        </div>
        <div className="relative mt-6 h-56 pl-12" role="img" aria-label={`Daily revenue for the last 30 days, total ${money(total30)}`}>
          {ticks.map((t) => (
            <div key={t} className="absolute right-0 left-12 border-t border-line" style={{ bottom: `${t * 100}%` }}>
              <span className="absolute -top-2 -left-12 w-10 text-right text-[11px] text-muted">{money(max * t)}</span>
            </div>
          ))}
          <div className="relative flex h-full items-end gap-[2px]">
            {daily.map((d) => (
              <div key={d.day} className="group relative flex h-full flex-1 items-end">
                <div className="w-full rounded-t-[4px] bg-brand transition-opacity group-hover:opacity-80"
                  style={{ height: `${(d.revenue / max) * 100}%`, minHeight: d.revenue ? 2 : 0 }} />
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1.5 text-xs whitespace-nowrap text-surface shadow-lg group-hover:block">
                  <b>{money(d.revenue)}</b> · {d.visits} visits<br /><span className="opacity-70">{new Date(d.day).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-2 flex justify-between pl-12 text-[11px] text-muted">
          <span>{new Date(daily[0].day).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
          <span>Today</span>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <h2 className="font-display text-lg font-semibold">Barber performance · 30 days</h2>
            <Link href="/owner/barbers" className="text-xs font-semibold text-muted hover:text-ink">Manage</Link>
          </div>
          <table className="table">
            <thead><tr><th>Barber</th><th className="text-right">Visits</th><th className="text-right">Revenue</th><th>Rating</th></tr></thead>
            <tbody>
              {barbers.map((b) => (
                <tr key={b.barber_id}>
                  <td><span className="flex items-center gap-3"><Avatar name={b.full_name} size={32} /><b>{b.full_name}</b></span></td>
                  <td className="text-right tabular-nums">{b.visits}</td>
                  <td className="text-right font-semibold tabular-nums">{money(b.revenue)}</td>
                  <td><span className="flex items-center gap-1.5"><Stars value={b.avg_rating} size={12} />{b.avg_rating}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card p-6">
          <h2 className="font-display text-lg font-semibold">Top services · 30 days</h2>
          <ul className="mt-4 space-y-4">
            {services.map((s) => (
              <li key={s.name}>
                <div className="flex justify-between text-sm"><span className="font-semibold">{s.name}</span><span className="text-muted tabular-nums">{s.n} · {money(s.revenue)}</span></div>
                <div className="mt-1.5 h-2 rounded-full bg-surface-2"><div className="h-2 rounded-full bg-ink" style={{ width: `${(s.n / maxSvc) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card mt-6 overflow-hidden">
        <div className="border-b border-line px-6 py-4"><h2 className="font-display text-lg font-semibold">Today in the shop <span className="text-muted">({today.length})</span></h2></div>
        {today.length ? (
          <table className="table">
            <thead><tr><th>Time</th><th>Customer</th><th>Service</th><th>Barber</th><th>Status</th></tr></thead>
            <tbody>{today.map((a) => (
              <tr key={a.appointment_id}><td className="font-semibold tabular-nums">{fmtTime(a.start_at)}</td><td>{a.customer_name}</td><td>{a.service_name}</td><td>{a.barber_name}</td><td><Badge status={a.status} /></td></tr>
            ))}</tbody>
          </table>
        ) : <p className="px-6 py-6 text-sm text-muted">The shop is closed or has no bookings today.</p>}
      </section>
    </>
  );
}
