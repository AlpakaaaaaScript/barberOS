// Runs before `next build`: loads schema + demo data only if the database is empty. Never wipes existing data.
import { readFileSync } from "node:fs";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) { console.warn("db-init: DATABASE_URL not set — skipping (connect a database, then redeploy)"); process.exit(0); }
const client = new pg.Client({ connectionString: url });
await client.connect();
const { rows } = await client.query("SELECT to_regclass('public.shop_info') AS t");
if (rows[0].t) console.log("db-init: schema already present — nothing to do");
else {
  for (const f of ["db/schema.sql", "db/seed.sql"]) { await client.query(readFileSync(f, "utf8")); console.log("db-init: ran", f); }
}
await client.end();
