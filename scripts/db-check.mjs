// Smoke test for the business rules in schema.sql:  node scripts/db-check.mjs
import pg from "pg";
import assert from "node:assert/strict";
const c = new pg.Client({ connectionString: "postgres://postgres@127.0.0.1:5544/barberos" });
await c.connect();
await c.query("BEGIN");
const q = async (s, p) => (await c.query(s, p)).rows;
const fails = async (s, p, re) => { await c.query("SAVEPOINT x"); try { await c.query(s, p); assert.fail("should fail: " + s); } catch (e) { assert.match(e.message, re); } await c.query("ROLLBACK TO x"); };

assert.equal((await q("select * from authenticate('customer@barberos.com','password123')"))[0].role, "customer");
assert.equal((await q("select * from authenticate('customer@barberos.com','wrong')")).length, 0);
const day = (await q("select (current_date + ((9 - extract(dow from current_date)::int) % 7) + 7) d"))[0].d; // a Tuesday next week
const slots = await q("select slot_start from get_available_slots(2,1,$1)", [day]);
assert.ok(slots.length > 0, "Marco has slots on Tuesday");
const id = (await q("select book_appointment(6,2,1,$1) id", [slots[0].slot_start]))[0].id;
await fails("select book_appointment(7,2,1,$1)", [slots[0].slot_start], /no longer available/);
await fails("insert into appointment(customer_id,barber_id,service_id,start_at,end_at,price) values(7,2,1,$1,$1::timestamp+interval '45 min',350)", [slots[0].slot_start], /no_double_booking/);
await fails("select book_appointment(6,2,5,$1)", [slots[1].slot_start], /does not offer/);
await fails("insert into review(appointment_id,rating) values($1,5)", [id], /completed visit/);
await q("select checkout_appointment($1,2,50,'cash')", [id]);
assert.equal((await q("select status from appointment where appointment_id=$1", [id]))[0].status, "completed");
await fails("update appointment set status='booked' where appointment_id=$1", [id], /already completed/);
await fails("insert into review(appointment_id,rating) values($1,6)", [id], /check/);
const e = (await q("select * from barber_earnings(2, current_date-60, current_date+60)"))[0];
assert.ok(Number(e.take_home) > 0);
console.log("all business-rule checks passed");
await c.query("ROLLBACK"); await c.end();
