-- EXECUTE AFTER scripts 01-04. Individual calls modify demo data.
-- Use a transaction and ROLLBACK if you want to keep the original data unchanged.
BEGIN;
-- New SIM registration for subscriber 1 (SIM 7 initially available)
CALL register_sim(1,7);
SELECT sim_id,subscriber_id,status FROM sim_cards WHERE sim_id=7;
-- Change subscriber 1's active tariff from Comfort to Unlimited
CALL change_tariff(1,3);
SELECT * FROM tariff_history WHERE subscriber_id=1 ORDER BY changed_at DESC;
-- Analyze consumption and generate the November bill
SELECT * FROM monthly_usage(1,'2026-11-01');
CALL generate_invoice(1,'2026-11-01');
SELECT invoice_id,subscriber_id,billing_month,total_amount,status FROM invoices WHERE subscriber_id=1;
-- Pay 1000 KZT toward the new bill (partial payment)
CALL pay_invoice((SELECT invoice_id FROM invoices WHERE subscriber_id=1 AND billing_month='2026-11-01'),1000,'card');
SELECT invoice_id,total_amount,status FROM invoices WHERE subscriber_id=1 AND billing_month='2026-11-01';
ROLLBACK; -- Change to COMMIT to save the demonstrations.
