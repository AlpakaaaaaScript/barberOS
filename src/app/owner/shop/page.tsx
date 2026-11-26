import Link from "next/link";
import { requireRole } from "@/lib/session";
import { getOpeningHours, getShop } from "@/lib/shop";
import { Field, Flash, PageHeader } from "@/components/ui";
import { updateShop } from "../actions";

export default async function ShopSettings({ searchParams }: PageProps<"/owner/shop">) {
  await requireRole("owner");
  const sp = (await searchParams) as { ok?: string; error?: string };
  const shop = await getShop();
  const hours = await getOpeningHours();

  return (
    <>
      <PageHeader eyebrow="Owner" title="Shop information" desc="What customers see on the website, and the rules the booking system follows." />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <form action={updateShop} className="card space-y-6 p-6">
          <section className="space-y-4">
            <h2 className="font-display text-lg font-semibold">Shop details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Shop name"><input name="name" required defaultValue={shop.name} className="input" /></Field>
              <Field label="Tagline"><input name="tagline" defaultValue={shop.tagline ?? ""} className="input" /></Field>
            </div>
            <Field label="Address"><input name="address" required defaultValue={shop.address} className="input" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone"><input name="phone" required defaultValue={shop.phone} className="input" /></Field>
              <Field label="Email"><input name="email" type="email" required defaultValue={shop.email} className="input" /></Field>
            </div>
          </section>
          <section className="space-y-4 border-t border-line pt-6">
            <h2 className="font-display text-lg font-semibold">Booking rules</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cancellation window (hours)" hint="Customers can’t cancel later than this before the start time.">
                <input name="cancel_window_hours" type="number" min={0} max={72} required defaultValue={shop.cancel_window_hours} className="input" />
              </Field>
              <Field label="Loyalty: ฿ spent per 1 point" hint="Points are added automatically when a visit is paid.">
                <input name="baht_per_point" type="number" min={1} max={1000} required defaultValue={shop.baht_per_point} className="input" />
              </Field>
            </div>
          </section>
          <div className="flex items-center gap-3">
            <button className="btn btn-primary">Save shop information</button>
            <span className="text-xs text-muted">Last updated {shop.updated_at.slice(0, 16)}</span>
          </div>
        </form>

        <aside className="card h-fit p-6">
          <h2 className="font-display text-lg font-semibold">Opening hours</h2>
          <p className="mt-1 text-sm text-muted">Worked out from your barbers’ schedules.</p>
          <ul className="mt-4 divide-y divide-line text-sm">
            {hours.map((h) => (
              <li key={h.day} className="flex justify-between py-2">
                <span>{h.day}</span>
                {h.open ? <span className="font-semibold tabular-nums">{h.open} – {h.close} <span className="font-normal text-muted">· {h.barbers}</span></span> : <span className="text-muted">Closed</span>}
              </li>
            ))}
          </ul>
          <Link href="/owner/barbers" className="btn btn-ghost btn-sm mt-4 w-full">Manage barbers</Link>
        </aside>
      </div>
    </>
  );
}
