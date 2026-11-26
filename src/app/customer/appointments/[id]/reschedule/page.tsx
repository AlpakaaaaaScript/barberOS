import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { one, sql } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { fmtDateLong, fmtTime, isoDay } from "@/lib/format";
import { Avatar, Flash, PageHeader } from "@/components/ui";
import { DayPicker, SlotGrid } from "@/components/day-picker";
import { rescheduleAppointment } from "../../../actions";

export default async function Reschedule({ params, searchParams }: PageProps<"/customer/appointments/[id]/reschedule">) {
  const s = await requireRole("customer");
  const { id } = await params;
  const sp = (await searchParams) as { date?: string; error?: string };
  // SQL: the booking being moved (must belong to this customer and still be 'booked')
  const a = await one<{ appointment_id: number; start_at: string; barber_id: number; service_id: number; barber_name: string; service_name: string }>(
    "SELECT * FROM v_appointment WHERE appointment_id = $1 AND customer_id = $2 AND status = 'booked'", [Number(id), s.userId]);
  if (!a) notFound();
  const date = sp.date ?? a.start_at.slice(0, 10) ?? isoDay();
  // SQL: SELECT * FROM get_available_slots(barber, service, new date)
  const slots = (await sql<{ slot_start: string }>("SELECT slot_start FROM get_available_slots($1, $2, $3::date)", [a.barber_id, a.service_id, date])).map((r) => r.slot_start);

  return (
    <>
      <Link href="/customer/appointments" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink"><ChevronLeft size={16} /> My appointments</Link>
      <PageHeader title="Move your appointment" desc="Same barber and service, just a new time." />
      <Flash error={sp.error} />
      <div className="card mb-6 flex items-center gap-4 p-5">
        <Avatar name={a.barber_name} size={44} />
        <div>
          <p className="font-semibold">{a.service_name} with {a.barber_name}</p>
          <p className="text-sm text-muted">Currently: {fmtDateLong(a.start_at)} at {fmtTime(a.start_at)}</p>
        </div>
      </div>
      <form action={rescheduleAppointment} className="card space-y-6 p-6">
        <input type="hidden" name="id" value={a.appointment_id} />
        <input type="hidden" name="date" value={date} />
        <div><p className="label">New date</p><DayPicker selected={date} href={(d) => `/customer/appointments/${id}/reschedule?date=${d}`} /></div>
        <div><p className="label">Available times</p><SlotGrid slots={slots} /></div>
        <div className="flex justify-end gap-2">
          <Link href="/customer/appointments" className="btn btn-ghost">Keep current time</Link>
          <button disabled={!slots.length} className="btn btn-brand disabled:opacity-40">Confirm new time</button>
        </div>
      </form>
    </>
  );
}
