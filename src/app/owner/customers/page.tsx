import { sql } from "@/lib/db";
import { Search, Trash2 } from "lucide-react";
import { requireRole } from "@/lib/session";
import { fmtDate, money } from "@/lib/format";
import { Avatar, Badge, Flash, PageHeader } from "@/components/ui";
import { deleteCustomer, setPoints, toggleCustomer } from "../actions";

type C = { customer_id: number; full_name: string; email: string; phone: string | null; is_active: boolean; loyalty_points: number;
  visits: number; spent: number; last_visit: string | null; upcoming: number };

export default async function Customers({ searchParams }: PageProps<"/owner/customers">) {
  await requireRole("owner");
  const sp = (await searchParams) as { ok?: string; error?: string; q?: string };
  const q = sp.q?.trim() ?? "";
  // SQL: customer list with visits, total spent, last visit and upcoming bookings (aggregate + search)
  const rows = await sql<C>(`
    SELECT c.customer_id, u.full_name, u.email, u.phone, u.is_active, c.loyalty_points,
           count(p.payment_id)                                   AS visits,
           COALESCE(sum(p.amount + p.tip), 0)                    AS spent,
           max(a.start_at) FILTER (WHERE a.status = 'completed') AS last_visit,
           count(*) FILTER (WHERE a.status = 'booked' AND a.start_at > now()) AS upcoming
    FROM customer c
    JOIN app_user u ON u.user_id = c.customer_id
    LEFT JOIN appointment a ON a.customer_id = c.customer_id
    LEFT JOIN payment p ON p.appointment_id = a.appointment_id
    WHERE $1 = '' OR u.full_name ILIKE '%' || $1 || '%' OR u.email ILIKE '%' || $1 || '%' OR u.phone ILIKE '%' || $1 || '%'
    GROUP BY c.customer_id, u.user_id
    ORDER BY spent DESC`, [q]);

  return (
    <>
      <PageHeader title="Customers" desc="Who your regulars are, what they spend and their loyalty balance." />
      <Flash ok={sp.ok} error={sp.error} />
      <form className="mb-5 flex max-w-md gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={q} placeholder="Search name, email or phone" className="input pl-9" />
        </div>
        <button className="btn btn-primary">Search</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="table min-w-[900px]">
          <thead><tr><th>Customer</th><th className="text-right">Visits</th><th className="text-right">Spent</th><th>Last visit</th><th className="text-right">Upcoming</th><th>Loyalty points</th><th>Status</th><th /></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.customer_id} className={c.is_active ? "" : "opacity-60"}>
                <td><span className="flex items-center gap-3"><Avatar name={c.full_name} size={34} />
                  <span><b className="block">{c.full_name}</b><span className="text-xs text-muted">{c.email}, {c.phone}</span></span></span></td>
                <td className="text-right tabular-nums">{c.visits}</td>
                <td className="text-right font-semibold tabular-nums">{money(c.spent)}</td>
                <td className="text-sm">{c.last_visit ? fmtDate(c.last_visit) : <span className="text-muted">No visits yet</span>}</td>
                <td className="text-right tabular-nums">{c.upcoming}</td>
                <td>
                  <form action={setPoints} className="flex items-center gap-1">
                    <input type="hidden" name="id" value={c.customer_id} />
                    <input name="points" type="number" min={0} defaultValue={c.loyalty_points} className="input w-20 py-1 text-sm" aria-label={`Points for ${c.full_name}`} />
                    <button className="btn btn-ghost btn-sm">Set</button>
                  </form>
                </td>
                <td><Badge status={c.is_active ? "active" : "inactive"} /></td>
                <td><span className="flex justify-end gap-2">
                  <form action={toggleCustomer}><input type="hidden" name="id" value={c.customer_id} /><button className="btn btn-ghost btn-sm">{c.is_active ? "Suspend" : "Restore"}</button></form>
                  <form action={deleteCustomer}><input type="hidden" name="id" value={c.customer_id} /><button className="btn btn-danger btn-sm" aria-label={`Delete ${c.full_name}`}><Trash2 size={14} /></button></form>
                </span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
