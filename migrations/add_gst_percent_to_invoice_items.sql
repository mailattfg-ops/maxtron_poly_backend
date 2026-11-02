-- Migration: store the GST rate typed for each invoice line.
--
-- sales_invoice_items held only product, quantity and rate. The GST % chosen
-- on the invoice form was never saved, so the printed invoice, the e-Invoice
-- and the e-Way Bill each assumed 18% — an invoice entered at 0% or 5%
-- printed, and was reported to the portal, at 18%.
--
-- Existing lines are backfilled with the rate their invoice was actually
-- charged at (its saved tax / taxable value), so older invoices keep printing
-- what was entered. Additive and safe to re-run.

ALTER TABLE sales_invoice_items ADD COLUMN IF NOT EXISTS gst_percent NUMERIC(5, 2);

UPDATE sales_invoice_items i
SET gst_percent = ROUND((inv.tax_amount / inv.total_amount) * 100, 2)
FROM sales_invoices inv
WHERE i.invoice_id = inv.id
  AND i.gst_percent IS NULL
  AND COALESCE(inv.total_amount, 0) > 0
  AND inv.tax_amount BETWEEN 0 AND inv.total_amount;

COMMENT ON COLUMN sales_invoice_items.gst_percent IS 'GST rate typed for this line; the invoice, e-Invoice and e-Way Bill are computed from it';

NOTIFY pgrst, 'reload schema';
