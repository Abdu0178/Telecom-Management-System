-- Demo dataset, invented names and identifiers. Not real customer data.
BEGIN;
INSERT INTO branches(branch_id,name,city,address,phone) VALUES
 (1,'Алматы орталық','Алматы','Абылай хан 50','+77270000001'),
 (2,'Астана орталық','Астана','Республика 20','+77170000002'),
 (3,'Шымкент бөлімшесі','Шымкент','Тәуке хан 15','+77250000003');
INSERT INTO employees(employee_id,branch_id,full_name,position,hired_at,salary) VALUES
 (1,1,'Айдана Омар','Менеджер','2024-01-10',320000),
 (2,2,'Данияр Болат','Консультант','2024-02-15',260000),
 (3,3,'Мадина Арман','Оператор','2025-03-11',230000);
INSERT INTO subscribers(subscriber_id,full_name,iin,email,phone,registered_at,branch_id) VALUES
 (1,'Али Еркін','990101000001','ali@example.test','+77010000001','2026-08-01',1),
 (2,'Аружан Нұр','990101000002','aruzhan@example.test','+77010000002','2026-08-10',1),
 (3,'Ерасыл Асан','990101000003','erasyl@example.test','+77010000003','2026-09-02',2),
 (4,'Динара Марат','990101000004','dinara@example.test','+77010000004','2026-09-05',3),
 (5,'Нұрсұлтан Әли','990101000005','nursultan@example.test','+77010000005','2026-10-01',2),
 (6,'Жанель Серік','990101000006','zhanel@example.test','+77010000006','2026-10-03',1);
INSERT INTO sim_cards(sim_id,iccid,msisdn,subscriber_id,activated_at,status) VALUES
 (1,'89010000000000000001','+77010000001',1,'2026-08-01','active'),
 (2,'89010000000000000002','+77010000002',2,'2026-08-10','active'),
 (3,'89010000000000000003','+77010000003',3,'2026-09-02','active'),
 (4,'89010000000000000004','+77010000004',4,'2026-09-05','active'),
 (5,'89010000000000000005','+77010000005',5,'2026-10-01','active'),
 (6,'89010000000000000006','+77010000006',6,'2026-10-03','active'),
 (7,'89010000000000000007','+77010000007',NULL,NULL,'available');
INSERT INTO tariffs(tariff_id,name,monthly_fee,included_minutes,included_sms,included_gb,extra_minute_price,extra_gb_price) VALUES
 (1,'Start',2990,100,50,10,15,450),
 (2,'Comfort',4990,250,100,25,12,350),
 (3,'Unlimited',7990,500,200,100,10,250),
 (4,'Student',3490,150,70,20,12,350);
INSERT INTO subscriptions(subscription_id,subscriber_id,sim_id,tariff_id,start_date,status) VALUES
 (1,1,1,2,'2026-08-01','active'),(2,2,2,4,'2026-08-10','active'),
 (3,3,3,3,'2026-09-02','active'),(4,4,4,1,'2026-09-05','active'),
 (5,5,5,2,'2026-10-01','active'),(6,6,6,4,'2026-10-03','active');
INSERT INTO tariff_history(subscriber_id,sim_id,old_tariff_id,new_tariff_id,changed_at,reason) VALUES
 (1,1,NULL,2,'2026-08-01 10:00','Бастапқы тариф'),(2,2,NULL,4,'2026-08-10 10:00','Бастапқы тариф'),
 (3,3,NULL,3,'2026-09-02 10:00','Бастапқы тариф'),(4,4,NULL,1,'2026-09-05 10:00','Бастапқы тариф'),
 (5,5,NULL,2,'2026-10-01 10:00','Бастапқы тариф'),(6,6,NULL,4,'2026-10-03 10:00','Бастапқы тариф');
INSERT INTO calls(sim_id,called_number,started_at,duration_seconds,call_type) VALUES
 (1,'+77017770001','2026-11-02 10:00',480,'outgoing'),(1,'+77017770002','2026-11-05 11:00',720,'outgoing'),
 (2,'+77017770003','2026-11-04 18:00',300,'outgoing'),(3,'+77017770004','2026-11-08 14:30',2400,'outgoing'),
 (4,'+77017770005','2026-11-09 09:15',600,'outgoing'),(5,'+77017770006','2026-11-09 20:00',1200,'outgoing'),
 (6,'+77017770007','2026-11-10 12:00',900,'outgoing');
INSERT INTO sms_usage(sim_id,recipient_number,sent_at,sms_count) VALUES
 (1,'+77017770001','2026-11-05 09:00',3),(2,'+77017770002','2026-11-06 11:00',5),
 (3,'+77017770003','2026-11-07 14:00',2),(4,'+77017770004','2026-11-09 16:00',4);
INSERT INTO internet_usage(sim_id,usage_date,mb_used) VALUES
 (1,'2026-11-01',6000),(1,'2026-11-06',8000),
 (2,'2026-11-01',7000),(2,'2026-11-06',5000),
 (3,'2026-11-01',15000),(3,'2026-11-06',12000),
 (4,'2026-11-01',4000),(4,'2026-11-06',10000),
 (5,'2026-11-01',20000),(5,'2026-11-06',18000),
 (6,'2026-11-01',3000),(6,'2026-11-06',4000);
INSERT INTO service_packages(package_id,name,package_type,allowance,price,validity_days) VALUES
 (1,'Қосымша 5 GB','internet',5,990,30),
 (2,'Қосымша 100 минут','minutes',100,790,30),
 (3,'Қосымша 50 SMS','sms',50,390,30);
INSERT INTO subscriber_packages(subscriber_id,package_id,purchased_at,expires_at) VALUES
 (1,1,'2026-11-01 09:00','2026-12-01 09:00'),
 (4,1,'2026-11-03 09:00','2026-12-03 09:00'),
 (2,2,'2026-11-05 09:00','2026-12-05 09:00');
INSERT INTO invoices(invoice_id,subscriber_id,billing_month,tariff_fee,extra_charges,issued_at,due_date,status) VALUES
 (1,1,'2026-10-01',4990,0,'2026-10-31','2026-11-10','paid'),
 (2,2,'2026-10-01',3490,0,'2026-10-31','2026-11-10','paid'),
 (3,3,'2026-10-01',7990,0,'2026-10-31','2026-11-10','paid'),
 (4,4,'2026-10-01',2990,450,'2026-10-31','2026-11-10','unpaid'),
 (5,5,'2026-10-01',4990,0,'2026-10-31','2026-11-10','partial'),
 (6,6,'2026-10-01',3490,0,'2026-10-31','2026-11-10','unpaid');
INSERT INTO payments(invoice_id,subscriber_id,amount,payment_method,paid_at) VALUES
 (1,1,4990,'card','2026-11-02 10:00'),
 (2,2,3490,'bank_transfer','2026-11-03 10:00'),
 (3,3,7990,'card','2026-11-02 15:00'),
 (5,5,2000,'cash','2026-11-04 12:00');
INSERT INTO complaints(subscriber_id,employee_id,subject,description,status,created_at) VALUES
 (1,1,'Интернет жылдамдығы','Жылдамдық төмендеді','open','2026-11-05 12:00'),
 (4,3,'Қоңырау сапасы','Байланыс үзіліп қалады','in_progress','2026-11-06 09:00');
-- Move identity sequences beyond the explicit sample IDs.
SELECT setval(pg_get_serial_sequence('branches','branch_id'),(SELECT MAX(branch_id) FROM branches));
SELECT setval(pg_get_serial_sequence('employees','employee_id'),(SELECT MAX(employee_id) FROM employees));
SELECT setval(pg_get_serial_sequence('subscribers','subscriber_id'),(SELECT MAX(subscriber_id) FROM subscribers));
SELECT setval(pg_get_serial_sequence('sim_cards','sim_id'),(SELECT MAX(sim_id) FROM sim_cards));
SELECT setval(pg_get_serial_sequence('tariffs','tariff_id'),(SELECT MAX(tariff_id) FROM tariffs));
SELECT setval(pg_get_serial_sequence('subscriptions','subscription_id'),(SELECT MAX(subscription_id) FROM subscriptions));
SELECT setval(pg_get_serial_sequence('invoices','invoice_id'),(SELECT MAX(invoice_id) FROM invoices));
COMMIT;
