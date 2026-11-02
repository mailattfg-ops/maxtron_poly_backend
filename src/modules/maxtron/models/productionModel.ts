import { supabase } from '../../../config/supabase';

const sumFor = (rows: any[], key: string, itemId: string) =>
    rows.filter(r => r.batch_item_id === itemId).reduce((s, r) => s + (Number(r[key]) || 0), 0);

/**
 * Roll balance for one extrusion item (batch × product). The unit of stock
 * between extrusion and cutting is the ROLL, not the batch: one batch can
 * extrude Green 424 Kg and Transparent 776 Kg, and the floor cuts part of
 * one roll per shift and keeps the rest.
 *
 *   available_qty          — what cutting may draw: raw roll left + printed
 *                            output, minus everything already cut
 *   printing_available_qty — raw roll not yet printed AND not yet cut. Cuts
 *                            are taken to come from printed output first;
 *                            whatever exceeds it must have come off the raw
 *                            roll, so a roll cut straight from extrusion
 *                            cannot be printed afterwards.
 *
 * ponytail: one pool for cutting, so a partially printed roll lets cutting
 * draw the unprinted remainder too. Split into raw/printed pools if the
 * floor ever needs that distinction.
 */
export const withRollBalance = (item: any, conversions: any[], printings: any[]) => {
    const out = Number(item.output_qty) || 0;
    const printIn = sumFor(printings, 'input_qty', item.id);
    const printOut = sumFor(printings, 'output_qty', item.id);
    const cutIn = sumFor(conversions, 'input_qty', item.id);
    const cutFromRaw = Math.max(0, cutIn - printOut);
    return {
        ...item,
        printing_available_qty: out - printIn - cutFromRaw,
        available_qty: out - printIn + printOut - cutIn,
    };
};

/**
 * Refuse a cutting/printing entry that draws more than the roll has left.
 * The UI caps the field too, but the UI is not a check. `excludeId` is the
 * row being edited, so its own previous draw is not counted against it.
 * Returns the roll so callers can attribute wastage to the right product.
 */
const assertRollBalance = async (
    stage: 'cutting' | 'printing',
    batchItemId: string,
    inputQty: number,
    excludeId?: string
) => {
    const { data: item, error } = await supabase
        .from('production_batch_items')
        .select('id, batch_id, product_id, output_qty')
        .eq('id', batchItemId)
        .single();
    if (error || !item) throw new Error('Selected roll (batch item) not found.');

    const [{ data: convs }, { data: prints }] = await Promise.all([
        supabase.from('production_conversions').select('id, batch_item_id, input_qty').eq('batch_item_id', batchItemId),
        supabase.from('production_printing').select('id, batch_item_id, input_qty, output_qty').eq('batch_item_id', batchItemId),
    ]);
    const roll = withRollBalance(
        item,
        (convs || []).filter(c => c.id !== excludeId),
        (prints || []).filter(p => p.id !== excludeId)
    );
    const available = stage === 'cutting' ? roll.available_qty : roll.printing_available_qty;
    if (inputQty > available + 0.0005) {
        const err: any = new Error(`Only ${available.toFixed(3)} Kg left on this roll; ${inputQty} Kg requested.`);
        err.status = 400;
        throw err;
    }
    return item;
};

export const ProductionModel = {
    // Extrusion Batches
    getBatches: async (companyId: string) => {
        console.log(`Fetching batches for companyId: ${companyId}`);
        const [{ data, error }, { data: convs }, { data: prints }] = await Promise.all([
            supabase
                .from('production_batches')
                .select(`
                    *,
                    finished_products(id, product_name, product_code, color),
                    items:production_batch_items(
                        *,
                        finished_products(id, product_name, product_code, color)
                    ),
                    supervisor:users!supervisor_id(name),
                    operator:users!operator_id(name),
                    material_consumptions!batch_id(
                        *,
                        raw_materials!rm_id(rm_name, rm_code)
                    )
                `)
                .eq('company_id', companyId)
                .order('batch_number', { ascending: false }),
            supabase.from('production_conversions').select('batch_item_id, input_qty').eq('company_id', companyId),
            supabase.from('production_printing').select('batch_item_id, input_qty, output_qty').eq('company_id', companyId),
        ]);

        if (error) {
            console.error('Supabase Error in getBatches:', error);
            throw new Error(error.message);
        }

        console.log(`Fetched ${data?.length || 0} batches`);
        return (data || []).map((b: any) => ({
            ...b,
            items: (b.items || []).map((it: any) => withRollBalance(it, convs || [], prints || [])),
        }));
    },

    createBatch: async (batchData: any) => {
        const { consumption_ids, items, ...batchFields } = batchData;
        const sanitizedData = { ...batchFields };
        const uuidFields = ['product_id', 'operator_id', 'supervisor_id', 'company_id', 'consumption_id'];

        const wastage = Math.max(0, Number(sanitizedData.wastage_qty) || 0);
        sanitizedData.wastage_qty = wastage;

        if (Array.isArray(items) && items.length > 0) {
            sanitizedData.product_id = items[0].product_id || sanitizedData.product_id;
            const itemsOutputTotal = items.reduce((sum: number, it: any) => sum + (Number(it.output_qty) || 0), 0);
            if (itemsOutputTotal > 0) {
                sanitizedData.extrusion_output_qty = Math.max(0, Number((itemsOutputTotal - wastage).toFixed(2)));
            }
        } else if (sanitizedData.extrusion_output_qty !== undefined) {
            sanitizedData.extrusion_output_qty = Math.max(0, Number(((Number(sanitizedData.extrusion_output_qty) || 0) - wastage).toFixed(2)));
        }

        uuidFields.forEach(field => {
            if (sanitizedData[field] === '') {
                sanitizedData[field] = null;
            }
        });

        // 1. Calculate sum of quantities for raw_material_consumed_qty
        let totalQty = 0;
        if (Array.isArray(consumption_ids) && consumption_ids.length > 0) {
            const { data: conData, error: conError } = await supabase
                .from('material_consumptions')
                .select('quantity_used')
                .in('id', consumption_ids);
            if (!conError && conData) {
                totalQty = conData.reduce((sum, item) => sum + (Number(item.quantity_used) || 0), 0);
            }
        }
        sanitizedData.raw_material_consumed_qty = totalQty;

        // 2. Insert production batch
        const { data, error } = await supabase
            .from('production_batches')
            .insert([sanitizedData])
            .select()
            .single();

        if (error) throw new Error(error.message);

        // 3. Link selected material_consumptions
        if (Array.isArray(consumption_ids) && consumption_ids.length > 0) {
            const { error: updateError } = await supabase
                .from('material_consumptions')
                .update({ batch_id: data.id })
                .in('id', consumption_ids);

            if (updateError) throw new Error(updateError.message);
        }

        // 4. Insert finished product items
        if (Array.isArray(items) && items.length > 0) {
            const itemsToInsert = items
                .filter((it: any) => it.product_id)
                .map((it: any) => ({
                    batch_id: data.id,
                    product_id: it.product_id,
                    output_qty: Number(it.output_qty) || 0
                }));

            if (itemsToInsert.length > 0) {
                const { error: batchItemsError } = await supabase
                    .from('production_batch_items')
                    .insert(itemsToInsert);

                if (batchItemsError) throw new Error(batchItemsError.message);
            }
        }

        return data;
    },

    updateBatch: async (id: string, batchData: any) => {
        const { consumption_ids, items, ...batchFields } = batchData;
        const sanitizedData = { ...batchFields };
        const uuidFields = ['product_id', 'operator_id', 'supervisor_id', 'company_id', 'consumption_id'];

        const wastage = Math.max(0, Number(sanitizedData.wastage_qty) || 0);
        sanitizedData.wastage_qty = wastage;

        if (Array.isArray(items) && items.length > 0) {
            sanitizedData.product_id = items[0].product_id || sanitizedData.product_id;
            const itemsOutputTotal = items.reduce((sum: number, it: any) => sum + (Number(it.output_qty) || 0), 0);
            if (itemsOutputTotal > 0) {
                sanitizedData.extrusion_output_qty = Math.max(0, Number((itemsOutputTotal - wastage).toFixed(2)));
            }
        } else if (sanitizedData.extrusion_output_qty !== undefined) {
            sanitizedData.extrusion_output_qty = Math.max(0, Number(((Number(sanitizedData.extrusion_output_qty) || 0) - wastage).toFixed(2)));
        }

        uuidFields.forEach(field => {
            if (sanitizedData[field] === '') {
                sanitizedData[field] = null;
            }
        });

        // 1. Calculate sum of quantities for raw_material_consumed_qty
        let totalQty = 0;
        if (Array.isArray(consumption_ids) && consumption_ids.length > 0) {
            const { data: conData, error: conError } = await supabase
                .from('material_consumptions')
                .select('quantity_used')
                .in('id', consumption_ids);
            if (!conError && conData) {
                totalQty = conData.reduce((sum, item) => sum + (Number(item.quantity_used) || 0), 0);
            }
        }
        sanitizedData.raw_material_consumed_qty = totalQty;

        // 2. Update production batch
        const { data, error } = await supabase
            .from('production_batches')
            .update(sanitizedData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);

        // 3. Reset batch_id for all consumptions currently linked to this batch
        await supabase
            .from('material_consumptions')
            .update({ batch_id: null })
            .eq('batch_id', id);

        // 4. Link the new set of consumptions
        if (Array.isArray(consumption_ids) && consumption_ids.length > 0) {
            const { error: updateError } = await supabase
                .from('material_consumptions')
                .update({ batch_id: id })
                .in('id', consumption_ids);

            if (updateError) throw new Error(updateError.message);
        }

        // 5. Update production_batch_items
        if (items) {
            await supabase.from('production_batch_items').delete().eq('batch_id', id);

            if (Array.isArray(items) && items.length > 0) {
                const itemsToInsert = items
                    .filter((it: any) => it.product_id)
                    .map((it: any) => ({
                        batch_id: id,
                        product_id: it.product_id,
                        output_qty: Number(it.output_qty) || 0
                    }));

                if (itemsToInsert.length > 0) {
                    const { error: batchItemsError } = await supabase
                        .from('production_batch_items')
                        .insert(itemsToInsert);

                    if (batchItemsError) throw new Error(batchItemsError.message);
                }
            }
        }

        return data;
    },

    deleteBatch: async (id: string) => {
        // Delete batch items
        await supabase
            .from('production_batch_items')
            .delete()
            .eq('batch_id', id);
        // Cascade: delete all production_conversions and their items first
        const { data: conversions } = await supabase
            .from('production_conversions')
            .select('id')
            .eq('batch_id', id);

        if (conversions && conversions.length > 0) {
            const convIds = conversions.map((c: any) => c.id);

            // Delete conversion items
            await supabase
                .from('production_conversion_items')
                .delete()
                .in('conversion_id', convIds);

            // Delete packing records linked to conversions
            await supabase
                .from('production_packing')
                .delete()
                .in('conversion_id', convIds);

            // Delete conversions
            await supabase
                .from('production_conversions')
                .delete()
                .in('id', convIds);
        }

        // Delete printing records
        await supabase
            .from('production_printing')
            .delete()
            .eq('batch_id', id);

        // Delete wastage records
        await supabase
            .from('production_wastage')
            .delete()
            .eq('batch_id', id);

        // Finally delete the batch
        const { error } = await supabase
            .from('production_batches')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);
        return true;
    },

    // Conversion (Cutting & Sealing)
    getConversions: async (companyId: string) => {
        const { data, error } = await supabase
            .from('production_conversions')
            .select(`
                *,
                production_batches(batch_number, finished_products(product_name)),
                batch_item:production_batch_items!batch_item_id(finished_products(product_name, product_code, color)),
                operator:users!operator_id(name),
                items:production_conversion_items(
                    *,
                    finished_products(product_name, product_code)
                )
            `)
            .eq('company_id', companyId)
            .order('conversion_number', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    createConversion: async (convData: any) => {
        const { items, ...header } = convData;

        // Sanitize header UUID fields
        const sanitizedHeader = { ...header };
        ['batch_id', 'batch_item_id', 'operator_id', 'company_id'].forEach(f => {
            if (sanitizedHeader[f] === '') sanitizedHeader[f] = null;
        });

        const roll = sanitizedHeader.batch_item_id
            ? await assertRollBalance('cutting', sanitizedHeader.batch_item_id, Number(sanitizedHeader.input_qty) || 0)
            : null;

        const { data, error } = await supabase
            .from('production_conversions')
            .insert([sanitizedHeader])
            .select()
            .single();

        if (error) throw new Error(error.message);

        if (items && items.length > 0) {
            const itemsToInsert = items.map((item: any) => {
                const sanitizedItem = { ...item, conversion_id: data.id };
                if (sanitizedItem.product_id === '') sanitizedItem.product_id = null;
                return sanitizedItem;
            });
            const { error: itemError } = await supabase
                .from('production_conversion_items')
                .insert(itemsToInsert);
            if (itemError) throw new Error(itemError.message);
        }

        // --- AUTOMATED WASTAGE LOGGING ---
        if (Number(data.wastage_qty || 0) > 0) {
            // The roll's product; the batch's product_id is only its FIRST product.
            let productId = roll?.product_id || null;
            if (!productId) {
                const { data: batch } = await supabase
                    .from('production_batches')
                    .select('product_id')
                    .eq('id', data.batch_id)
                    .single();
                productId = batch?.product_id || null;
            }

            await supabase.from('production_wastage').insert([{
                company_id: data.company_id,
                stage: 'Cutting',
                product_id: productId,
                date: data.date,
                wastage_qty: Number(data.wastage_qty),
                reason_code: 'PRODUCTION_WASTAGE',
                remarks: `Job No: ${data.conversion_number}. Cutting & Sealing Wastage for Batch: ${data.id}. Remarks: ${data.remarks || ''}`
            }]);
        }

        return data;
    },

    updateConversion: async (id: string, convData: any) => {
        const { items, ...header } = convData;
        const sanitizedHeader = { ...header };
        ['batch_id', 'batch_item_id', 'operator_id', 'company_id'].forEach(f => {
            if (sanitizedHeader[f] === '') sanitizedHeader[f] = null;
        });

        if (sanitizedHeader.batch_item_id) {
            await assertRollBalance('cutting', sanitizedHeader.batch_item_id, Number(sanitizedHeader.input_qty) || 0, id);
        }

        const { data, error } = await supabase
            .from('production_conversions')
            .update(sanitizedHeader)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);

        // Update items: delete existing and insert new ones
        await supabase.from('production_conversion_items').delete().eq('conversion_id', id);

        if (items && items.length > 0) {
            const itemsToInsert = items.map((item: any) => {
                const sanitizedItem = { ...item, conversion_id: id };
                if (sanitizedItem.product_id === '') sanitizedItem.product_id = null;
                delete sanitizedItem.id; // Ensure we don't try to insert old IDs
                return sanitizedItem;
            });
            const { error: itemError } = await supabase
                .from('production_conversion_items')
                .insert(itemsToInsert);
            if (itemError) throw new Error(itemError.message);
        }

        return data;
    },

    deleteConversion: async (id: string) => {
        const { error } = await supabase
            .from('production_conversions')
            .delete()
            .eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    },

    // Printing
    getPrinting: async (companyId: string) => {
        const { data, error } = await supabase
            .from('production_printing')
            .select(`
                *,
                production_batches(
                    batch_number,
                    finished_products(product_name, product_code, color)
                ),
                batch_item:production_batch_items!batch_item_id(finished_products(product_name, product_code, color)),
                operator:users!operator_id(name)
            `)
            .eq('company_id', companyId)
            .order('printing_number', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    createPrinting: async (printData: any) => {
        const sanitizedData = { ...printData };
        ['batch_id', 'batch_item_id', 'operator_id', 'company_id'].forEach(f => {
            if (sanitizedData[f] === '') sanitizedData[f] = null;
        });

        const roll = sanitizedData.batch_item_id
            ? await assertRollBalance('printing', sanitizedData.batch_item_id, Number(sanitizedData.input_qty) || 0)
            : null;

        // The job number is assigned HERE, from the database — never trusted
        // from the browser. The page used to pick max(loaded jobs)+1, so a tab
        // opened before someone else's save (or two people on the page) both
        // chose PRN-000001 and hit the unique constraint.
        // ponytail: max+1 has a tiny race between two simultaneous saves; the
        // unique constraint still catches it and the user retries. Move to a
        // sequence like cutting_no_seq if that ever actually happens.
        const { data: last } = await supabase
            .from('production_printing')
            .select('printing_number')
            .eq('company_id', sanitizedData.company_id)
            .like('printing_number', 'PRN-%')
            .order('printing_number', { ascending: false })
            .limit(1);
        const lastNo = parseInt(String(last?.[0]?.printing_number || '').split('-')[1] || '0', 10) || 0;
        sanitizedData.printing_number = `PRN-${String(lastNo + 1).padStart(6, '0')}`;

        const { data, error } = await supabase
            .from('production_printing')
            .insert([sanitizedData])
            .select()
            .single();

        if (error) throw new Error(error.message);

        // Track wastage for printing
        if (Number(data.wastage_qty || 0) > 0) {
            let productId = roll?.product_id || null;
            if (!productId) {
                const { data: batch } = await supabase.from('production_batches').select('product_id').eq('id', data.batch_id).single();
                productId = batch?.product_id || null;
            }
            await supabase.from('production_wastage').insert([{
                company_id: data.company_id,
                stage: 'Printing',
                product_id: productId,
                date: data.date,
                wastage_qty: Number(data.wastage_qty),
                reason_code: 'PRINTING_WASTAGE',
                remarks: `Job No: ${data.printing_number}. Printing Wastage for Batch: ${data.id}. Ink: ${data.ink_details}`
            }]);
        }

        return data;
    },

    updatePrinting: async (id: string, printData: any) => {
        const sanitizedData = { ...printData };
        ['batch_id', 'batch_item_id', 'operator_id', 'company_id'].forEach(f => {
            if (sanitizedData[f] === '') sanitizedData[f] = null;
        });
        // The number was assigned on create; an edit never changes or blanks it.
        delete sanitizedData.printing_number;

        if (sanitizedData.batch_item_id) {
            await assertRollBalance('printing', sanitizedData.batch_item_id, Number(sanitizedData.input_qty) || 0, id);
        }

        const { data, error } = await supabase
            .from('production_printing')
            .update(sanitizedData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data;
    },

    deletePrinting: async (id: string) => {
        const { error } = await supabase
            .from('production_printing')
            .delete()
            .eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    },

    // Packing
    getPacking: async (companyId: string) => {
        const { data, error } = await supabase
            .from('production_packing')
            .select(`
                *,
                production_conversions(
                    production_batches(batch_number, finished_products(product_name)),
                    batch_item:production_batch_items!batch_item_id(finished_products(product_name))
                )
            `)
            .eq('company_id', companyId)
            .order('date', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    createPacking: async (packData: any) => {
        const sanitizedData = { ...packData };
        ['conversion_id', 'company_id'].forEach(f => {
            if (sanitizedData[f] === '') sanitizedData[f] = null;
        });

        const { data, error } = await supabase
            .from('production_packing')
            .insert([sanitizedData])
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    updatePacking: async (id: string, packData: any) => {
        const sanitizedData = { ...packData };
        ['conversion_id', 'company_id'].forEach(f => {
            if (sanitizedData[f] === '') sanitizedData[f] = null;
        });

        const { data, error } = await supabase
            .from('production_packing')
            .update(sanitizedData)
            .eq('id', id)
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    deletePacking: async (id: string) => {
        const { error } = await supabase
            .from('production_packing')
            .delete()
            .eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    },

    // Wastage
    getWastage: async (companyId: string) => {
        const { data, error } = await supabase
            .from('production_wastage')
            .select(`
                *,
                finished_products!product_id(product_name),
                raw_materials!material_id(rm_name)
            `)
            .eq('company_id', companyId)
            .order('date', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    createWastage: async (wastageData: any) => {
        const sanitizedData = { ...wastageData };
        ['product_id', 'material_id', 'company_id'].forEach(f => {
            if (sanitizedData[f] === '') sanitizedData[f] = null;
        });

        const { data, error } = await supabase
            .from('production_wastage')
            .insert([sanitizedData])
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    updateWastage: async (id: string, wastageData: any) => {
        const sanitizedData = { ...wastageData };
        ['product_id', 'material_id', 'company_id'].forEach(f => {
            if (sanitizedData[f] === '') sanitizedData[f] = null;
        });

        const { data, error } = await supabase
            .from('production_wastage')
            .update(sanitizedData)
            .eq('id', id)
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    deleteWastage: async (id: string) => {
        const { error } = await supabase
            .from('production_wastage')
            .delete()
            .eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    },

    // Expenses
    getExpenses: async (companyId: string) => {
        const { data, error } = await supabase
            .from('production_expenses')
            .select('*')
            .eq('company_id', companyId)
            .order('expense_date', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    createExpense: async (expenseData: any) => {
        const sanitizedData = { ...expenseData };
        if (sanitizedData.company_id === '') sanitizedData.company_id = null;

        const { data, error } = await supabase
            .from('production_expenses')
            .insert([sanitizedData])
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    updateExpense: async (id: string, expenseData: any) => {
        const sanitizedData = { ...expenseData };
        if (sanitizedData.company_id === '') sanitizedData.company_id = null;

        const { data, error } = await supabase
            .from('production_expenses')
            .update(sanitizedData)
            .eq('id', id)
            .select()
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    deleteExpense: async (id: string) => {
        const { error } = await supabase
            .from('production_expenses')
            .delete()
            .eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};
