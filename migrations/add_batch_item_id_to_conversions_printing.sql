-- Migration: Link cutting & printing to the ROLL they consume (production_batch_items),
-- not just the batch. A batch can extrude several products; without this the
-- database could not say which roll was cut, nor track each roll's balance.
-- Additive only: two nullable columns + backfill. Safe to re-run.
-- Same as: npm run alter-batch-item-link

BEGIN;

ALTER TABLE production_conversions
    ADD COLUMN IF NOT EXISTS batch_item_id UUID REFERENCES production_batch_items(id) ON DELETE SET NULL;

ALTER TABLE production_printing
    ADD COLUMN IF NOT EXISTS batch_item_id UUID REFERENCES production_batch_items(id) ON DELETE SET NULL;

-- Backfill existing rows to the roll carrying the batch's legacy single product_id.
UPDATE production_conversions t
SET batch_item_id = i.id
FROM production_batch_items i
JOIN production_batches b ON b.id = i.batch_id
WHERE t.batch_item_id IS NULL
  AND t.batch_id = b.id
  AND i.product_id = b.product_id;

UPDATE production_printing t
SET batch_item_id = i.id
FROM production_batch_items i
JOIN production_batches b ON b.id = i.batch_id
WHERE t.batch_item_id IS NULL
  AND t.batch_id = b.id
  AND i.product_id = b.product_id;

COMMENT ON COLUMN production_conversions.batch_item_id IS 'The extrusion roll (batch x product) this cutting job drew from';
COMMENT ON COLUMN production_printing.batch_item_id IS 'The extrusion roll (batch x product) this printing job drew from';

NOTIFY pgrst, 'reload schema';

COMMIT;
