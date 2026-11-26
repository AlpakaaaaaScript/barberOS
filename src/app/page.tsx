import Link from "next/link";
import { one, sql } from "@/lib/db";
import { getSession } from "@/lib/session";
import { money } from "@/lib/format";
import { Logo } from "@/components/shell";
import { getOpeningHours, getShop } from "@/lib/shop";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { cat } = await searchParams;
  const session = await getSession();
  // SQL: list active services for the public menu
  const services = await sql<{ service_id: number; name: string; category: string; description: string; duration_min: number; price: number }>(
    "SELECT service_id, name, category, description, duration_min, price FROM service WHERE is_active ORDER BY price");
  // SQL: each active barber with their next three free slots today (shortest service they offer, via get_available_slots)
  const barbers = await sql<{ barber_id: number; full_name: string; specialty: string; bio: string; avg_rating: number; review_count: number; next_free: string[] | null }>(`
    SELECT b.barber_id, b.full_name, b.specialty, b.bio, b.avg_rating, b.review_count,
           (SELECT (array_agg(to_char(s.slot_start, 'HH24:MI') ORDER BY s.slot_start))[1:3] FROM get_available_slots(b.barber_id,
              (SELECT bs.service_id FROM barber_service bs JOIN service sv USING (service_id)
               WHERE bs.barber_id = b.barber_id AND sv.is_active ORDER BY sv.duration_min LIMIT 1), current_date) s) AS next_free
    FROM v_barber_stats b WHERE b.is_active ORDER BY b.barber_id`);
  // SQL: the shop clock (the database runs on Bangkok time)
  const now = (await one<{ dow: number; hm: string }>("SELECT extract(dow FROM now())::int AS dow, to_char(now(), 'HH24:MI') AS hm"))!;
  const shop = await getShop();
  const hours = await getOpeningHours();
  const book = session ? (session.role === "customer" ? "/customer/book" : `/${session.role}`) : "/register";

  const todayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.dow];
  const today = hours.find((h) => h.day === todayName);
  const openNow = !!today?.open && now.hm >= today.open && now.hm < today.close!;
  const nextOpen = hours.slice(hours.findIndex((h) => h.day === todayName) + 1).concat(hours).find((h) => h.open);
  const status = openNow ? `Open now, until ${today!.close}`
    : today?.open && now.hm < today.open ? `Opens today at ${today.open}` : `Closed, opens ${nextOpen?.day} at ${nextOpen?.open}`;

  const categories = ["All", ...new Set(services.map((s) => s.category))];
  const active = categories.includes(String(cat)) ? String(cat) : "All";
  const shown = active === "All" ? services : services.filter((s) => s.category === active);
  const [first, ...rest] = (shop.tagline ?? shop.name).split(". ");

  return (
    <div className="bg-paper">
      {/* Masthead */}
      <header className="border-b border-ink">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-5 md:px-10">
          <Logo />
          <span className={`tag hidden sm:inline-flex ${openNow ? "tag-in" : "tag-out"}`}>{status}</span>
          <nav className="ml-auto flex items-center gap-1 text-sm">
            <a href="#services" className="hidden px-3 py-2 font-semibold text-muted hover:text-ink md:block">Services</a>
            <a href="#barbers" className="hidden px-3 py-2 font-semibold text-muted hover:text-ink md:block">Barbers</a>
            <a href="#hours" className="hidden px-3 py-2 font-semibold text-muted hover:text-ink md:block">Hours</a>
            {session
              ? <Link href={`/${session.role}`} className="btn btn-primary ml-2">Open my portal</Link>
              : <><Link href="/login" className="px-2 py-2 font-semibold whitespace-nowrap text-ink sm:px-3">Sign in</Link>
                 <Link href="/register" className="btn btn-primary ml-1 px-3 sm:px-4">Create account</Link></>}
          </nav>
        </div>
      </header>

      {/* Hero: the headline beside the next free chair of every barber, live */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 md:min-h-[min(calc(100svh-4rem),46rem)] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-16 md:px-10 md:py-20">
        <div>
          <h1 className="text-[clamp(3rem,7vw,5.5rem)] leading-none">{first.replace(/\.$/, "")}.{rest.length ? <><br />{rest.join(". ")}</> : null}</h1>
          <p className="mt-6 max-w-md text-lg text-ink-2">Pick your barber and a free time, then walk straight in.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={book} className="btn btn-primary min-h-12 px-6 text-base">Book an appointment</Link>
            <a href="#services" className="btn min-h-12 px-6 text-base">See prices</a>
          </div>
          <p className="mt-6 text-sm text-muted">{shop.address}</p>
        </div>
        <div>
          <h2 className="text-xl">Free chairs today</h2>
          <ul className="ruled mt-4">
            {barbers.map((b) => (
              <li key={b.barber_id} className="flex items-center gap-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{b.full_name}</p>
                  <p className="text-sm text-muted">{b.specialty}</p>
                </div>
                {b.next_free?.length
                  ? <span className="flex flex-wrap justify-end gap-1.5">{b.next_free.map((t) => (
                      <Link key={t} href={book} aria-label={`Book ${b.full_name} at ${t}`} className="tag tag-in min-h-8 px-3 font-mono text-sm no-underline hover:underline">{t}</Link>))}</span>
                  : <span className="tag tag-out min-h-8 px-3 text-sm">Full today</span>}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted">Live from the booking system, Bangkok time.</p>
        </div>
      </section>

      {/* The menu, switched by category */}
      <section id="services" className="border-t border-line bg-paper-2">
        <div className="mx-auto max-w-6xl px-5 py-[var(--section-gap-s)] md:px-10">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <h2 className="text-[clamp(2rem,3.6vw,3.25rem)]">Services & prices</h2>
            <nav aria-label="Service category" className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Link key={c} href={c === "All" ? "/#services" : `/?cat=${c}#services`} scroll={false} aria-current={c === active ? "true" : undefined}
                  className={`tag min-h-9 px-4 text-sm no-underline ${c === active ? "tag-on" : "tag-out hover:text-ink"}`}>{c}</Link>
              ))}
            </nav>
          </div>
          <ul className="ruled mt-10">
            {shown.map((s) => (
              <li key={s.service_id} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 gap-y-1 py-5 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_6rem_6rem]">
                <h3 className="text-lg font-semibold tracking-normal">{s.name}</h3>
                <p className="order-3 col-span-2 text-ink-2 md:order-none md:col-span-1">{s.description}</p>
                <p className="hidden font-mono text-sm text-muted md:block">{s.duration_min} min</p>
                <p className="text-right font-display text-xl font-bold text-ink tabular-nums">{money(s.price)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How booking works, as a notice */}
      <section className="mx-auto max-w-6xl px-5 py-[var(--section-gap-s)] md:px-10">
        <h2 className="text-[clamp(2rem,3.6vw,3.25rem)]">Three steps to the chair</h2>
        <ol className="mt-12 grid gap-10 md:grid-cols-3">
          {[
            ["Choose a service", "Every price is on the menu above."],
            ["Pick barber & time", "Only free times are offered, so nobody is double booked."],
            ["Walk in, sit down", `Move or cancel online up to ${shop.cancel_window_hours} hours before.`],
          ].map(([t, d], i) => (
            <li key={t} className="border-t border-ink pt-5">
              <p className="font-display text-6xl font-bold text-ink">{i + 1}</p>
              <h3 className="mt-6 text-xl">{t}</h3>
              <p className="mt-2 text-ink-2">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* The barbers, with the ratings customers gave them */}
      <section id="barbers" className="border-t border-line">
        <div className="mx-auto max-w-6xl px-5 py-[var(--section-gap-s)] md:px-10">
          <h2 className="text-[clamp(2rem,3.6vw,3.25rem)]">The barbers</h2>
          <ul className="ruled mt-10">
            {barbers.map((b) => (
              <li key={b.barber_id} className="grid gap-x-8 gap-y-2 py-6 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_9rem] md:items-baseline">
                <div>
                  <h3 className="text-2xl">{b.full_name}</h3>
                  <p className="text-sm font-semibold text-ink-2">{b.specialty}</p>
                </div>
                <p className="max-w-xl text-ink-2">{b.bio}</p>
                <p className="flex items-baseline gap-2 md:justify-end"><span className="font-display text-3xl font-bold text-ink tabular-nums">{b.avg_rating}</span><span className="text-sm text-muted">from {b.review_count} reviews</span></p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Hours and the address, closing on the booking */}
      <section id="hours" className="border-t border-line bg-paper-2">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-[var(--section-gap-s)] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-16 md:px-10">
          <div>
            <h2 className="text-[clamp(2rem,3.6vw,3.25rem)]">Opening hours</h2>
            <ul className="ruled mt-8">
              {hours.map((h) => {
                const isToday = h.day === todayName;
                return (
                  <li key={h.day} className={`flex items-center justify-between py-3 ${isToday ? "font-semibold text-ink" : ""}`}>
                    <span className="flex items-center gap-3">{h.day}{isToday && <span className={`tag ${openNow ? "tag-in" : "tag-on"}`}>{openNow ? "Open now" : "Today"}</span>}</span>
                    <span className="font-mono text-sm">{h.open ? `${h.open} to ${h.close}` : "Closed"}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="flex flex-col justify-between gap-10">
            <div>
              <h2 className="text-[clamp(2rem,3.6vw,3.25rem)]">Find us</h2>
              <p className="mt-8 text-lg text-ink">{shop.address}</p>
              <p className="mt-2 text-ink-2"><a href={`tel:${shop.phone}`} className="link">{shop.phone}</a></p>
              <p className="mt-1 text-ink-2"><a href={`mailto:${shop.email}`} className="link">{shop.email}</a></p>
            </div>
            <div className="border-t border-ink pt-6">
              <p className="text-ink-2">Free cancellation up to {shop.cancel_window_hours} hours before your visit.</p>
              <Link href={book} className="btn btn-primary mt-5 min-h-12 px-6 text-base">Book an appointment</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Mast footer */}
      <footer className="border-t border-ink">
        <div className="mx-auto max-w-6xl px-5 py-14 md:px-10">
          <p className="font-display text-[clamp(2.5rem,8vw,6rem)] leading-none font-bold tracking-tight text-ink">{shop.name}</p>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted">
            <a href="#services" className="hover:text-ink">Services</a>
            <a href="#barbers" className="hover:text-ink">Barbers</a>
            <a href="#hours" className="hover:text-ink">Hours</a>
            <Link href="/login" className="hover:text-ink">Sign in</Link>
            <span className="md:ml-auto">© 2026 {shop.name}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
