// Recreates the schema and loads demo data:  npm run db:reset
import { readFileSync } from "node:fs";
import pg from "pg";

const client = new pg.Client({ connectionString: process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:5544/barberos" });
await client.connect();
for (const f of ["db/schema.sql", "db/seed.sql"]) {
  await client.query(readFileSync(f, "utf8"));
  console.log("ran", f);
}
const { rows } = await client.query(`select (select count(*) from appointment) appts, (select count(*) from payment) payments, (select count(*) from review) reviews`);
console.log(rows[0]);
await client.end();
