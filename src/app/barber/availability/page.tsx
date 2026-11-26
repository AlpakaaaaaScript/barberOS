import { Trash2 } from "lucide-react";
import { sql } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { fmtDate, WEEKDAYS } from "@/lib/format";
import { Field, Flash, PageHeader } from "@/components/ui";
import { addTimeOff, deleteTimeOff, saveHours } from "../actions";

export default async function Availability({ searchParams }: PageProps<"/barber/availability">) {
  const s = await requireRole("barber");
  const sp = (await searchParams) as { ok?: string; error?: string };
  // SQL: SELECT the barber's weekly working hours
  const hours = await sql<{ weekday: number; start_time: string; end_time: string }>(
    "SELECT weekday, start_time, end_time FROM working_hours WHERE barber_id = $1", [s.userId]);
  // SQL: SELECT the barber's time-off periods (current and future first)
  const off = await sql<{ time_off_id: number; start_date: string; end_date: string; reason: string | null }>(
    "SELECT time_off_id, start_date, end_date, reason FROM time_off WHERE barber_id = $1 ORDER BY start_date DESC", [s.userId]);
  // SQL: SELECT services this barber offers (barber_service JOIN service)
  const services = await sql<{ name: string; duration_min: number }>(
    `SELECT sv.name, sv.duration_min FROM barber_service bs JOIN service sv ON sv.service_id = bs.service_id
     WHERE bs.barber_id = $1 ORDER BY sv.name`, [s.userId]);
  const byDay = new Map(hours.map((h) => [h.weekday, h]));
  const order = [1, 2, 3, 4, 5, 6, 0];

  return (
    <>
      <PageHeader title="Availability" desc="Customers can only book inside your working hours and outside your time off." />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <form action={saveHours} className="card p-6">
          <h2 className="font-display text-lg font-semibold">Weekly working hours</h2>
          <table className="table mt-3 w-full">
            <thead><tr><th className="text-left">Day</th><th className="text-left">Working</th><th className="text-left">Start</th><th className="text-left">End</th></tr></thead>
            <tbody>
              {order.map((d) => {
                const h = byDay.get(d);
                return (
                  <tr key={d}>
                    <td className="font-semibold">{WEEKDAYS[d]}</td>
                    <td><input type="checkbox" name={`work_${d}`} defaultChecked={!!h} aria-label={`Working on ${WEEKDAYS[d]}`} /></td>
                    <td><input type="time" name={`start_${d}`} defaultValue={h?.start_time.slice(0, 5) ?? "10:00"} className="input !w-32 !py-1.5" /></td>
                    <td><input type="time" name={`end_${d}`} defaultValue={h?.end_time.slice(0, 5) ?? "19:00"} className="input !w-32 !py-1.5" /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button className="btn btn-primary mt-5">Save working hours</button>
        </form>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="font-display text-lg font-semibold">Time off</h2>
            {!off.length ? <p className="mt-3 text-sm text-muted">No time off scheduled.</p> : (
              <ul className="mt-3 divide-y divide-line">
                {off.map((t) => (
                  <li key={t.time_off_id} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="text-sm font-semibold">{fmtDate(`${t.start_date} 00:00:00`)}{t.end_date !== t.start_date && ` to ${fmtDate(`${t.end_date} 00:00:00`)}`}</p>
                      {t.reason && <p className="text-xs text-muted">{t.reason}</p>}
                    </div>
                    <form action={deleteTimeOff}><input type="hidden" name="id" value={t.time_off_id} /><button className="btn btn-ghost btn-sm" aria-label="Delete time off"><Trash2 size={14} /></button></form>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <form action={addTimeOff} className="card space-y-4 p-6">
            <h2 className="font-display text-lg font-semibold">Add time off</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From"><input type="date" name="start_date" required className="input" /></Field>
              <Field label="To"><input type="date" name="end_date" required className="input" /></Field>
            </div>
            <Field label="Reason"><input name="reason" className="input" placeholder="Holiday, training…" /></Field>
            <button className="btn btn-ghost w-full">Add time off</button>
          </form>
          <div className="card p-6">
            <h2 className="font-display text-lg font-semibold">Services you offer</h2>
            {!services.length ? <p className="mt-3 text-sm text-muted">None yet. The owner assigns services.</p> : (
              <div className="mt-3 flex flex-wrap gap-2">
                {services.map((v) => <span key={v.name} className="rounded-full border border-line bg-surface-2 px-3 py-1 text-xs font-semibold">{v.name}, {v.duration_min} min</span>)}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
