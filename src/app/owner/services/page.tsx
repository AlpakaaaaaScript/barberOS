import Link from "next/link";
import { Plus, Trash2, X } from "lucide-react";
import { sql } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { money } from "@/lib/format";
import { Badge, Field, Flash, PageHeader } from "@/components/ui";
import { deleteService, saveService, toggleService } from "../actions";

type S = { service_id: number; name: string; category: string; description: string | null; duration_min: number; price: number;
  is_active: boolean; barbers: number; bookings: number };

export default async function Services({ searchParams }: PageProps<"/owner/services">) {
  await requireRole("owner");
  const sp = (await searchParams) as { ok?: string; error?: string; edit?: string; new?: string };
  // SQL: services with number of barbers offering them and bookings in the last 30 days
  const rows = await sql<S>(`
    SELECT s.*,
           (SELECT count(*) FROM barber_service bs WHERE bs.service_id = s.service_id) AS barbers,
           (SELECT count(*) FROM appointment a WHERE a.service_id = s.service_id AND a.start_at >= now() - interval '30 days') AS bookings
    FROM service s ORDER BY s.is_active DESC, s.category, s.price`);
  const editing = rows.find((r) => r.service_id === Number(sp.edit));
  const open = editing || sp.new;

  return (
    <>
      <PageHeader title="Services & pricing" desc="Price changes apply to new bookings. Existing bookings keep the price they were booked at."
        action={<Link href="/owner/services?new=1" className="btn btn-brand"><Plus size={16} /> Add service</Link>} />
      <Flash ok={sp.ok} error={sp.error} />

      {open && (
        <form action={saveService} className="card mb-6 p-6 ring-2 ring-brand">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">{editing ? `Edit ${editing.name}` : "New service"}</h2>
            <Link href="/owner/services" className="btn btn-ghost btn-sm" aria-label="Close"><X size={14} /></Link>
          </div>
          <input type="hidden" name="id" value={editing?.service_id ?? 0} />
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2"><Field label="Name"><input name="name" required defaultValue={editing?.name} className="input" /></Field></div>
            <Field label="Category">
              <select name="category" defaultValue={editing?.category ?? "Hair"} className="input">
                {["Hair", "Beard", "Combo", "Colour", "Care"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Minutes"><input name="duration_min" type="number" min={10} max={240} step={5} required defaultValue={editing?.duration_min ?? 30} className="input" /></Field>
              <Field label="Price ฿"><input name="price" type="number" min={0} step={10} required defaultValue={editing?.price ?? 300} className="input" /></Field>
            </div>
          </div>
          <div className="mt-4"><Field label="Description"><input name="description" defaultValue={editing?.description ?? ""} className="input" /></Field></div>
          <div className="mt-6 flex gap-2"><button className="btn btn-primary">{editing ? "Save changes" : "Add service"}</button><Link href="/owner/services" className="btn btn-ghost">Cancel</Link></div>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="table min-w-[720px]">
          <thead><tr><th>Service</th><th>Category</th><th className="text-right">Duration</th><th className="text-right">Price</th><th className="text-right">Barbers</th><th className="text-right">Bookings 30d</th><th>Status</th><th /></tr></thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.service_id} className={s.is_active ? "" : "opacity-60"}>
                <td><b className="block">{s.name}</b><span className="text-xs text-muted">{s.description}</span></td>
                <td><span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-ink">{s.category}</span></td>
                <td className="text-right tabular-nums">{s.duration_min} min</td>
                <td className="text-right font-semibold tabular-nums">{money(s.price)}</td>
                <td className="text-right tabular-nums">{s.barbers}</td>
                <td className="text-right tabular-nums">{s.bookings}</td>
                <td><Badge status={s.is_active ? "active" : "inactive"} /></td>
                <td><span className="flex justify-end gap-2">
                  <Link href={`/owner/services?edit=${s.service_id}`} className="btn btn-ghost btn-sm">Edit</Link>
                  <form action={toggleService}><input type="hidden" name="id" value={s.service_id} /><button className="btn btn-ghost btn-sm">{s.is_active ? "Hide" : "Show"}</button></form>
                  <form action={deleteService}><input type="hidden" name="id" value={s.service_id} /><button className="btn btn-danger btn-sm" aria-label={`Delete ${s.name}`}><Trash2 size={14} /></button></form>
                </span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
