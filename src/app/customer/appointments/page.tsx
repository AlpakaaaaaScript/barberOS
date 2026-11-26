import Link from "next/link";
import { CalendarPlus } from "lucide-react";
import { sql } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { fmtDate, fmtTime, money } from "@/lib/format";
import { Avatar, Badge, Empty, Flash, PageHeader, Stars } from "@/components/ui";
import { cancelAppointment } from "../actions";
import { getShop } from "@/lib/shop";

type Appt = { appointment_id: number; start_at: string; status: string; service_name: string; barber_name: string; price: number;
  duration_min: number; review_id: number | null; rating: number | null; tip: number | null; note: string | null };

export default async function MyAppointments({ searchParams }: PageProps<"/customer/appointments">) {
  const s = await requireRole("customer");
  const sp = (await searchParams) as { ok?: string; error?: string; tab?: string };
  const shop = await getShop();
  const tab = sp.tab === "past" ? "past" : "upcoming";
  // SQL: SELECT the customer's appointments from v_appointment (upcoming or past)
  const rows = await sql<Appt>(
    tab === "upcoming"
      ? `SELECT * FROM v_appointment WHERE customer_id = $1 AND status IN ('booked','in_progress') ORDER BY start_at`
      : `SELECT * FROM v_appointment WHERE customer_id = $1 AND status NOT IN ('booked','in_progress') ORDER BY start_at DESC`,
    [s.userId]);

  return (
    <>
      <PageHeader title="My appointments" desc={`Reschedule or cancel up to ${shop.cancel_window_hours} hours before. Review visits once they’re complete.`}
        action={<Link href="/customer/book" className="btn btn-brand"><CalendarPlus size={16} /> New booking</Link>} />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="mb-5 inline-flex rounded-[10px] border border-line bg-paper-2 p-1 text-sm font-semibold">
        {(["upcoming", "past"] as const).map((t) => (
          <Link key={t} href={`/customer/appointments?tab=${t}`} className={`rounded-lg px-4 py-1.5 capitalize ${tab === t ? "bg-ink text-surface" : "text-muted hover:text-ink"}`}>{t}</Link>
        ))}
      </div>

      {!rows.length ? (
        <Empty title={tab === "upcoming" ? "No upcoming appointments" : "No past visits yet"} desc="When you book, your appointments will appear here."
          action={<Link href="/customer/book" className="btn btn-primary">Book now</Link>} />
      ) : (
        <div className="space-y-3">
          {rows.map((a) => (
            <div key={a.appointment_id} className="card flex flex-wrap items-center gap-4 p-5">
              <div className="w-24 shrink-0">
                <p className="font-display text-lg font-bold">{fmtTime(a.start_at)}</p>
                <p className="text-xs text-muted">{fmtDate(a.start_at)}</p>
              </div>
              <div className="flex min-w-48 flex-1 items-center gap-3">
                <Avatar name={a.barber_name} size={38} />
                <div>
                  <p className="font-semibold">{a.service_name}</p>
                  <p className="text-sm text-muted">with {a.barber_name}, {a.duration_min} min</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {a.rating && <Stars value={a.rating} />}
                <span className="font-display font-bold">{money(a.price)}</span>
                <Badge status={a.status} />
              </div>
              <div className="flex w-full justify-end gap-2 sm:w-auto">
                {a.status === "booked" && <>
                  <Link href={`/customer/appointments/${a.appointment_id}/reschedule`} className="btn btn-ghost btn-sm">Reschedule</Link>
                  <form action={cancelAppointment}><input type="hidden" name="id" value={a.appointment_id} /><button className="btn btn-danger btn-sm">Cancel</button></form>
                </>}
                {a.status === "completed" && !a.review_id && <Link href={`/customer/reviews?appointment=${a.appointment_id}`} className="btn btn-brand btn-sm">Write review</Link>}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
