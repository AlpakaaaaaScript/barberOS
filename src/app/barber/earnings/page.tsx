import Link from "next/link";
import { Banknote, Coins, Percent, Scissors, Wallet } from "lucide-react";
import { one, sql } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { fmtDate, isoDay, money } from "@/lib/format";
import { Empty, PageHeader, StatCard, Stars } from "@/components/ui";

const RANGES = [["week", "This week"], ["month", "This month"], ["30d", "Last 30 days"], ["all", "All time"]] as const;

export default async function Earnings({ searchParams }: PageProps<"/barber/earnings">) {
  const s = await requireRole("barber");
  const sp = (await searchParams) as { range?: string };
  const range = RANGES.some(([k]) => k === sp.range) ? sp.range! : "month";
  const now = new Date();
  const from = new Date(now);
  if (range === "week") from.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  else if (range === "month") from.setDate(1);
  else if (range === "30d") from.setDate(now.getDate() - 29);
  else from.setFullYear(2000, 0, 1);
  const p = [s.userId, isoDay(from), isoDay(now)];

  // SQL: SELECT totals for the range from barber_earnings(barber, from, to)
  const e = (await one<{ visits: number; revenue: number; tips: number; commission: number; take_home: number }>(
    "SELECT * FROM barber_earnings($1, $2, $3)", p))!;
  // SQL: SELECT commission rate from barber
  const rate = (await one<{ commission_rate: number }>("SELECT commission_rate FROM barber WHERE barber_id = $1", [s.userId]))!.commission_rate;
  // SQL: daily take-home for the last 14 days (generate_series fills days with no payments)
  const daily = await sql<{ day: string; take_home: number }>(
    `SELECT d::date::text AS day,
            COALESCE(round(sum(p.amount) * $2 / 100 + sum(p.tip), 2), 0) AS take_home
     FROM generate_series(current_date - 13, current_date, interval '1 day') d
     LEFT JOIN (payment p JOIN appointment a ON a.appointment_id = p.appointment_id AND a.barber_id = $1)
            ON p.paid_at::date = d::date
     GROUP BY d ORDER BY d`, [s.userId, rate]);
  // SQL: SELECT average rating and review count from v_barber_stats
  const stats = await one<{ avg_rating: number; review_count: number }>("SELECT avg_rating, review_count FROM v_barber_stats WHERE barber_id = $1", [s.userId]);
  // SQL: SELECT recent reviews (review JOIN appointment JOIN app_user) for this barber
  const reviews = await sql<{ review_id: number; rating: number; comment: string | null; first_name: string; created_at: string }>(
    `SELECT r.review_id, r.rating, r.comment, r.created_at, split_part(u.full_name, ' ', 1) AS first_name
     FROM review r JOIN appointment a ON a.appointment_id = r.appointment_id JOIN app_user u ON u.user_id = a.customer_id
     WHERE a.barber_id = $1 ORDER BY r.created_at DESC LIMIT 10`, [s.userId]);
  const max = Math.max(1, ...daily.map((d) => d.take_home));

  return (
    <>
      <PageHeader title="Earnings & reviews" desc="Commission applies to service revenue; tips are 100% yours." />
      <div className="mb-6 inline-flex flex-wrap rounded-xl border border-line bg-surface p-1 text-sm font-semibold">
        {RANGES.map(([k, label]) => (
          <Link key={k} href={`/barber/earnings?range=${k}`} className={`rounded-lg px-4 py-1.5 ${range === k ? "bg-ink text-surface" : "text-muted hover:text-ink"}`}>{label}</Link>
        ))}
      </div>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Visits" value={e.visits} icon={<Scissors size={16} />} />
        <StatCard label="Service revenue" value={money(e.revenue)} icon={<Banknote size={16} />} />
        <StatCard label="Commission rate" value={`${rate}%`} icon={<Percent size={16} />} />
        <StatCard label="Commission earned" value={money(e.commission)} icon={<Coins size={16} />} />
        <StatCard label="Tips" value={money(e.tips)} icon={<Coins size={16} />} />
        <StatCard label="Take-home" value={money(e.take_home)} sub="commission + tips" icon={<Wallet size={16} />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <div className="flex items-end justify-between">
            <h2 className="font-display text-lg font-semibold">Daily take-home, last 14 days</h2>
            <span className="text-sm text-muted">{money(daily.reduce((a, d) => a + d.take_home, 0))}</span>
          </div>
          <div className="mt-6 flex h-52 items-end gap-[2px]" role="img" aria-label="Daily take-home for the last 14 days">
            {daily.map((d) => (
              <div key={d.day} className="group relative flex h-full flex-1 flex-col justify-end text-center">
                <div className="rounded-t-[4px] bg-brand transition-opacity group-hover:opacity-80" style={{ height: `${(d.take_home / max) * 88}%`, minHeight: d.take_home ? 2 : 0 }} />
                <span className="mt-1.5 text-[10px] text-muted">{d.day.slice(8)}</span>
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-lg bg-ink px-2 py-1 text-xs whitespace-nowrap text-surface group-hover:block">
                  <b>{money(d.take_home)}</b>, {fmtDate(`${d.day} 00:00:00`)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Recent reviews</h2>
            <span className="flex items-center gap-2 text-sm text-muted"><Stars value={Number(stats?.avg_rating ?? 0)} /> {Number(stats?.avg_rating ?? 0).toFixed(1)} ({stats?.review_count ?? 0})</span>
          </div>
          {!reviews.length ? <Empty title="No reviews yet" desc="Customers can review you after a completed visit." /> : (
            <ul className="mt-3 divide-y divide-line">
              {reviews.map((r) => (
                <li key={r.review_id} className="py-3">
                  <div className="flex items-center justify-between"><Stars value={r.rating} /><span className="text-xs text-muted">{r.first_name}, {fmtDate(r.created_at)}</span></div>
                  {r.comment && <p className="mt-1.5 text-sm">{r.comment}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
