import Link from "next/link";
import { Check, ChevronLeft, Clock } from "lucide-react";
import { one, sql } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { fmtDateLong, isoDay, money } from "@/lib/format";
import { Avatar, Flash, PageHeader, Stars } from "@/components/ui";
import { DayPicker, SlotGrid } from "@/components/day-picker";
import { bookAppointment } from "../actions";
import { getShop } from "@/lib/shop";

type Svc = { service_id: number; name: string; category: string; description: string; duration_min: number; price: number };
type Bar = { barber_id: number; full_name: string; specialty: string; avg_rating: number; review_count: number };

function Steps({ step }: { step: number }) {
  const labels = ["Service", "Barber", "Date & time", "Confirm"];
  return (
    <ol className="mb-8 flex flex-wrap items-center gap-2 text-sm">
      {labels.map((l, i) => (
        <li key={l} className="flex items-center gap-2">
          <span className={`grid size-7 place-items-center rounded-full text-xs font-bold ${
            i < step ? "bg-ok text-white" : i === step ? "bg-ink text-surface" : "bg-surface-2 text-muted border border-line"}`}>
            {i < step ? <Check size={14} /> : i + 1}
          </span>
          <span className={i === step ? "font-semibold" : "text-muted"}>{l}</span>
          {i < labels.length - 1 && <span className="mx-1 h-px w-8 bg-line" />}
        </li>
      ))}
    </ol>
  );
}

export default async function Book({ searchParams }: PageProps<"/customer/book">) {
  await requireRole("customer");
  const sp = (await searchParams) as { service?: string; barber?: string; date?: string; error?: string };
  const serviceId = Number(sp.service) || 0, barberId = Number(sp.barber) || 0;
  const date = sp.date ?? isoDay();

  // Step 1 — SQL: SELECT active services
  if (!serviceId) {
    const services = await sql<Svc>("SELECT * FROM service WHERE is_active ORDER BY category, price");
    return (
      <>
        <PageHeader eyebrow="Book appointment" title="Choose a service" desc="Prices are fixed when you book — no surprises at the counter." />
        <Steps step={0} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <Link key={s.service_id} href={`/customer/book?service=${s.service_id}`} className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-brand">
              <span className="w-fit rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-semibold text-brand">{s.category}</span>
              <h3 className="mt-3 font-display text-lg font-semibold">{s.name}</h3>
              <p className="mt-1 flex-1 text-sm text-muted">{s.description}</p>
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm">
                <span className="flex items-center gap-1.5 text-muted"><Clock size={14} /> {s.duration_min} min</span>
                <span className="font-display text-lg font-semibold">{money(s.price)}</span>
              </div>
            </Link>
          ))}
        </div>
      </>
    );
  }

  const service = (await one<Svc>("SELECT * FROM service WHERE service_id = $1", [serviceId]))!;

  // Step 2 — SQL: barbers who offer this service (JOIN barber_service + v_barber_stats)
  if (!barberId) {
    const barbers = await sql<Bar>(
      `SELECT v.barber_id, v.full_name, v.specialty, v.avg_rating, v.review_count
       FROM v_barber_stats v JOIN barber_service bs ON bs.barber_id = v.barber_id
       WHERE bs.service_id = $1 AND v.is_active ORDER BY v.avg_rating DESC`, [serviceId]);
    return (
      <>
        <PageHeader eyebrow="Book appointment" title="Choose your barber" desc={`Barbers who offer ${service.name}.`} />
        <Steps step={1} />
        <Link href="/customer/book" className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink"><ChevronLeft size={16} /> Change service</Link>
        <div className="grid gap-4 sm:grid-cols-2">
          {barbers.map((b) => (
            <Link key={b.barber_id} href={`/customer/book?service=${serviceId}&barber=${b.barber_id}`} className="card flex items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:border-brand">
              <Avatar name={b.full_name} size={56} />
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-lg font-semibold">{b.full_name}</h3>
                <p className="text-sm text-brand">{b.specialty}</p>
                <div className="mt-1 flex items-center gap-1.5 text-sm"><Stars value={b.avg_rating} /><b>{b.avg_rating}</b><span className="text-muted">({b.review_count} reviews)</span></div>
              </div>
            </Link>
          ))}
        </div>
      </>
    );
  }

  // Step 3 — SQL: SELECT * FROM get_available_slots(barber, service, date)
  const shop = await getShop();
  const barber = (await one<Bar>("SELECT * FROM v_barber_stats WHERE barber_id = $1", [barberId]))!;
  const slots = (await sql<{ slot_start: string }>("SELECT slot_start FROM get_available_slots($1, $2, $3::date)", [barberId, serviceId, date])).map((r) => r.slot_start);

  return (
    <>
      <PageHeader eyebrow="Book appointment" title="Pick a date & time" desc="Only genuinely free slots are shown — the database prevents double bookings." />
      <Steps step={2} />
      <Link href={`/customer/book?service=${serviceId}`} className="mb-5 inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink"><ChevronLeft size={16} /> Change barber</Link>
      <Flash error={sp.error} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form action={bookAppointment} id="book" className="card space-y-6 p-6">
          <input type="hidden" name="service" value={serviceId} />
          <input type="hidden" name="barber" value={barberId} />
          <input type="hidden" name="date" value={date} />
          <div>
            <p className="label">Date</p>
            <DayPicker selected={date} href={(d) => `/customer/book?service=${serviceId}&barber=${barberId}&date=${d}`} />
          </div>
          <div>
            <p className="label">Available times · {fmtDateLong(date + " 00:00:00")}</p>
            <SlotGrid slots={slots} />
          </div>
          <label className="block">
            <span className="label">Note for your barber (optional)</span>
            <textarea name="note" rows={2} className="input" placeholder="e.g. Keep the length on top, low fade" />
          </label>
        </form>

        <aside className="card h-fit p-6">
          <p className="label">Booking summary</p>
          <h3 className="mt-2 font-display text-xl font-semibold">{service.name}</h3>
          <p className="text-sm text-muted">{service.duration_min} minutes</p>
          <div className="mt-4 flex items-center gap-3 border-y border-line py-4">
            <Avatar name={barber.full_name} size={40} />
            <div><p className="text-sm font-semibold">{barber.full_name}</p><p className="text-xs text-muted">{barber.specialty}</p></div>
          </div>
          <div className="mt-4 flex items-center justify-between"><span className="text-sm text-muted">Total (pay at shop)</span><span className="font-display text-2xl font-semibold">{money(service.price)}</span></div>
          <p className="mt-1 text-xs text-muted">Earn {Math.floor(service.price / shop.baht_per_point)} loyalty points</p>
          <button form="book" disabled={!slots.length} className="btn btn-brand mt-5 w-full py-3 disabled:opacity-40">Confirm booking</button>
          <p className="mt-3 text-center text-xs text-muted">Free cancellation up to {shop.cancel_window_hours} hours before</p>
        </aside>
      </div>
    </>
  );
}
