import { supabase } from '../../../config/supabase';
import { RMOrderModel } from './rmOrderModel';

export const PurchaseEntryModel = {
    getAll: async (companyId?: string) => {
        let query = supabase.from('purchase_entries').select(`
            *,
            supplier_master!supplier_id(supplier_name, supplier_code),
            rm_orders(order_number),
            purchase_entry_items(
                id, rm_id, ordered_quantity, received_quantity, rate, amount, gst_percent, gst_amount,
                raw_materials!rm_id(rm_name, rm_code, hsn_code)
            )
        `);
        if (companyId) {
            query = query.eq('company_id', companyId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw new Error(error.message);
        return data || [];
    },

    getById: async (id: string) => {
        const { data, error } = await supabase
            .from('purchase_entries')
            .select(`
                *,
                supplier_master!supplier_id(supplier_name, supplier_code),
                rm_orders(order_number, order_date),
                purchase_entry_items(
                    id, rm_id, ordered_quantity, received_quantity, rate, amount, gst_percent, gst_amount,
                    raw_materials!rm_id(rm_name, rm_code, hsn_code)
                )
            `)
            .eq('id', id)
            .single();
        if (error) throw new Error(error.message);
        return data;
    },

    create: async (entryData: any) => {
        let { items, reorder_missing, ...entryInfo } = entryData;

        // Sanitize UUID fields: convert empty strings to null
        if (!entryInfo.order_id || entryInfo.order_id === '') {
            entryInfo.order_id = null;
        }

        // --- GST & TOTAL CALCULATION ---
        const calculateTotal = (itemList: any[]) => {
            return itemList.reduce((sum: number, item: any) => {
                const lineAmount = Number(item.amount) || (Number(item.received_quantity) * Number(item.rate));
                const gst = Number(item.gst_amount || 0);
                // Note: If 'amount' was the total (base + gst), we should be careful.
                // But in the model, 'amount' is usually base.
                // Let's assume based on new logic that Sum of items is the total.
                // Actually, let's check how the frontend sends it.
                return sum + lineAmount;
            }, 0) + Number(entryInfo.unloading_charges || 0);
        };

        // --- EXTRA QUANTITY AUTO RE-ORDER LOGIC ---
        const extraItems = items.filter((i: any) => Number(i.received_quantity) > Number(i.ordered_quantity || 0) && Number(i.ordered_quantity || 0) > 0);

        if (extraItems.length > 0) {
            const extraOrderItems = extraItems.map((i: any) => ({
                rm_id: i.rm_id,
                quantity: Number(i.received_quantity) - Number(i.ordered_quantity),
                rate: i.rate,
                amount: (Number(i.received_quantity) - Number(i.ordered_quantity)) * Number(i.rate)
            }));

            const extraOrderPayload = {
                company_id: entryInfo.company_id,
                supplier_id: entryInfo.supplier_id,
                order_date: new Date().toISOString().split('T')[0],
                order_number: `PO-EX-${Date.now().toString().slice(-6)}`,
                status: 'PENDING',
                remarks: `Added via GRN: ${entryInfo.entry_number} (Extra quantity auto re-order)`,
                total_amount: extraOrderItems.reduce((acc: number, cur: any) => acc + Number(cur.amount), 0),
                items: extraOrderItems
            };

            await RMOrderModel.create(extraOrderPayload);

            // ADJUST current items for this entry: set received_quantity = ordered_quantity
            items = items.map((i: any) => {
                const ordered = Number(i.ordered_quantity || 0);
                const received = Number(i.received_quantity);
                if (received > ordered && ordered > 0) {
                    const baseAmount = ordered * Number(i.rate);
                    const gstAmount = (baseAmount * Number(i.gst_percent || 0)) / 100;
                    return {
                        ...i,
                        received_quantity: ordered,
                        amount: baseAmount,
                        gst_amount: gstAmount
                    };
                }
                return i;
            });

            // Force recalculation of total_amount
            const recalculatedTotal = calculateTotal(items);
            if (entryInfo.is_round_off) {
                const roundedTotal = Math.round(Number(recalculatedTotal));
                entryInfo.total_amount = roundedTotal;
                entryInfo.round_off = roundedTotal - Number(recalculatedTotal);
            } else {
                entryInfo.total_amount = Number(recalculatedTotal);
                entryInfo.round_off = 0;
            }
        }

        if (entryInfo.total_amount === undefined || entryInfo.total_amount === null || entryInfo.total_amount === '') {
            const calculatedTotal = calculateTotal(items);
            if (entryInfo.is_round_off) {
                const roundedTotal = Math.round(Number(calculatedTotal));
                entryInfo.total_amount = roundedTotal;
                entryInfo.round_off = roundedTotal - Number(calculatedTotal);
            } else {
                entryInfo.total_amount = Number(calculatedTotal);
                entryInfo.round_off = 0;
            }
        } else {
            if (entryInfo.is_round_off && (entryInfo.round_off === undefined || entryInfo.round_off === null)) {
                const calculatedTotal = calculateTotal(items);
                entryInfo.round_off = Number(entryInfo.total_amount) - calculatedTotal;
            }
        }

        const { data: entry, error: entryErr } = await supabase
            .from('purchase_entries')
            .insert([entryInfo])
            .select();

        if (entryErr) throw new Error(entryErr.message);

        const entryId = entry[0].id;
        const itemsWithId = items.map((item: any) => {
            // In our system, item.amount is the line total (base + gst)
            // We store the base amount in the 'amount' column.
            const totalAmount = Number(item.amount) || (Number(item.received_quantity) * Number(item.rate)) + Number(item.gst_amount || 0);
            const baseAmount = totalAmount - Number(item.gst_amount || 0);
            return { ...item, amount: baseAmount, entry_id: entryId };
        });

        const { error: itemsErr } = await supabase.from('purchase_entry_items').insert(itemsWithId);
        if (itemsErr) throw new Error(itemsErr.message);

        // Update main order status if linked and all items received (simplified)
        if (entryInfo.order_id) {
            await supabase.from('rm_orders').update({ status: 'RECEIVED' }).eq('id', entryInfo.order_id);
        }

        // --- BACK-ORDER LOGIC ---
        if (reorder_missing) {
            const missingItems = items.filter((i: any) => Number(i.ordered_quantity || 0) > Number(i.received_quantity));
            if (missingItems.length > 0) {
                const correctedBackOrderItems = missingItems.map((i: any) => ({
                    rm_id: i.rm_id,
                    quantity: Number(i.ordered_quantity) - Number(i.received_quantity),
                    rate: i.rate,
                    amount: (Number(i.ordered_quantity) - Number(i.received_quantity)) * Number(i.rate)
                }));

                const newOrderPayload = {
                    company_id: entryInfo.company_id,
                    supplier_id: entryInfo.supplier_id,
                    order_date: new Date().toISOString().split('T')[0],
                    order_number: `PO-BO-${Date.now().toString().slice(-6)}`,
                    status: 'PENDING',
                    remarks: `Back-order for GRN: ${entryInfo.entry_number}`,
                    total_amount: correctedBackOrderItems.reduce((acc: number, cur: any) => acc + Number(cur.amount), 0),
                    items: correctedBackOrderItems
                };

                await RMOrderModel.create(newOrderPayload);
            }
        }

        return entry[0];
    },

    update: async (id: string, entryData: any) => {
        const { items, reorder_missing, ...entryInfo } = entryData;

        if (!entryInfo.order_id || entryInfo.order_id === '') {
            entryInfo.order_id = null;
        }

        if (items) {
            const unroundedTotal = items.reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0) + Number(entryInfo.unloading_charges || 0);
            if (entryInfo.is_round_off) {
                const roundedTotal = Math.round(unroundedTotal);
                entryInfo.total_amount = roundedTotal;
                entryInfo.round_off = roundedTotal - unroundedTotal;
            } else {
                entryInfo.total_amount = unroundedTotal;
                entryInfo.round_off = 0;
            }
        }

        const { data: entry, error: entryErr } = await supabase
            .from('purchase_entries')
            .update(entryInfo)
            .eq('id', id)
            .select();

        if (entryErr) throw new Error(entryErr.message);

        await supabase.from('purchase_entry_items').delete().eq('entry_id', id);
        const itemsWithId = items.map((item: any) => {
            const totalAmount = Number(item.amount) || (Number(item.received_quantity) * Number(item.rate)) + Number(item.gst_amount || 0);
            const baseAmount = totalAmount - Number(item.gst_amount || 0);
            return { ...item, amount: baseAmount, entry_id: id };
        });
        await supabase.from('purchase_entry_items').insert(itemsWithId);

        return entry[0];
    },

    delete: async (id: string) => {
        const { error } = await supabase.from('purchase_entries').delete().eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    },

    getPendingBySupplier: async (supplierId: string, companyId: string) => {
        const { data, error } = await supabase
            .from('v_purchase_entry_balances')
            .select('*')
            .eq('supplier_id', supplierId)
            .eq('company_id', companyId)
            .gt('pending_amount', 0)
            .order('entry_date', { ascending: false });

        if (error) throw new Error(error.message);
        return data || [];
    }
};
