-- Finance scorecard totals, added up in the database.
--
-- WHY: the API used to fetch every row and add them up, which was silently wrong past
-- Supabase's 1000-row cap. It also filtered petty cash on a column that does not exist
-- (expense_date; the real one is date), so with a date range expenses always came out 0.
--
-- SAFE TO RUN: adds one read-only function. Changes no table and no data. Can be run twice.
--
-- !!! RUN THIS BEFORE DEPLOYING THE CODE THAT CALLS IT !!!

-- p_start / p_end NULL = no limit on that side.
CREATE OR REPLACE FUNCTION public.scorecard_totals(p_company uuid, p_start date, p_end date)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'sales',       (SELECT coalesce(sum(net_amount), 0) FROM sales_invoices
                     WHERE company_id = p_company AND (p_start IS NULL OR invoice_date >= p_start) AND (p_end IS NULL OR invoice_date <= p_end)),
    'purchases',   (SELECT coalesce(sum(total_amount), 0) FROM purchase_entries
                     WHERE company_id = p_company AND (p_start IS NULL OR entry_date >= p_start) AND (p_end IS NULL OR entry_date <= p_end)),
    'collections', (SELECT coalesce(sum(amount), 0) FROM customer_collections
                     WHERE company_id = p_company AND (p_start IS NULL OR collection_date >= p_start) AND (p_end IS NULL OR collection_date <= p_end)),
    'payments',    (SELECT coalesce(sum(amount), 0) FROM supplier_payments
                     WHERE company_id = p_company AND (p_start IS NULL OR payment_date >= p_start) AND (p_end IS NULL OR payment_date <= p_end)),
    'expenses',    (SELECT coalesce(sum(amount), 0) FROM petty_cash
                     WHERE company_id = p_company AND (p_start IS NULL OR date >= p_start) AND (p_end IS NULL OR date <= p_end))
  );
$$;

-- Only the backend (service role) may call it; the public key may not.
REVOKE ALL ON FUNCTION public.scorecard_totals(uuid, date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.scorecard_totals(uuid, date, date) TO service_role;

-- Let PostgREST see the new function right away.
NOTIFY pgrst, 'reload schema';
