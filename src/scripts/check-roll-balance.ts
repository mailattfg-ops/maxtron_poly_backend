/**
 * Self-check for the roll balance maths behind Cutting & Printing.
 * Run: npx ts-node --transpile-only src/scripts/check-roll-balance.ts
 * No server, no database. If one of these fails, a mixed batch is being
 * attributed to one product again, or a roll can be over-drawn.
 */
import assert from 'assert';
import { withRollBalance } from '../modules/maxtron/models/productionModel';

const green = { id: 'g', product_id: 'P-GREEN', output_qty: 424 };
const clear = { id: 't', product_id: 'P-CLEAR', output_qty: 776 };

// 1. Untouched rolls: the whole roll is available, and each roll is its own pool.
assert.strictEqual(withRollBalance(green, [], []).available_qty, 424);
assert.strictEqual(withRollBalance(clear, [], []).available_qty, 776);

// 2. Partial cut of one roll leaves a balance and does not touch the other.
const cuts = [{ batch_item_id: 'g', input_qty: 358.8 }];
assert.strictEqual(+withRollBalance(green, cuts, []).available_qty.toFixed(3), 65.2);
assert.strictEqual(withRollBalance(clear, cuts, []).available_qty, 776);

// 3. Second cut from the same roll draws from the remainder.
const cuts2 = [...cuts, { batch_item_id: 'g', input_qty: 65.2 }];
assert.strictEqual(+withRollBalance(green, cuts2, []).available_qty.toFixed(3), 0);

// 4. Printing consumes raw roll and returns printed output for cutting.
const prints = [{ batch_item_id: 'g', input_qty: 424, output_qty: 410 }];
assert.strictEqual(withRollBalance(green, [], prints).printing_available_qty, 0);
assert.strictEqual(withRollBalance(green, [], prints).available_qty, 410);
assert.strictEqual(withRollBalance(green, [{ batch_item_id: 'g', input_qty: 100 }], prints).available_qty, 310);

// 5. Legacy rows with no batch_item_id count against nothing.
assert.strictEqual(withRollBalance(green, [{ batch_item_id: null, input_qty: 999 }], []).available_qty, 424);

// 6. A roll cut straight from extrusion is gone for printing too; a cut taken
//    from printed output does not eat the raw roll.
assert.strictEqual(+withRollBalance(green, cuts, []).printing_available_qty.toFixed(3), 65.2);
assert.strictEqual(withRollBalance(green, [{ batch_item_id: 'g', input_qty: 424 }], []).printing_available_qty, 0);
assert.strictEqual(withRollBalance(green, [{ batch_item_id: 'g', input_qty: 100 }], prints).printing_available_qty, 0);

console.log('roll-balance: 11/11 checks passed');
