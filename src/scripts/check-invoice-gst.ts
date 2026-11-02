/**
 * Self-check for what an invoice reports to the GST portal. No network calls.
 *
 *   npx ts-node --transpile-only src/scripts/check-invoice-gst.ts
 *
 * Two rules: each line goes out at the GST rate typed for it (0% included,
 * never an assumed 18%), and nothing the records do not hold is filled in.
 */
import assert from 'assert';
import { lineGstRates, missingForPortal } from '../modules/maxtron/services/eInvoiceService';
import { EwbService } from '../modules/maxtron/services/ewbService';

const line = (quantity: number, rate: number, gst_percent?: number | null) =>
    ({ quantity, rate, amount: quantity * rate, gst_percent, finished_products: { product_name: 'BAG', hsn_code: '39232100' } });
const customer = { customer_name: 'Test Customer', gst_no: '32ABCDE1234F1Z5', addresses: [{ street: '12 bB', city: 'Kochi', state: 'Kerala', zip_code: '685 592' }] };

(async () => {
    // Rates as typed
    assert.deepStrictEqual(lineGstRates({ total_amount: 1000, tax_amount: 0 }, [line(10, 100, 0)]), [0], 'a typed 0% is reported as 0%');
    assert.deepStrictEqual(lineGstRates({ total_amount: 2000, tax_amount: 170 }, [line(10, 100, 5), line(10, 100, 12)]), [5, 12], 'each line at its own rate');
    assert.deepStrictEqual(lineGstRates({ total_amount: 1100, tax_amount: 198 }, [line(10, 110, 18)]), [18]);

    // Lines saved before the rate was stored: the invoice's own rate, not 18
    assert.deepStrictEqual(lineGstRates({ total_amount: 1100, tax_amount: 198 }, [line(10, 110)]), [18]);
    assert.deepStrictEqual(lineGstRates({ total_amount: 1000, tax_amount: 50 }, [line(10, 100, null)]), [5]);
    assert.deepStrictEqual(lineGstRates({ total_amount: 36100, tax_amount: 0 }, [line(300, 95), line(80, 95)]), [0, 0], 'no tax charged is 0%, not 18%');

    // Tax total typed over the line rates: the saved total is what was charged
    assert.deepStrictEqual(lineGstRates({ total_amount: 36100, tax_amount: 0 }, [line(300, 95, 18), line(80, 95, 18)]), [0, 0]);
    // ...but paise of rounding do not count as a contradiction
    assert.deepStrictEqual(lineGstRates({ total_amount: 333.33, tax_amount: 60 }, [line(1, 333.33, 18)]), [18]);

    // An order (total_value, not total_amount) works the same way
    assert.deepStrictEqual(lineGstRates({ total_value: 36100, tax_amount: 6498 }, [line(300, 95, 18), line(80, 95, 18)]), [18, 18]);

    // Nothing is filled in for the customer
    assert.deepStrictEqual(missingForPortal(customer, [line(1, 1, 18)]), []);
    assert.deepStrictEqual(
        missingForPortal({ addresses: [{ street: 'x', city: '', zip_code: '' }] }, [{ quantity: 1, rate: 1, finished_products: { product_name: 'BAG' } }, { quantity: 1, rate: 1 }]),
        ['customer city', 'customer PIN code', 'HSN code of BAG', 'product on line 2']);
    assert.deepStrictEqual(missingForPortal({}, []), ['customer address', 'customer city', 'customer PIN code']);

    // An e-Way Bill without a vehicle or transporter is refused, not sent with a made-up vehicle
    const noVehicle = await EwbService.generateEwb({ invoice_number: 'T1', total_amount: 100, tax_amount: 18 }, customer, [line(10, 10, 18)]);
    assert.strictEqual(noVehicle.ewb_status, 'FAILED');
    assert.ok(/vehicle number/.test(noVehicle.ewb_error || ''), noVehicle.ewb_error);

    console.log('invoice-gst: all checks passed');
})().catch(e => { console.error(e); process.exit(1); });
