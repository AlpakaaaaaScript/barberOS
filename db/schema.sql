-- =====================================================================
--  barberOS — Barber Shop Management Database
--  Group 11 · PostgreSQL 17
--  Schema: tables, constraints, views, stored functions, triggers
-- =====================================================================

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- The shop runs on Bangkok time (TIMESTAMP columns hold local shop time)
SET timezone TO 'Asia/Bangkok';
DO $$ BEGIN EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'Asia/Bangkok'); END $$;

CREATE EXTENSION IF NOT EXISTS pgcrypto;    -- crypt()/gen_salt() for password hashing
CREATE EXTENSION IF NOT EXISTS btree_gist;  -- lets an EXCLUDE constraint mix "=" and "&&"

-- ---------------------------------------------------------------------
--  Enumerated domains
-- ---------------------------------------------------------------------
CREATE TYPE user_role   AS ENUM ('customer', 'barber', 'owner');
CREATE TYPE appt_status AS ENUM ('booked', 'in_progress', 'completed', 'cancelled', 'no_show');
CREATE TYPE pay_method  AS ENUM ('cash', 'card', 'qr');

-- ---------------------------------------------------------------------
--  Shop information (single row, managed by the owner)
-- ---------------------------------------------------------------------
CREATE TABLE shop_info (
    shop_id             SMALLINT PRIMARY KEY DEFAULT 1 CHECK (shop_id = 1),   -- only one shop
    name                TEXT     NOT NULL,
    tagline             TEXT,
    address             TEXT     NOT NULL,
    phone               TEXT     NOT NULL,
    email               TEXT     NOT NULL,
    cancel_window_hours SMALLINT NOT NULL DEFAULT 2  CHECK (cancel_window_hours BETWEEN 0 AND 72),
    baht_per_point      SMALLINT NOT NULL DEFAULT 10 CHECK (baht_per_point BETWEEN 1 AND 1000),
    updated_at          TIMESTAMP NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
--  Users (super-type) and role sub-types
-- ---------------------------------------------------------------------
CREATE TABLE app_user (
    user_id       SERIAL PRIMARY KEY,
    email         TEXT        NOT NULL UNIQUE CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    password_hash TEXT        NOT NULL,
    full_name     TEXT        NOT NULL CHECK (length(trim(full_name)) > 1),
    phone         TEXT        CHECK (phone ~ '^[0-9+\- ]{8,20}$'),
    role          user_role   NOT NULL,
    is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP   NOT NULL DEFAULT now()
);

CREATE TABLE customer (
    customer_id    INT PRIMARY KEY REFERENCES app_user(user_id) ON DELETE CASCADE,
    loyalty_points INT  NOT NULL DEFAULT 0 CHECK (loyalty_points >= 0),
    preferences    TEXT
);

CREATE TABLE barber (
    barber_id       INT PRIMARY KEY REFERENCES app_user(user_id) ON DELETE CASCADE,
    specialty       TEXT,
    bio             TEXT,
    commission_rate NUMERIC(5,2) NOT NULL DEFAULT 40 CHECK (commission_rate BETWEEN 0 AND 100),
    hired_on        DATE NOT NULL DEFAULT current_date
);

-- ---------------------------------------------------------------------
--  Service catalogue and which barber can perform which service (M:N)
-- ---------------------------------------------------------------------
CREATE TABLE service (
    service_id   SERIAL PRIMARY KEY,
    name         TEXT         NOT NULL UNIQUE,
    category     TEXT         NOT NULL DEFAULT 'Hair',
    description  TEXT,
    duration_min INT          NOT NULL CHECK (duration_min BETWEEN 10 AND 240),
    price        NUMERIC(8,2) NOT NULL CHECK (price >= 0),
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE barber_service (
    barber_id  INT REFERENCES barber(barber_id)   ON DELETE CASCADE,
    service_id INT REFERENCES service(service_id) ON DELETE CASCADE,
    PRIMARY KEY (barber_id, service_id)
);

-- ---------------------------------------------------------------------
--  Availability: weekly working hours + time off
-- ---------------------------------------------------------------------
CREATE TABLE working_hours (
    barber_id  INT      REFERENCES barber(barber_id) ON DELETE CASCADE,
    weekday    SMALLINT CHECK (weekday BETWEEN 0 AND 6),     -- 0 = Sunday
    start_time TIME     NOT NULL,
    end_time   TIME     NOT NULL,
    PRIMARY KEY (barber_id, weekday),
    CHECK (end_time > start_time)
);

CREATE TABLE time_off (
    time_off_id SERIAL PRIMARY KEY,
    barber_id   INT  NOT NULL REFERENCES barber(barber_id) ON DELETE CASCADE,
    start_date  DATE NOT NULL,
    end_date    DATE NOT NULL,
    reason      TEXT,
    CHECK (end_date >= start_date)
);

-- ---------------------------------------------------------------------
--  Appointments — the core transaction
-- ---------------------------------------------------------------------
CREATE TABLE appointment (
    appointment_id SERIAL PRIMARY KEY,
    customer_id    INT          NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
    barber_id      INT          NOT NULL REFERENCES barber(barber_id),
    service_id     INT          NOT NULL REFERENCES service(service_id),
    start_at       TIMESTAMP    NOT NULL,
    end_at         TIMESTAMP    NOT NULL,
    price          NUMERIC(8,2) NOT NULL CHECK (price >= 0),   -- price snapshot at booking time
    status         appt_status  NOT NULL DEFAULT 'booked',
    note           TEXT,
    created_at     TIMESTAMP    NOT NULL DEFAULT now(),
    CHECK (end_at > start_at),
    -- Business rule: a barber can never be double-booked (cancelled / no-show slots are free again)
    CONSTRAINT no_double_booking EXCLUDE USING gist (
        barber_id WITH =,
        tsrange(start_at, end_at) WITH &&
    ) WHERE (status IN ('booked', 'in_progress', 'completed'))
);
CREATE INDEX appointment_customer_idx ON appointment (customer_id, start_at);
CREATE INDEX appointment_start_idx    ON appointment (start_at);

CREATE TABLE payment (
    payment_id     SERIAL PRIMARY KEY,
    appointment_id INT          NOT NULL UNIQUE REFERENCES appointment(appointment_id) ON DELETE CASCADE,
    amount         NUMERIC(8,2) NOT NULL CHECK (amount >= 0),
    tip            NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (tip >= 0),
    method         pay_method   NOT NULL,
    paid_at        TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE review (
    review_id      SERIAL PRIMARY KEY,
    appointment_id INT       NOT NULL UNIQUE REFERENCES appointment(appointment_id) ON DELETE CASCADE,
    rating         SMALLINT  NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment        TEXT,
    created_at     TIMESTAMP NOT NULL DEFAULT now()
);

-- =====================================================================
--  Views
-- =====================================================================
CREATE VIEW v_appointment AS
SELECT a.appointment_id, a.start_at, a.end_at, a.status, a.price, a.note,
       a.customer_id, cu.full_name AS customer_name, cu.phone AS customer_phone,
       a.barber_id,   bu.full_name AS barber_name,
       a.service_id,  s.name AS service_name, s.duration_min,
       p.payment_id,  p.amount AS paid_amount, p.tip, p.method,
       r.review_id,   r.rating, r.comment
FROM appointment a
JOIN app_user cu ON cu.user_id = a.customer_id
JOIN app_user bu ON bu.user_id = a.barber_id
JOIN service  s  ON s.service_id = a.service_id
LEFT JOIN payment p ON p.appointment_id = a.appointment_id
LEFT JOIN review  r ON r.appointment_id = a.appointment_id;

CREATE VIEW v_barber_stats AS
SELECT b.barber_id, u.full_name, u.email, u.phone, u.is_active, b.specialty, b.bio,
       b.commission_rate, b.hired_on,
       COALESCE(round(avg(r.rating), 1), 0)                        AS avg_rating,
       count(r.review_id)                                          AS review_count,
       count(a.appointment_id) FILTER (WHERE a.status = 'completed') AS completed_count
FROM barber b
JOIN app_user u ON u.user_id = b.barber_id
LEFT JOIN appointment a ON a.barber_id = b.barber_id
LEFT JOIN review r      ON r.appointment_id = a.appointment_id
GROUP BY b.barber_id, u.user_id;

-- =====================================================================
--  Stored functions (application logic in PL/pgSQL)
-- =====================================================================

-- F1. Register a new customer account (super-type + sub-type in one transaction)
CREATE FUNCTION register_customer(p_email TEXT, p_password TEXT, p_name TEXT, p_phone TEXT)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE v_id INT;
BEGIN
    IF length(p_password) < 6 THEN
        RAISE EXCEPTION 'Password must be at least 6 characters';
    END IF;
    INSERT INTO app_user (email, password_hash, full_name, phone, role)
    VALUES (lower(trim(p_email)), crypt(p_password, gen_salt('bf')), trim(p_name), NULLIF(trim(p_phone), ''), 'customer')
    RETURNING user_id INTO v_id;
    INSERT INTO customer (customer_id) VALUES (v_id);
    RETURN v_id;
END $$;

-- F2. Create a barber account (used by the owner)
CREATE FUNCTION create_barber(p_email TEXT, p_password TEXT, p_name TEXT, p_phone TEXT,
                              p_specialty TEXT, p_bio TEXT, p_commission NUMERIC)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE v_id INT;
BEGIN
    INSERT INTO app_user (email, password_hash, full_name, phone, role)
    VALUES (lower(trim(p_email)), crypt(p_password, gen_salt('bf')), trim(p_name), NULLIF(trim(p_phone), ''), 'barber')
    RETURNING user_id INTO v_id;
    INSERT INTO barber (barber_id, specialty, bio, commission_rate)
    VALUES (v_id, p_specialty, p_bio, p_commission);
    -- default schedule: Tue–Sat 10:00–19:00
    INSERT INTO working_hours (barber_id, weekday, start_time, end_time)
    SELECT v_id, d, '10:00', '19:00' FROM generate_series(2, 6) d;
    RETURN v_id;
END $$;

-- F3. Log in: returns the user only if the password matches and the account is active
CREATE FUNCTION authenticate(p_email TEXT, p_password TEXT)
RETURNS TABLE (user_id INT, full_name TEXT, role user_role) LANGUAGE sql AS $$
    SELECT u.user_id, u.full_name, u.role
    FROM app_user u
    WHERE u.email = lower(trim(p_email))
      AND u.password_hash = crypt(p_password, u.password_hash)
      AND u.is_active;
$$;

-- F4. Free time slots for a barber + service on a date (30-minute grid)
CREATE FUNCTION get_available_slots(p_barber INT, p_service INT, p_date DATE)
RETURNS TABLE (slot_start TIMESTAMP) LANGUAGE sql STABLE AS $$
    WITH svc AS (SELECT make_interval(mins => duration_min) AS dur FROM service WHERE service_id = p_service),
         wh  AS (SELECT start_time, end_time FROM working_hours
                 WHERE barber_id = p_barber AND weekday = extract(dow FROM p_date))
    SELECT g AS slot_start
    FROM wh, svc,
         generate_series(p_date + wh.start_time, p_date + wh.end_time - svc.dur, interval '30 minutes') g
    WHERE g > now()
      AND NOT EXISTS (SELECT 1 FROM time_off t
                      WHERE t.barber_id = p_barber AND p_date BETWEEN t.start_date AND t.end_date)
      AND NOT EXISTS (SELECT 1 FROM appointment a
                      WHERE a.barber_id = p_barber
                        AND a.status IN ('booked', 'in_progress', 'completed')
                        AND tsrange(a.start_at, a.end_at) && tsrange(g, g + svc.dur))
    ORDER BY g;
$$;

-- F5. Book an appointment — validates every business rule before inserting
CREATE FUNCTION book_appointment(p_customer INT, p_barber INT, p_service INT, p_start TIMESTAMP, p_note TEXT DEFAULT NULL)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE
    v_svc service%ROWTYPE;
    v_id  INT;
BEGIN
    SELECT * INTO v_svc FROM service WHERE service_id = p_service AND is_active;
    IF NOT FOUND THEN RAISE EXCEPTION 'Service is not available'; END IF;

    IF NOT EXISTS (SELECT 1 FROM barber_service WHERE barber_id = p_barber AND service_id = p_service) THEN
        RAISE EXCEPTION 'This barber does not offer that service';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM get_available_slots(p_barber, p_service, p_start::date) s WHERE s.slot_start = p_start) THEN
        RAISE EXCEPTION 'That time slot is no longer available';
    END IF;

    INSERT INTO appointment (customer_id, barber_id, service_id, start_at, end_at, price, note)
    VALUES (p_customer, p_barber, p_service, p_start,
            p_start + make_interval(mins => v_svc.duration_min), v_svc.price, NULLIF(trim(p_note), ''))
    RETURNING appointment_id INTO v_id;
    RETURN v_id;
END $$;

-- F6. Customer cancels — only their own booking and at least shop_info.cancel_window_hours ahead
CREATE FUNCTION cancel_appointment(p_appointment INT, p_customer INT)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_appt appointment%ROWTYPE; v_hours INT;
BEGIN
    SELECT * INTO v_appt FROM appointment WHERE appointment_id = p_appointment AND customer_id = p_customer;
    IF NOT FOUND THEN RAISE EXCEPTION 'Appointment not found'; END IF;
    IF v_appt.status <> 'booked' THEN RAISE EXCEPTION 'Only upcoming bookings can be cancelled'; END IF;
    SELECT cancel_window_hours INTO v_hours FROM shop_info;
    IF v_appt.start_at < now() + make_interval(hours => v_hours) THEN
        RAISE EXCEPTION 'Bookings can only be cancelled at least % hours in advance', v_hours;
    END IF;
    UPDATE appointment SET status = 'cancelled' WHERE appointment_id = p_appointment;
END $$;

-- F7. Reschedule — moves an upcoming booking to a new slot (same barber & service)
CREATE FUNCTION reschedule_appointment(p_appointment INT, p_customer INT, p_new_start TIMESTAMP)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE v_appt appointment%ROWTYPE;
BEGIN
    SELECT * INTO v_appt FROM appointment WHERE appointment_id = p_appointment AND customer_id = p_customer FOR UPDATE;
    IF NOT FOUND OR v_appt.status <> 'booked' THEN RAISE EXCEPTION 'Only upcoming bookings can be rescheduled'; END IF;
    IF NOT EXISTS (SELECT 1 FROM get_available_slots(v_appt.barber_id, v_appt.service_id, p_new_start::date) s
                   WHERE s.slot_start = p_new_start) THEN
        RAISE EXCEPTION 'That time slot is no longer available';
    END IF;
    UPDATE appointment
       SET start_at = p_new_start,
           end_at   = p_new_start + (v_appt.end_at - v_appt.start_at)
     WHERE appointment_id = p_appointment;
END $$;

-- F8. Barber checkout — records the payment (trigger completes the visit & awards points)
CREATE FUNCTION checkout_appointment(p_appointment INT, p_barber INT, p_tip NUMERIC, p_method pay_method)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE v_appt appointment%ROWTYPE; v_id INT;
BEGIN
    SELECT * INTO v_appt FROM appointment WHERE appointment_id = p_appointment AND barber_id = p_barber;
    IF NOT FOUND THEN RAISE EXCEPTION 'Appointment not found'; END IF;
    IF v_appt.status NOT IN ('booked', 'in_progress') THEN RAISE EXCEPTION 'This visit is already closed'; END IF;
    INSERT INTO payment (appointment_id, amount, tip, method)
    VALUES (p_appointment, v_appt.price, COALESCE(p_tip, 0), p_method)
    RETURNING payment_id INTO v_id;
    RETURN v_id;
END $$;

-- F9. Earnings of a barber in a date range (commission is applied to service revenue, tips go 100% to barber)
CREATE FUNCTION barber_earnings(p_barber INT, p_from DATE, p_to DATE)
RETURNS TABLE (visits BIGINT, revenue NUMERIC, tips NUMERIC, commission NUMERIC, take_home NUMERIC)
LANGUAGE sql STABLE AS $$
    SELECT count(p.payment_id),
           COALESCE(sum(p.amount), 0),
           COALESCE(sum(p.tip), 0),
           round(COALESCE(sum(p.amount), 0) * b.commission_rate / 100, 2),
           round(COALESCE(sum(p.amount), 0) * b.commission_rate / 100 + COALESCE(sum(p.tip), 0), 2)
    FROM barber b
    LEFT JOIN appointment a ON a.barber_id = b.barber_id
    LEFT JOIN payment p     ON p.appointment_id = a.appointment_id AND p.paid_at::date BETWEEN p_from AND p_to
    WHERE b.barber_id = p_barber
    GROUP BY b.commission_rate;
$$;

-- =====================================================================
--  Triggers
-- =====================================================================

-- T1. After a payment: mark the appointment completed and award 1 loyalty point per shop_info.baht_per_point THB
CREATE FUNCTION trg_after_payment() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE appointment SET status = 'completed' WHERE appointment_id = NEW.appointment_id;
    UPDATE customer c SET loyalty_points = loyalty_points + floor(NEW.amount / (SELECT baht_per_point FROM shop_info))::int
      FROM appointment a
     WHERE a.appointment_id = NEW.appointment_id AND c.customer_id = a.customer_id;
    RETURN NEW;
END $$;
CREATE TRIGGER after_payment AFTER INSERT ON payment
FOR EACH ROW EXECUTE FUNCTION trg_after_payment();

-- T2. A review may only be written for a completed visit
CREATE FUNCTION trg_review_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF (SELECT status FROM appointment WHERE appointment_id = NEW.appointment_id) <> 'completed' THEN
        RAISE EXCEPTION 'You can only review a completed visit';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER review_guard BEFORE INSERT ON review
FOR EACH ROW EXECUTE FUNCTION trg_review_guard();

-- T3. Status changes must follow the life-cycle  booked → in_progress → completed
--     (cancelled / no_show are terminal; completed is terminal)
CREATE FUNCTION trg_status_flow() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.status IN ('completed', 'cancelled', 'no_show') AND NEW.status <> OLD.status THEN
        RAISE EXCEPTION 'Appointment is already %', OLD.status;
    END IF;
    IF OLD.status = 'in_progress' AND NEW.status IN ('booked', 'cancelled') THEN
        RAISE EXCEPTION 'A visit in progress cannot go back to %', NEW.status;
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER status_flow BEFORE UPDATE OF status ON appointment
FOR EACH ROW EXECUTE FUNCTION trg_status_flow();
