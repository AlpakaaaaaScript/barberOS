import Link from "next/link";
import { Plus, X } from "lucide-react";
import { sql } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { Avatar, Badge, Field, Flash, PageHeader, Stars } from "@/components/ui";
import { createBarber, toggleBarber, updateBarber } from "../actions";

type B = { barber_id: number; full_name: string; email: string; phone: string | null; is_active: boolean; specialty: string | null; bio: string | null;
  commission_rate: number; hired_on: string; avg_rating: number; review_count: number; completed_count: number; services: number[] };

export default async function Barbers({ searchParams }: PageProps<"/owner/barbers">) {
  await requireRole("owner");
  const sp = (await searchParams) as { ok?: string; error?: string; edit?: string; new?: string };
  // SQL: all barbers with stats and the services they offer (array_agg over barber_service)
  const barbers = await sql<B>(`
    SELECT v.*, COALESCE(array_agg(bs.service_id) FILTER (WHERE bs.service_id IS NOT NULL), '{}') AS services
    FROM v_barber_stats v LEFT JOIN barber_service bs ON bs.barber_id = v.barber_id
    GROUP BY v.barber_id, v.full_name, v.email, v.phone, v.is_active, v.specialty, v.bio, v.commission_rate, v.hired_on,
             v.avg_rating, v.review_count, v.completed_count
    ORDER BY v.is_active DESC, v.full_name`);
  // SQL: service list for the "services offered" checkboxes
  const services = await sql<{ service_id: number; name: string }>("SELECT service_id, name FROM service WHERE is_active ORDER BY name");
  const editing = sp.edit ? barbers.find((b) => b.barber_id === Number(sp.edit)) : undefined;
  const open = editing || sp.new;
  const svcNames = new Map(services.map((s) => [s.service_id, s.name]));

  return (
    <>
      <PageHeader title="Barbers" desc="Hire, edit and deactivate staff. Deactivated barbers disappear from booking but keep their history."
        action={<Link href="/owner/barbers?new=1" className="btn btn-brand"><Plus size={16} /> Add barber</Link>} />
      <Flash ok={sp.ok} error={sp.error} />

      {open && (
        <form action={editing ? updateBarber : createBarber} className="card mb-6 p-6 ring-2 ring-brand">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">{editing ? `Edit ${editing.full_name}` : "Add a new barber"}</h2>
            <Link href="/owner/barbers" className="btn btn-ghost btn-sm" aria-label="Close"><X size={14} /></Link>
          </div>
          {editing && <input type="hidden" name="id" value={editing.barber_id} />}
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Full name"><input name="full_name" required defaultValue={editing?.full_name} className="input" /></Field>
            <Field label="Phone"><input name="phone" defaultValue={editing?.phone ?? ""} className="input" /></Field>
            <Field label="Commission %" hint="Share of service revenue paid to the barber"><input name="commission_rate" type="number" min={0} max={100} step="0.5" required defaultValue={editing?.commission_rate ?? 40} className="input" /></Field>
            {!editing && <>
              <Field label="Login email"><input name="email" type="email" required className="input" /></Field>
              <Field label="Temporary password"><input name="password" type="text" required minLength={6} defaultValue="password123" className="input" /></Field>
            </>}
            <Field label="Specialty"><input name="specialty" defaultValue={editing?.specialty ?? ""} className="input" placeholder="e.g. Skin fades" /></Field>
          </div>
          <div className="mt-4"><Field label="Bio"><textarea name="bio" rows={2} defaultValue={editing?.bio ?? ""} className="input" /></Field></div>
          <fieldset className="mt-4">
            <legend className="label">Services offered</legend>
            <div className="flex flex-wrap gap-2">
              {services.map((s) => (
                <label key={s.service_id} className="cursor-pointer">
                  <input type="checkbox" name="services" value={s.service_id} defaultChecked={editing?.services.includes(s.service_id)} className="peer sr-only" />
                  <span className="block rounded-full border border-line px-3 py-1.5 text-sm font-medium peer-checked:border-ink peer-checked:bg-ink peer-checked:text-surface">{s.name}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="mt-6 flex gap-2"><button className="btn btn-primary">{editing ? "Save changes" : "Create barber"}</button><Link href="/owner/barbers" className="btn btn-ghost">Cancel</Link></div>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="table min-w-[760px]">
          <thead><tr><th>Barber</th><th>Services</th><th className="text-right">Commission</th><th>Rating</th><th className="text-right">Visits</th><th>Status</th><th /></tr></thead>
          <tbody>
            {barbers.map((b) => (
              <tr key={b.barber_id} className={b.is_active ? "" : "opacity-60"}>
                <td><span className="flex items-center gap-3"><Avatar name={b.full_name} size={36} />
                  <span><b className="block">{b.full_name}</b><span className="text-xs text-muted">{b.specialty}, {b.email}</span></span></span></td>
                <td className="max-w-56"><span className="text-xs text-muted">{b.services.map((id) => svcNames.get(id)).filter(Boolean).join(", ") || "None"}</span></td>
                <td className="text-right tabular-nums">{b.commission_rate}%</td>
                <td><span className="flex items-center gap-1.5"><Stars value={b.avg_rating} size={12} /><span className="text-xs">{b.avg_rating} ({b.review_count})</span></span></td>
                <td className="text-right tabular-nums">{b.completed_count}</td>
                <td><Badge status={b.is_active ? "active" : "inactive"} /></td>
                <td><span className="flex justify-end gap-2">
                  <Link href={`/owner/barbers?edit=${b.barber_id}`} className="btn btn-ghost btn-sm">Edit</Link>
                  <form action={toggleBarber}><input type="hidden" name="id" value={b.barber_id} />
                    <button className={`btn btn-sm ${b.is_active ? "btn-danger" : "btn-ghost"}`}>{b.is_active ? "Deactivate" : "Reactivate"}</button></form>
                </span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
