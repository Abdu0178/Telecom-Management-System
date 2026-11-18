-- CASE 15: analytical queries (run individually or all at once)
-- A. Verify that there are exactly 15 business tables
SELECT COUNT(*) AS table_count FROM information_schema.tables
WHERE table_schema='public' AND table_type='BASE TABLE';

-- B. Subscriber + SIM + current tariff
SELECT s.subscriber_id,s.full_name,sim.msisdn,t.name AS tariff,t.monthly_fee
FROM subscribers s JOIN sim_cards sim ON sim.subscriber_id=s.subscriber_id
LEFT JOIN subscriptions sub ON sub.sim_id=sim.sim_id AND sub.status='active'
LEFT JOIN tariffs t ON t.tariff_id=sub.tariff_id
ORDER BY s.subscriber_id;

-- C. Most popular active tariffs
SELECT t.name AS tariff,COUNT(sub.subscription_id) AS subscriber_count
FROM tariffs t LEFT JOIN subscriptions sub ON sub.tariff_id=t.tariff_id AND sub.status='active'
GROUP BY t.tariff_id,t.name ORDER BY subscriber_count DESC,t.name;

-- D. Subscribers using the most mobile data (November 2026)
SELECT s.full_name,sim.msisdn,ROUND(SUM(i.mb_used)/1024,2) AS gigabytes
FROM internet_usage i JOIN sim_cards sim ON sim.sim_id=i.sim_id
JOIN subscribers s ON s.subscriber_id=sim.subscriber_id
WHERE i.usage_date>='2026-11-01' AND i.usage_date<'2026-12-01'
GROUP BY s.subscriber_id,s.full_name,sim.msisdn ORDER BY gigabytes DESC LIMIT 10;

-- E. ARPU from actual payments, October invoices paid in November (denominator: active subscribers)
-- Example uses November 2026 cash receipts, not billed revenue.
SELECT ROUND(COALESCE((SELECT SUM(amount) FROM payments
 WHERE paid_at>='2026-11-01' AND paid_at<'2026-12-01'),0)
 /NULLIF((SELECT COUNT(*) FROM subscribers WHERE status='active'),0),2) AS arpu_kzt;

-- F. Monthly outgoing minutes and internet for each subscriber
SELECT s.full_name,u.total_minutes,u.total_sms,u.total_gb
FROM subscribers s CROSS JOIN LATERAL monthly_usage(s.subscriber_id,'2026-11-01') u
ORDER BY s.subscriber_id;

-- G. Monthly invoices, payment balance
SELECT s.full_name,i.billing_month,i.total_amount,
 COALESCE(SUM(p.amount),0) AS amount_paid,
 i.total_amount-COALESCE(SUM(p.amount),0) AS balance,i.status
FROM invoices i JOIN subscribers s ON s.subscriber_id=i.subscriber_id
LEFT JOIN payments p ON p.invoice_id=i.invoice_id
GROUP BY s.subscriber_id,s.full_name,i.invoice_id
ORDER BY i.invoice_id;

-- H. Revenue by payment method
SELECT payment_method,COUNT(*) AS payment_count,SUM(amount) AS total_kzt,
 ROUND(AVG(amount),2) AS average_kzt FROM payments GROUP BY payment_method ORDER BY total_kzt DESC;

-- I. Complaint status summary
SELECT status,COUNT(*) AS total FROM complaints GROUP BY status ORDER BY status;

-- J. Tariff changes audit trail
SELECT s.full_name,COALESCE(old_t.name,'(initial)') AS old_tariff,
 new_t.name AS new_tariff,h.changed_at
FROM tariff_history h JOIN subscribers s ON s.subscriber_id=h.subscriber_id
LEFT JOIN tariffs old_t ON old_t.tariff_id=h.old_tariff_id
JOIN tariffs new_t ON new_t.tariff_id=h.new_tariff_id
ORDER BY h.changed_at;
