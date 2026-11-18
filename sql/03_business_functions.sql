-- CASE 15: business operations in PostgreSQL
-- 1. Register a SIM to an existing subscriber.
CREATE OR REPLACE PROCEDURE register_sim(p_subscriber_id BIGINT,p_sim_id BIGINT)
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM subscribers WHERE subscriber_id=p_subscriber_id AND status='active') THEN
    RAISE EXCEPTION 'Active subscriber % not found',p_subscriber_id;
  END IF;
  UPDATE sim_cards SET subscriber_id=p_subscriber_id, status='active',activated_at=CURRENT_DATE
  WHERE sim_id=p_sim_id AND subscriber_id IS NULL AND status='available';
  IF NOT FOUND THEN RAISE EXCEPTION 'SIM % unavailable',p_sim_id; END IF;
END; $$;

-- 2. Change a tariff and retain the full history.
CREATE OR REPLACE PROCEDURE change_tariff(p_sim_id BIGINT,p_new_tariff_id BIGINT)
LANGUAGE plpgsql AS $$
DECLARE v_old subscriptions%ROWTYPE;
BEGIN
  SELECT * INTO v_old FROM subscriptions
  WHERE sim_id=p_sim_id AND status='active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SIM % has no active subscription',p_sim_id; END IF;
  IF NOT EXISTS (SELECT 1 FROM tariffs WHERE tariff_id=p_new_tariff_id AND is_active) THEN
    RAISE EXCEPTION 'Tariff % unavailable',p_new_tariff_id;
  END IF;
  IF v_old.tariff_id=p_new_tariff_id THEN RAISE EXCEPTION 'Already subscribed to this tariff'; END IF;
  UPDATE subscriptions SET status='ended',end_date=CURRENT_DATE
  WHERE subscription_id=v_old.subscription_id;
  INSERT INTO subscriptions(subscriber_id,sim_id,tariff_id,start_date,status)
  VALUES(v_old.subscriber_id,p_sim_id,p_new_tariff_id,CURRENT_DATE,'active');
  INSERT INTO tariff_history(subscriber_id,sim_id,old_tariff_id,new_tariff_id,reason)
  VALUES(v_old.subscriber_id,p_sim_id,v_old.tariff_id,p_new_tariff_id,'Абонент тарифті ауыстырды');
END; $$;

-- 3. Summarize usage in the target month; 1 GB = 1024 MB.
CREATE OR REPLACE FUNCTION monthly_usage(p_subscriber_id BIGINT,p_month DATE)
RETURNS TABLE(total_minutes NUMERIC,total_sms BIGINT,total_gb NUMERIC)
LANGUAGE sql STABLE AS $$
 SELECT
  COALESCE((SELECT ROUND(SUM(c.duration_seconds)::NUMERIC/60,2)
       FROM calls c JOIN sim_cards s ON s.sim_id=c.sim_id
       WHERE s.subscriber_id=p_subscriber_id AND c.call_type='outgoing'
         AND c.started_at>=date_trunc('month',p_month::timestamp)
         AND c.started_at<date_trunc('month',p_month::timestamp)+INTERVAL '1 month'),0),
  COALESCE((SELECT SUM(su.sms_count)
       FROM sms_usage su JOIN sim_cards s ON s.sim_id=su.sim_id
       WHERE s.subscriber_id=p_subscriber_id
         AND su.sent_at>=date_trunc('month',p_month::timestamp)
         AND su.sent_at<date_trunc('month',p_month::timestamp)+INTERVAL '1 month'),0),
  COALESCE((SELECT ROUND(SUM(i.mb_used)/1024,2)
       FROM internet_usage i JOIN sim_cards s ON s.sim_id=i.sim_id
       WHERE s.subscriber_id=p_subscriber_id
         AND i.usage_date>=date_trunc('month',p_month::timestamp)::DATE
         AND i.usage_date<(date_trunc('month',p_month::timestamp)+INTERVAL '1 month')::DATE),0);
$$;

-- 4. Create a monthly bill for an active subscriber, or update the unpaid existing bill.
-- Simplified academic billing: current tariff fee and out-of-bundle outgoing minutes + GB.
-- SMS overage, package offsets, partial-month proration and historic tariff changes are not billed.
CREATE OR REPLACE PROCEDURE generate_invoice(p_subscriber_id BIGINT,p_month DATE)
LANGUAGE plpgsql AS $$
DECLARE v_t tariffs%ROWTYPE; v_usage RECORD; v_extra NUMERIC(12,2);v_month DATE;
BEGIN
  v_month:=date_trunc('month',p_month::timestamp)::DATE;
  SELECT t.* INTO v_t FROM subscriptions sub
  JOIN tariffs t ON t.tariff_id=sub.tariff_id
  WHERE sub.subscriber_id=p_subscriber_id AND sub.status='active'
  ORDER BY sub.start_date DESC, sub.subscription_id DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'No active tariff for subscriber %',p_subscriber_id; END IF;
  SELECT * INTO v_usage FROM monthly_usage(p_subscriber_id,v_month);
  v_extra:=ROUND(GREATEST(v_usage.total_minutes-v_t.included_minutes,0)*v_t.extra_minute_price
           +GREATEST(v_usage.total_gb-v_t.included_gb,0)*v_t.extra_gb_price,2);
  INSERT INTO invoices(subscriber_id,billing_month,tariff_fee,extra_charges,issued_at,due_date,status)
  VALUES(p_subscriber_id,v_month,v_t.monthly_fee,v_extra,CURRENT_DATE,(v_month+INTERVAL '1 month 10 days')::DATE,'unpaid')
  ON CONFLICT (subscriber_id,billing_month) DO UPDATE
    SET tariff_fee=EXCLUDED.tariff_fee,extra_charges=EXCLUDED.extra_charges
  WHERE invoices.status='unpaid'
    AND NOT EXISTS(SELECT 1 FROM payments p WHERE p.invoice_id=invoices.invoice_id);
END; $$;

-- 5. Record a payment and update invoice payment status.
CREATE OR REPLACE PROCEDURE pay_invoice(p_invoice_id BIGINT,p_amount NUMERIC,p_method VARCHAR)
LANGUAGE plpgsql AS $$
DECLARE v_invoice invoices%ROWTYPE;v_paid NUMERIC;
BEGIN
  SELECT * INTO v_invoice FROM invoices WHERE invoice_id=p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice % not found',p_invoice_id; END IF;
  IF p_amount<=0 THEN RAISE EXCEPTION 'Payment must be positive'; END IF;
  SELECT COALESCE(SUM(amount),0) INTO v_paid FROM payments WHERE invoice_id=p_invoice_id;
  IF v_paid+p_amount>v_invoice.total_amount THEN RAISE EXCEPTION 'Payment exceeds invoice balance'; END IF;
  INSERT INTO payments(invoice_id,subscriber_id,amount,payment_method)
  VALUES(p_invoice_id,v_invoice.subscriber_id,p_amount,p_method);
  UPDATE invoices SET status=CASE WHEN v_paid+p_amount=v_invoice.total_amount THEN 'paid' ELSE 'partial' END
  WHERE invoice_id=p_invoice_id;
END; $$;
