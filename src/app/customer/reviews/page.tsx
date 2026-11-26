import { Star, Trash2 } from "lucide-react";
import { sql } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { fmtDate } from "@/lib/format";
import { Avatar, Empty, Flash, PageHeader, Stars } from "@/components/ui";
import { deleteReview, saveReview } from "../actions";

type Row = { appointment_id: number; start_at: string; service_name: string; barber_name: string; review_id: number | null; rating: number | null; comment: string | null };

function RatingInput({ value = 5 }: { value?: number }) {
  return (
    <div className="flex flex-row-reverse justify-end gap-1">
      {[5, 4, 3, 2, 1].map((n) => (
        <label key={n} className="cursor-pointer">
          <input type="radio" name="rating" value={n} defaultChecked={n === value} className="peer sr-only" required />
          <Star size={26} className="text-line transition-colors peer-checked:fill-brand peer-checked:text-brand hover:text-brand" />
        </label>
      ))}
    </div>
  );
}

export default async function Reviews({ searchParams }: PageProps<"/customer/reviews">) {
  const s = await requireRole("customer");
  const sp = (await searchParams) as { ok?: string; error?: string; appointment?: string; edit?: string };
  // SQL: completed visits of this customer with their review (LEFT JOIN via v_appointment)
  const rows = await sql<Row>(
    `SELECT appointment_id, start_at, service_name, barber_name, review_id, rating, comment
     FROM v_appointment WHERE customer_id = $1 AND status = 'completed' ORDER BY start_at DESC`, [s.userId]);
  const pending = rows.filter((r) => !r.review_id);
  const done = rows.filter((r) => r.review_id);
  const editing = Number(sp.edit) || 0;
  const focus = Number(sp.appointment) || pending[0]?.appointment_id;

  return (
    <>
      <PageHeader title="My reviews" desc="Rate completed visits. It helps other customers choose and helps barbers improve." />
      <Flash ok={sp.ok} error={sp.error} />

      {pending.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 font-display text-lg font-semibold">Waiting for your review <span className="text-muted">({pending.length})</span></h2>
          <div className="grid gap-4 md:grid-cols-2">
            {pending.slice(0, 4).map((r) => (
              <form key={r.appointment_id} action={saveReview} className={`card p-5 ${r.appointment_id === focus ? "ring-2 ring-brand" : ""}`}>
                <input type="hidden" name="appointment" value={r.appointment_id} />
                <div className="flex items-center gap-3">
                  <Avatar name={r.barber_name} size={38} />
                  <div><p className="font-semibold">{r.service_name}</p><p className="text-sm text-muted">{r.barber_name}, {fmtDate(r.start_at)}</p></div>
                </div>
                <div className="mt-4"><RatingInput /></div>
                <textarea name="comment" rows={2} className="input mt-3" placeholder="How was your visit?" />
                <button className="btn btn-primary btn-sm mt-3">Submit review</button>
              </form>
            ))}
          </div>
        </section>
      )}

      <h2 className="mb-3 font-display text-lg font-semibold">Published reviews</h2>
      {!done.length ? <Empty title="No reviews yet" desc="After your next visit you can rate your barber here." /> : (
        <div className="space-y-3">
          {done.map((r) => r.review_id === editing ? (
            <form key={r.review_id} action={saveReview} className="card p-5 ring-2 ring-brand">
              <input type="hidden" name="appointment" value={r.appointment_id} />
              <p className="font-semibold">{r.service_name}, {r.barber_name}</p>
              <div className="mt-3"><RatingInput value={r.rating!} /></div>
              <textarea name="comment" rows={2} defaultValue={r.comment ?? ""} className="input mt-3" />
              <div className="mt-3 flex gap-2"><button className="btn btn-primary btn-sm">Save changes</button><a href="/customer/reviews" className="btn btn-ghost btn-sm">Cancel</a></div>
            </form>
          ) : (
            <div key={r.review_id} className="card flex flex-wrap items-start gap-4 p-5">
              <Avatar name={r.barber_name} size={38} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{r.barber_name}</p><Stars value={r.rating!} /></div>
                <p className="text-xs text-muted">{r.service_name}, {fmtDate(r.start_at)}</p>
                {r.comment && <p className="mt-2 text-sm">“{r.comment}”</p>}
              </div>
              <div className="flex gap-2">
                <a href={`/customer/reviews?edit=${r.review_id}`} className="btn btn-ghost btn-sm">Edit</a>
                <form action={deleteReview}><input type="hidden" name="id" value={r.review_id!} /><button className="btn btn-danger btn-sm" aria-label="Delete review"><Trash2 size={14} /></button></form>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
