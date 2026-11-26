# barberOS — Barber Shop Management (Group 11)

Next.js 16 + PostgreSQL 17 (raw SQL via `pg`, PL/pgSQL functions & triggers).

**Live:** https://barberos-blue.vercel.app (Vercel + Neon Postgres; every push to `main` deploys, and `npm run build` seeds an empty database once via `scripts/db-init.mjs`).

## Run
```bash
npm install
npm run db:start      # project-local Postgres on 127.0.0.1:5544 (data in .pgdata/)
npm run db:reset      # db/schema.sql + db/seed.sql
node scripts/db-check.mjs   # business-rule smoke test (rolls back)
npm run dev           # http://localhost:3000
```
First time only (no `.pgdata/` yet): `"C:/Program Files/PostgreSQL/17/bin/initdb.exe" -D .pgdata -U postgres -A trust -E UTF8 --locale=C`,
start it, then `createdb -h 127.0.0.1 -p 5544 -U postgres barberos`. Config lives in `.env.local`.

Demo logins (password `password123`): `customer@barberos.com`, `barber@barberos.com`, `owner@barberos.com`.

## Where things are
- `db/schema.sql` — tables, constraints, views, functions, triggers
- `src/app/{customer,barber,owner}` — one folder per role; every query has a `// SQL:` comment
- `/wireframe?on=1&next=/` toggles the greyscale wireframe style used for the slides (`on=0` to turn off)
- `docs/slides.html` → `docs/firstsubmission_11.pdf` (print with headless Chrome); screenshots in `docs/screens/`
