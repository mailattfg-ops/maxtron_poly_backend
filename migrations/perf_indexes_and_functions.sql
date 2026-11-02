-- Performance + data-safety migration (additive only: indexes and functions).
-- Safe to run more than once. Run in Supabase SQL editor, or with psql "$SUPABASE_DB_URL" -f <this file>.

-- ---------------------------------------------------------------------------
-- 1. Indexes
-- Postgres does not index foreign-key columns by itself, so every
-- .eq('company_id', ...) and every nested select (invoice -> items, user -> addresses)
-- scanned the whole table. This creates an index for every single-column foreign key
-- and every company_id column that has none yet.
-- ---------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT c.relname AS tbl, a.attname AS col
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped
      AND (
        a.attname = 'company_id'
        OR EXISTS (SELECT 1 FROM pg_constraint k
                   WHERE k.conrelid = c.oid AND k.contype = 'f'
                     AND array_length(k.conkey, 1) = 1 AND k.conkey[1] = a.attnum)
      )
      -- skip columns that already lead an index
      AND NOT EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid = c.oid AND i.indkey[0] = a.attnum)
  LOOP
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%I)',
                   left('idx_' || r.tbl || '_' || r.col, 63), r.tbl, r.col);
  END LOOP;
END $$;

-- Lookups by person/company and date (attendance duplicate check, dashboard, reports).
DO $$
BEGIN
  IF to_regclass('public.attendance') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON public.attendance (employee_id, date);
    CREATE INDEX IF NOT EXISTS idx_attendance_company_date ON public.attendance (company_id, date);
  END IF;
  IF to_regclass('public.sales_invoices') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_sales_invoices_company_date ON public.sales_invoices (company_id, invoice_date);
  END IF;
  IF to_regclass('public.keil_collection_headers') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_keil_collection_headers_company_date ON public.keil_collection_headers (company_id, collection_date);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Highest number in a document-number column, e.g. MP123 -> 123.
-- Replaces reading every row in JavaScript, which stopped at Supabase's 1000-row
-- cap and then handed out numbers already in use.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.max_doc_number(p_table text, p_col text, p_pattern text, p_company uuid)
RETURNS numeric LANGUAGE plpgsql STABLE AS $$
DECLARE result numeric;
BEGIN
  IF (p_table, p_col) NOT IN (('sales_invoices', 'invoice_number'), ('customer_orders', 'order_number'),
                              ('customers', 'customer_code')) THEN
    RAISE EXCEPTION 'max_doc_number: % is not allowed', p_table;
  END IF;
  EXECUTE format(
    'SELECT max(((regexp_match(%1$I, $1, ''i''))[1])::numeric) FROM public.%2$I WHERE $2 IS NULL OR company_id = $2',
    p_col, p_table)
  INTO result USING p_pattern, p_company;
  RETURN coalesce(result, 0);
END $$;

-- ---------------------------------------------------------------------------
-- 3. Replace all line items of one invoice/order in a single transaction.
-- Before, the old lines were deleted first and the new ones inserted in a second
-- call; if that insert failed the document was left with no lines.
-- Columns come from the JSON keys, limited to real, writable columns of the table
-- (generated columns such as amount are skipped, as PostgREST requires).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.replace_child_rows(p_table text, p_fk text, p_parent uuid, p_rows jsonb)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE cols text;
BEGIN
  IF (p_table, p_fk) NOT IN (('sales_invoice_items', 'invoice_id'), ('customer_order_items', 'order_id')) THEN
    RAISE EXCEPTION 'replace_child_rows: % is not allowed', p_table;
  END IF;

  EXECUTE format('DELETE FROM public.%I WHERE %I = $1', p_table, p_fk) USING p_parent;

  IF p_rows IS NULL OR jsonb_array_length(p_rows) = 0 THEN
    RETURN;
  END IF;

  SELECT string_agg(quote_ident(c.column_name), ', ') INTO cols
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = p_table
    AND c.is_generated = 'NEVER' AND c.column_name <> p_fk
    AND c.column_name IN (SELECT DISTINCT jsonb_object_keys(e) FROM jsonb_array_elements(p_rows) e);

  IF cols IS NULL THEN
    EXECUTE format('INSERT INTO public.%1$I (%2$I) SELECT $1 FROM jsonb_array_elements($2)', p_table, p_fk)
      USING p_parent, p_rows;
  ELSE
    EXECUTE format('INSERT INTO public.%1$I (%2$I, %3$s) SELECT $1, %3$s FROM jsonb_populate_recordset(NULL::public.%1$I, $2)',
                   p_table, p_fk, cols)
      USING p_parent, p_rows;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Stock movement totals per item, summed in the database.
-- Before, every purchase/consumption/sale row was sent to the API and added up there,
-- which was slow and silently wrong past 1000 rows. Returns
-- { "<kind>": { "<item id>": total, ... }, ... } for the kinds asked for.
-- p_company NULL = all companies (same as calling the API without company_id).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.stock_totals(p_company uuid, p_kinds text[])
RETURNS jsonb LANGUAGE sql STABLE AS $$
  WITH t(kind, item_id, qty) AS (
    SELECT 'rm_purchased', i.rm_id, sum(i.received_quantity)
      FROM purchase_entry_items i JOIN purchase_entries e ON e.id = i.entry_id
     WHERE 'rm_purchased' = ANY(p_kinds) AND (p_company IS NULL OR e.company_id = p_company)
     GROUP BY i.rm_id
    UNION ALL
    SELECT 'rm_consumed', c.rm_id, sum(c.quantity_used)
      FROM material_consumptions c
     WHERE 'rm_consumed' = ANY(p_kinds) AND (p_company IS NULL OR c.company_id = p_company)
     GROUP BY c.rm_id
    UNION ALL
    SELECT 'rm_returned', r.rm_id, sum(r.quantity_returned)
      FROM purchase_returns r
     WHERE 'rm_returned' = ANY(p_kinds) AND (p_company IS NULL OR r.company_id = p_company)
       AND r.status IN ('CREDITED', 'Credit Received', 'APPROVED', 'Approved', 'DISPATCHED')
     GROUP BY r.rm_id
    UNION ALL
    SELECT 'fg_produced', i.product_id, sum(i.quantity)
      FROM production_conversion_items i JOIN production_conversions c ON c.id = i.conversion_id
     WHERE 'fg_produced' = ANY(p_kinds) AND (p_company IS NULL OR c.company_id = p_company)
     GROUP BY i.product_id
    UNION ALL
    SELECT 'fg_trading', g.product_id, sum(g.quantity)
      FROM trading_goods_inward g
     WHERE 'fg_trading' = ANY(p_kinds) AND (p_company IS NULL OR g.company_id = p_company)
     GROUP BY g.product_id
    UNION ALL
    SELECT 'fg_sold', i.product_id, sum(i.quantity)
      FROM sales_invoice_items i JOIN sales_invoices s ON s.id = i.invoice_id
     WHERE 'fg_sold' = ANY(p_kinds) AND (p_company IS NULL OR s.company_id = p_company)
     GROUP BY i.product_id
    UNION ALL
    SELECT 'sfg_produced', i.product_id, sum(i.output_qty)
      FROM production_batch_items i JOIN production_batches b ON b.id = i.batch_id
     WHERE 'sfg_produced' = ANY(p_kinds) AND (p_company IS NULL OR b.company_id = p_company)
     GROUP BY i.product_id
    UNION ALL
    SELECT 'sfg_consumed', bi.product_id, sum(c.input_qty)
      FROM production_conversions c JOIN production_batch_items bi ON bi.id = c.batch_item_id
     WHERE 'sfg_consumed' = ANY(p_kinds) AND (p_company IS NULL OR c.company_id = p_company)
     GROUP BY bi.product_id
  )
  SELECT coalesce(jsonb_object_agg(kind, items), '{}'::jsonb)
  FROM (SELECT kind, jsonb_object_agg(item_id::text, coalesce(qty, 0)) AS items
          FROM t WHERE item_id IS NOT NULL GROUP BY kind) k;
$$;

-- ---------------------------------------------------------------------------
-- 5. Dashboard sales/production/cash totals in one call (same date rules as before:
-- month = on/after p_month_start; previous month = p_prev_start..p_prev_end).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dashboard_totals(p_company uuid, p_month_start date, p_prev_start date, p_prev_end date)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'cur_sales',       (SELECT coalesce(sum(net_amount), 0) FROM sales_invoices WHERE company_id = p_company AND invoice_date >= p_month_start),
    'prev_sales',      (SELECT coalesce(sum(net_amount), 0) FROM sales_invoices WHERE company_id = p_company AND invoice_date BETWEEN p_prev_start AND p_prev_end),
    'cur_production',  (SELECT coalesce(sum(i.quantity), 0) FROM production_conversion_items i JOIN production_conversions c ON c.id = i.conversion_id
                         WHERE c.company_id = p_company AND c.date >= p_month_start),
    'prev_production', (SELECT coalesce(sum(i.quantity), 0) FROM production_conversion_items i JOIN production_conversions c ON c.id = i.conversion_id
                         WHERE c.company_id = p_company AND c.date BETWEEN p_prev_start AND p_prev_end),
    'collections',     (SELECT coalesce(sum(amount), 0) FROM customer_collections WHERE company_id = p_company),
    'payments',        (SELECT coalesce(sum(amount), 0) FROM supplier_payments WHERE company_id = p_company),
    'expenses',        (SELECT coalesce(sum(amount), 0) FROM petty_cash WHERE company_id = p_company)
  );
$$;

-- ---------------------------------------------------------------------------
-- 6. Only the backend (service role) may call these; the public anon key may not.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.max_doc_number(text, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.replace_child_rows(text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.stock_totals(uuid, text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dashboard_totals(uuid, date, date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.max_doc_number(text, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.replace_child_rows(text, text, uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.stock_totals(uuid, text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.dashboard_totals(uuid, date, date, date) TO service_role;

-- Let PostgREST see the new functions right away.
NOTIFY pgrst, 'reload schema';
