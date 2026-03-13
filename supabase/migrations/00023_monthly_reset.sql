-- Phase 17: Monthly Recurring Orders
-- Resets leads_delivered/leads_remaining on monthly orders on the 1st of each month.
-- Reactivates completed monthly orders. Logs each reset to activity_log.

-- ============================================================
-- 1. reset_monthly_orders() function
-- Loops over monthly orders that received leads, resets counts,
-- reactivates completed ones, and logs each reset.
-- ============================================================

CREATE OR REPLACE FUNCTION reset_monthly_orders()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_order RECORD;
  v_count integer := 0;
BEGIN
  FOR v_order IN
    SELECT id, broker_id, leads_delivered, total_leads
    FROM orders
    WHERE order_type = 'monthly'
      AND status IN ('active', 'completed')
      AND leads_delivered > 0
  LOOP
    UPDATE orders
    SET leads_delivered = 0,
        leads_remaining = v_order.total_leads,
        status = 'active',
        updated_at = now()
    WHERE id = v_order.id;

    INSERT INTO activity_log (event_type, order_id, broker_id, details)
    VALUES (
      'monthly_reset',
      v_order.id,
      v_order.broker_id,
      jsonb_build_object(
        'previous_delivered', v_order.leads_delivered,
        'total_leads', v_order.total_leads,
        'reset_at', now()::text
      )
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION reset_monthly_orders() IS 'Resets leads_delivered to 0 and restores leads_remaining for all monthly orders on the 1st. Logs each reset to activity_log.';

-- ============================================================
-- 2. pg_cron schedule: midnight UTC on the 1st of each month
-- ============================================================

SELECT cron.schedule(
  'monthly-order-reset',
  '0 0 1 * *',
  $$SELECT reset_monthly_orders()$$
);
