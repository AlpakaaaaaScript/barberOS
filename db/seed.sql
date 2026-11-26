-- =====================================================================
--  barberOS — demo data (run after schema.sql)
--  All demo accounts use the password:  password123
-- =====================================================================

-- Shop information
INSERT INTO shop_info (name, tagline, address, phone, email)
VALUES ('barberOS Barbershop', 'Sharp cuts. No waiting.', '24 Sukhumvit Soi 11, Khlong Toei Nuea, Bangkok 10110', '02-123-4567', 'hello@barberos.com');

-- Owner
INSERT INTO app_user (email, password_hash, full_name, phone, role)
VALUES ('owner@barberos.com', crypt('password123', gen_salt('bf')), 'Arthur Blake', '081-000-0001', 'owner');

-- Barbers (create_barber also inserts a default Tue–Sat schedule)
SELECT create_barber('barber@barberos.com',  'password123', 'Marco Rossi',       '081-111-0001', 'Skin fades & tapers',        'Ten years behind the chair. Precise fades, sharp lines, zero rush.', 45);
SELECT create_barber('kenji@barberos.com',   'password123', 'Kenji Tanaka',      '081-111-0002', 'Classic scissor cuts',       'Trained in Tokyo. Scissor-over-comb work and textured crops.', 40);
SELECT create_barber('somchai@barberos.com', 'password123', 'Somchai Wongsakul', '081-111-0003', 'Hot towel shaves & beards',  'Straight-razor specialist. The hot towel shave you tell friends about.', 40);
SELECT create_barber('daniel@barberos.com',  'password123', 'Daniel Okafor',     '081-111-0004', 'Colour & curly hair',        'Grey blending, colour and curl-friendly cuts.', 35);

-- Marco & Somchai also work Sundays; Kenji works Mondays instead of Saturday
INSERT INTO working_hours VALUES (2, 0, '11:00', '17:00'), (4, 0, '11:00', '17:00'), (3, 1, '10:00', '19:00');
DELETE FROM working_hours WHERE barber_id = 3 AND weekday = 6;

-- Services
INSERT INTO service (name, category, description, duration_min, price) VALUES
 ('Classic Haircut',          'Hair',  'Consultation, cut, wash and style.',                    45, 350),
 ('Skin Fade',                'Hair',  'Zero-guard fade blended to any length on top.',        60, 450),
 ('Buzz Cut',                 'Hair',  'One length all over, neck and edges cleaned.',         30, 250),
 ('Beard Trim & Shape',       'Beard', 'Shape, line-up and beard oil finish.',                 30, 250),
 ('Hot Towel Shave',          'Beard', 'Traditional straight-razor shave with hot towels.',    45, 400),
 ('Haircut & Beard Combo',    'Combo', 'Our classic haircut plus a full beard trim.',          75, 600),
 ('Kids Cut (under 12)',      'Hair',  'Patient, quick and fun cut for the little ones.',      30, 250),
 ('Grey Blending & Colour',   'Colour','Natural grey blending or full colour.',                90, 900);

-- Which barber offers which service
INSERT INTO barber_service (barber_id, service_id) VALUES
 (2,1),(2,2),(2,3),(2,6),(2,7),
 (3,1),(3,3),(3,6),(3,7),(3,4),
 (4,4),(4,5),(4,6),(4,1),
 (5,1),(5,2),(5,8),(5,7);

-- Customers
SELECT register_customer('customer@barberos.com', 'password123', 'Ploy Chaiyaporn',  '089-555-0101');
SELECT register_customer('james@example.com',     'password123', 'James Carter',     '089-555-0102');
SELECT register_customer('nattapong@example.com', 'password123', 'Nattapong Srisuk', '089-555-0103');
SELECT register_customer('liam@example.com',      'password123', 'Liam Novak',       '089-555-0104');
SELECT register_customer('arjun@example.com',     'password123', 'Arjun Mehta',      '089-555-0105');
SELECT register_customer('thanawat@example.com',  'password123', 'Thanawat Boonmee', '089-555-0106');
SELECT register_customer('oliver@example.com',    'password123', 'Oliver Grant',     '089-555-0107');
SELECT register_customer('kittisak@example.com',  'password123', 'Kittisak Rattana', '089-555-0108');
SELECT register_customer('mateo@example.com',     'password123', 'Mateo Alvarez',    '089-555-0109');
SELECT register_customer('pongsak@example.com',   'password123', 'Pongsak Inthara',  '089-555-0110');
SELECT register_customer('ethan@example.com',     'password123', 'Ethan Brooks',     '089-555-0111');
SELECT register_customer('chaiwat@example.com',   'password123', 'Chaiwat Panya',    '089-555-0112');

-- Time off
INSERT INTO time_off (barber_id, start_date, end_date, reason) VALUES
 (5, current_date + 9, current_date + 11, 'Colour training course'),
 (3, current_date + 20, current_date + 24, 'Family trip');

-- ---------------------------------------------------------------------
--  Appointment history (last 45 days) + upcoming week, deterministic
-- ---------------------------------------------------------------------
SELECT setseed(0.11);
DO $$
DECLARE
    d DATE; slot TIME; b RECORD; v_svc RECORD; v_cust INT; v_start TIMESTAMP; v_id INT; r FLOAT;
    comments TEXT[] := ARRAY['Best fade I have had in years.', 'Friendly, on time and very precise.',
        'Great conversation and a clean cut.', 'The hot towel shave is a must.', 'Good, but had to wait a bit.',
        'Exactly what I asked for.', 'Will definitely book again.', 'Solid cut, nice atmosphere.'];
BEGIN
    FOR d IN SELECT generate_series(current_date - 45, current_date + 7, interval '1 day')::date LOOP
        FOR b IN SELECT w.barber_id FROM working_hours w WHERE w.weekday = extract(dow FROM d) LOOP
            CONTINUE WHEN EXISTS (SELECT 1 FROM time_off t WHERE t.barber_id = b.barber_id AND d BETWEEN t.start_date AND t.end_date);
            FOREACH slot IN ARRAY ARRAY['11:00','12:30','14:00','15:30','17:00']::time[] LOOP
                r := random();
                CONTINUE WHEN (d < current_date AND r < 0.30) OR (d >= current_date AND r < 0.55);
                v_start := d + slot;
                CONTINUE WHEN NOT EXISTS (SELECT 1 FROM working_hours w WHERE w.barber_id = b.barber_id
                    AND w.weekday = extract(dow FROM d) AND slot >= w.start_time AND slot + interval '90 min' <= w.end_time);
                SELECT s.* INTO v_svc FROM service s JOIN barber_service bs USING (service_id)
                 WHERE bs.barber_id = b.barber_id ORDER BY random() LIMIT 1;
                v_cust := 6 + floor(random() * 12)::int;  -- customer ids 6..17
                INSERT INTO appointment (customer_id, barber_id, service_id, start_at, end_at, price, status, created_at)
                VALUES (v_cust, b.barber_id, v_svc.service_id, v_start, v_start + make_interval(mins => v_svc.duration_min),
                        v_svc.price,
                        CASE WHEN v_start + make_interval(mins => v_svc.duration_min) > now() THEN 'booked'
                             WHEN random() < 0.06 THEN 'cancelled'
                             WHEN random() < 0.05 THEN 'no_show'
                             ELSE 'booked' END::appt_status,
                        v_start - interval '3 days')
                RETURNING appointment_id INTO v_id;

                -- past visits that were not cancelled / no-show get paid (trigger marks them completed)
                IF v_start + make_interval(mins => v_svc.duration_min) <= now()
                   AND (SELECT status FROM appointment WHERE appointment_id = v_id) = 'booked' THEN
                    INSERT INTO payment (appointment_id, amount, tip, method, paid_at)
                    VALUES (v_id, v_svc.price, (ARRAY[0,0,20,50,100])[1 + floor(random() * 5)::int],
                            (ARRAY['cash','card','qr'])[1 + floor(random() * 3)::int]::pay_method,
                            v_start + make_interval(mins => v_svc.duration_min));
                    IF random() < 0.55 THEN
                        INSERT INTO review (appointment_id, rating, comment, created_at)
                        VALUES (v_id, (ARRAY[5,5,5,4,4,3])[1 + floor(random() * 6)::int],
                                comments[1 + floor(random() * 8)::int], v_start + interval '1 day');
                    END IF;
                END IF;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;

-- Guarantee the demo customer has one completed-but-unreviewed visit and one upcoming booking
DO $$
DECLARE v_id INT;
BEGIN
    UPDATE appointment SET customer_id = 6
     WHERE appointment_id = (SELECT appointment_id FROM appointment WHERE status = 'booked' AND start_at > now() + interval '1 day'
                             ORDER BY start_at LIMIT 1);
    SELECT a.appointment_id INTO v_id FROM appointment a LEFT JOIN review r USING (appointment_id)
     WHERE a.status = 'completed' AND r.review_id IS NULL ORDER BY a.start_at DESC LIMIT 1;
    UPDATE appointment SET customer_id = 6 WHERE appointment_id = v_id;
END $$;
