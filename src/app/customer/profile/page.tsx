import { one } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { Avatar, Field, Flash, PageHeader } from "@/components/ui";
import { changePassword, deleteAccount, updateProfile } from "../actions";

export default async function Profile({ searchParams }: PageProps<"/customer/profile">) {
  const s = await requireRole("customer");
  const sp = (await searchParams) as { ok?: string; error?: string };
  // SQL: SELECT profile (app_user JOIN customer)
  const me = (await one<{ full_name: string; email: string; phone: string | null; preferences: string | null; loyalty_points: number; created_at: string }>(
    `SELECT u.full_name, u.email, u.phone, u.created_at, c.preferences, c.loyalty_points
     FROM app_user u JOIN customer c ON c.customer_id = u.user_id WHERE u.user_id = $1`, [s.userId]))!;

  return (
    <>
      <PageHeader title="Profile & settings" />
      <Flash ok={sp.ok} error={sp.error} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <form action={updateProfile} className="card space-y-4 p-6">
          <div className="mb-2 flex items-center gap-4">
            <Avatar name={me.full_name} size={56} />
            <div><p className="font-display text-xl font-semibold">{me.full_name}</p><p className="text-sm text-muted">Member since {me.created_at.slice(0, 10)}, {me.loyalty_points} pts</p></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name"><input name="full_name" defaultValue={me.full_name} required className="input" /></Field>
            <Field label="Phone"><input name="phone" defaultValue={me.phone ?? ""} pattern="[0-9+\- ]{8,20}" className="input" /></Field>
          </div>
          <Field label="Email" hint="Email is your login and can’t be changed."><input value={me.email} disabled className="input opacity-60" /></Field>
          <Field label="Style preferences"><textarea name="preferences" rows={3} defaultValue={me.preferences ?? ""} className="input" placeholder="e.g. Low fade, scissors on top, sensitive skin" /></Field>
          <button className="btn btn-primary">Save profile</button>
        </form>

        <div className="space-y-6">
          <form action={changePassword} className="card space-y-4 p-6">
            <h2 className="font-display text-lg font-semibold">Change password</h2>
            <Field label="Current password"><input name="current" type="password" required className="input" /></Field>
            <Field label="New password"><input name="new" type="password" minLength={6} required className="input" /></Field>
            <button className="btn btn-ghost w-full">Update password</button>
          </form>
          <form action={deleteAccount} className="card border-bad/30 p-6">
            <h2 className="font-display text-lg font-semibold text-bad">Delete account</h2>
            <p className="mt-1 text-sm text-muted">Removes your profile, bookings and reviews permanently.</p>
            <label className="mt-4 flex items-center gap-2 text-sm"><input type="checkbox" required /> I understand this can’t be undone</label>
            <button className="btn btn-danger mt-3 w-full">Delete my account</button>
          </form>
        </div>
      </div>
    </>
  );
}
