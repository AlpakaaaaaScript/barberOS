import Link from "next/link";
import { TrendingDown, TrendingUp } from "lucide-react";
import { one, sql } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { fmtTime, money } from "@/lib/format";
import { Avatar, Badge, PageHeader, Stars } from "@/components/ui";

export default async function OwnerDashboard() {
  await requireRole("owner");

  // SQL: KPI summary: revenue this month vs last month, bookings, rating, active customers
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
      <PageHeader title="Shop dashboard"
        action={<Link href="/owner/appointments" className="btn">All appointments</Link>} />

      {/* The month in four figures, one ruled strip */}
      <dl className="grid border-y border-ink sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-line">
        <div className="py-5 lg:pr-6"><dt className="text-sm text-muted">Revenue this month</dt><dd className="font-display text-4xl font-bold text-ink tabular-nums">{money(k.rev)}</dd>
          <dd className="mt-1 flex items-center gap-1 text-sm text-ink-2">{delta >= 0 ? <TrendingUp size={14} aria-hidden /> : <TrendingDown size={14} aria-hidden />}{delta >= 0 ? "+" : ""}{delta}% on last month so far</dd></div>
        <div className="py-5 lg:px-6"><dt className="text-sm text-muted">Bookings this month</dt><dd className="font-display text-4xl font-bold text-ink tabular-nums">{k.bookings}</dd>
          <dd className="mt-1 text-sm text-ink-2">{k.cancel_rate ?? 0}% cancelled or no-show (30 days)</dd></div>
        <div className="py-5 lg:px-6"><dt className="text-sm text-muted">Average rating</dt><dd className="flex items-center gap-3 font-display text-4xl font-bold text-ink tabular-nums">{k.rating}<Stars value={k.rating} size={15} /></dd>
          <dd className="mt-1 text-sm text-ink-2">All customer reviews</dd></div>
        <div className="py-5 lg:pl-6"><dt className="text-sm text-muted">Active customers</dt><dd className="font-display text-4xl font-bold text-ink tabular-nums">{k.customers}</dd>
          <dd className="mt-1 text-sm text-ink-2">Tips this month {money(k.tips)}</dd></div>
      </dl>

      <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Revenue chart: single series in ink, a hover tooltip per bar */}
        <section aria-labelledby="rev-h">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="rev-h" className="text-xl">Daily revenue, last 30 days</h2>
              <p className="text-sm text-muted">Service revenue from payments, tips excluded</p>
            </div>
            <p className="font-display text-2xl font-bold text-ink tabular-nums">{money(total30)}</p>
          </div>
          <div className="relative mt-6 h-60 pl-14" role="img" aria-label={`Daily revenue for the last 30 days, total ${money(total30)}`}>
            {ticks.map((t) => (
              <div key={t} className={`absolute right-0 left-14 border-t ${t === 0 ? "border-ink" : "border-line"}`} style={{ bottom: `${t * 100}%` }}>
                <span className="absolute -top-2 -left-14 w-12 text-right font-mono text-xs text-muted">{money(max * t)}</span>
              </div>
            ))}
            <div className="relative flex h-full items-end gap-[2px]">
              {daily.map((d) => (
                <div key={d.day} className="group relative flex h-full flex-1 items-end">
                  <div className="w-full rounded-t-[4px] bg-ink transition-opacity group-hover:opacity-70"
                    style={{ height: `${(d.revenue / max) * 100}%`, minHeight: d.revenue ? 2 : 0 }} />
                  <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden -translate-x-1/2 rounded-[10px] bg-ink px-3 py-2 text-xs whitespace-nowrap text-paper shadow-[var(--shadow-card)] group-hover:block">
                    <b>{money(d.revenue)}</b>, {d.visits} visits<br /><span className="opacity-70">{new Date(d.day).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-2 flex justify-between pl-14 text-xs text-muted">
            <span>{new Date(daily[0].day).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
            <span>Today</span>
          </div>
        </section>

        {/* Today, as the shop ledger */}
        <section aria-labelledby="today-h">
          <h2 id="today-h" className="text-xl">Today in the shop <span className="text-muted">({today.length})</span></h2>
          {today.length ? (
            <ol className="ruled mt-4">
              {today.map((a) => (
                <li key={a.appointment_id} className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 py-2.5 text-sm">
                  <span className="font-mono text-ink">{fmtTime(a.start_at)}</span>
                  <span className="min-w-0 truncate"><b className="text-ink">{a.customer_name}</b> <span className="text-muted">with {a.barber_name}</span></span>
                  <Badge status={a.status} />
                </li>
              ))}
            </ol>
          ) : <p className="mt-4 text-sm text-muted">The shop is closed or has no bookings today.</p>}
        </section>
      </div>

      <div className="mt-14 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section aria-labelledby="perf-h">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <h2 id="perf-h" className="text-xl">Barber performance, 30 days</h2>
            <Link href="/owner/barbers" className="link text-sm">Manage barbers</Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="table">
              <thead><tr><th>Barber</th><th className="text-right">Visits</th><th className="text-right">Revenue</th><th>Rating</th></tr></thead>
              <tbody>
                {barbers.map((b) => (
                  <tr key={b.barber_id}>
                    <td><span className="flex items-center gap-3"><Avatar name={b.full_name} size={30} /><b className="text-ink">{b.full_name}</b></span></td>
                    <td className="text-right">{b.visits}</td>
                    <td className="text-right font-semibold text-ink">{money(b.revenue)}</td>
                    <td><span className="flex items-center gap-1.5"><Stars value={b.avg_rating} size={12} />{b.avg_rating}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="svc-h">
          <h2 id="svc-h" className="text-xl">Top services, 30 days</h2>
          <ul className="ruled mt-4">
            {services.map((s) => (
              <li key={s.name} className="py-3">
                <div className="flex justify-between text-sm"><span className="font-semibold text-ink">{s.name}</span><span className="text-muted tabular-nums">{s.n} visits, {money(s.revenue)}</span></div>
                <div className="mt-2 h-1.5 bg-paper-3"><div className="h-1.5 bg-ink" style={{ width: `${(s.n / maxSvc) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
