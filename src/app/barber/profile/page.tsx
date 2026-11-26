import { one } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { Avatar, Field, Flash, PageHeader } from "@/components/ui";
import { updateProfile } from "../actions";

export default async function Profile({ searchParams }: PageProps<"/barber/profile">) {
  const s = await requireRole("barber");
  const sp = (await searchParams) as { ok?: string; error?: string };
  // SQL: SELECT profile (app_user JOIN barber)
  const me = (await one<{ full_name: string; email: string; phone: string | null; specialty: string | null; bio: string | null; commission_rate: number; hired_on: string }>(
    `SELECT u.full_name, u.email, u.phone, b.specialty, b.bio, b.commission_rate, b.hired_on
     FROM app_user u JOIN barber b ON b.barber_id = u.user_id WHERE u.user_id = $1`, [s.userId]))!;

  return (
    <>
      <PageHeader eyebrow="Barber" title="Profile" />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <form action={updateProfile} className="card space-y-4 p-6">
          <div className="mb-2 flex items-center gap-4">
            <Avatar name={me.full_name} size={56} />
            <div><p className="font-display text-xl font-semibold">{me.full_name}</p><p className="text-sm text-muted">{me.email}</p></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name"><input name="full_name" defaultValue={me.full_name} required className="input" /></Field>
            <Field label="Phone"><input name="phone" defaultValue={me.phone ?? ""} pattern="[0-9+\- ]{8,20}" className="input" /></Field>
          </div>
          <Field label="Specialty"><input name="specialty" defaultValue={me.specialty ?? ""} className="input" placeholder="e.g. Skin fades, beard sculpting" /></Field>
          <Field label="Bio" hint="Shown to customers when they pick a barber."><textarea name="bio" rows={4} defaultValue={me.bio ?? ""} className="input" /></Field>
          <button className="btn btn-primary">Save profile</button>
        </form>
        <div className="card h-fit space-y-4 p-6">
          <h2 className="font-display text-lg font-semibold">Employment</h2>
          <div><p className="label">Commission rate</p><p className="font-display text-2xl font-semibold">{me.commission_rate}%</p></div>
          <div><p className="label">Hired on</p><p className="font-semibold">{me.hired_on}</p></div>
          <p className="text-xs text-muted">Set by the owner.</p>
        </div>
      </div>
    </>
  );
}
