import { Request, Response } from 'express';
import { InvoiceModel } from '../models/invoiceModel';
import { supabase } from '../../../config/supabase';
import { EInvoiceService } from '../services/eInvoiceService';
import { EwbService } from '../services/ewbService';

const getEnrichedInvoice = async (id: string) => {
    const { data, error } = await supabase
        .from('sales_invoices')
        .select(`
            *,
            customers(*, addresses(*)),
            items:sales_invoice_items(
                *,
                finished_products(product_name, product_code, hsn_code)
            )
        `)
        .eq('id', id)
        .single();
    if (error) throw new Error(error.message);
    return data;
};

export const invoiceController = {
    getAll: async (req: Request, res: Response) => {
        try {
            const { company_id } = req.query;
            const data = await InvoiceModel.getAll(company_id as string);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    getNextNumber: async (req: Request, res: Response) => {
        try {
            const { company_id } = req.query;
            const invoiceNumber = await InvoiceModel.getNextNumber(company_id as string);
            res.json({ success: true, invoice_number: invoiceNumber });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    create: async (req: Request, res: Response) => {
        try {
            // Auto-determine invoice_type if not explicitly provided
            const payload = { ...req.body };
            if (!payload.invoice_type) {
                if (payload.customer_id) {
                    const { data: cust } = await supabase
                        .from('customers')
                        .select('gst_no')
                        .eq('id', payload.customer_id)
                        .single();
                    payload.invoice_type = cust?.gst_no ? 'B2B' : 'B2C';
                } else {
                    payload.invoice_type = 'B2B';
                }
            }

            const data = await InvoiceModel.create(payload);
            let finalData = data;

            // Trigger automatically based on B2B / B2C and Amount conditions
            const enriched = await getEnrichedInvoice(data.id);
            const invType = (enriched.invoice_type || (enriched.customers?.gst_no ? 'B2B' : 'B2C')).toUpperCase();
            const isB2B = invType === 'B2B';
            const netAmount = Number(enriched.net_amount);
            const isExternal = Boolean(enriched.is_external);

            let eInvoiceResult: any = null;
            let ewbResult: any = null;

            // Rule 1: e-Invoice is B2B only and NOT an external bill raised outside system (e.g. Tally)
            if (!isExternal && isB2B && netAmount > 0) {
                console.log(`[invoiceController] Auto-triggering e-Invoice for B2B Invoice ${enriched.invoice_number}`);
                eInvoiceResult = await EInvoiceService.generateEInvoice(enriched, enriched.customers, enriched.items);
            } else if (isExternal) {
                console.log(`[invoiceController] External bill detected (${enriched.billing_software || 'External'}). Skipping e-Invoice generation for Invoice ${enriched.invoice_number}`);
                await supabase.from('sales_invoices').update({ einvoice_status: 'NOT_APPLICABLE' }).eq('id', data.id);
            }

            // Rule 2: e-Way Bill triggers if Amount > 50,000 (only for internal invoices)
            if (!isExternal && netAmount > 50000) {
                console.log(`[invoiceController] Auto-triggering EWB for Invoice ${enriched.invoice_number} (Amount: ${netAmount})`);
                ewbResult = await EwbService.generateEwb(enriched, enriched.customers, enriched.items);
            }

            if (eInvoiceResult || ewbResult) {
                const updateFields: any = {};
                if (eInvoiceResult) {
                    updateFields.einvoice_status = eInvoiceResult.status;
                    updateFields.einvoice_irn = eInvoiceResult.irn || null;
                    updateFields.einvoice_ack_no = eInvoiceResult.ack_no || null;
                    updateFields.einvoice_ack_date = eInvoiceResult.ack_date || null;
                    updateFields.einvoice_signed_invoice = eInvoiceResult.signed_invoice || null;
                    updateFields.einvoice_signed_qr_code = eInvoiceResult.signed_qr_code || null;
                    updateFields.einvoice_error = eInvoiceResult.error || null;
                }
                if (ewbResult) {
                    updateFields.ewb_status = ewbResult.ewb_status;
                    updateFields.ewb_no = ewbResult.ewb_no || null;
                    updateFields.ewb_date = ewbResult.ewb_date || null;
                    updateFields.ewb_valid_till = ewbResult.ewb_valid_till || null;
                    updateFields.ewb_error = ewbResult.ewb_error || null;
                }

                const { data: updated, error: updateErr } = await supabase
                    .from('sales_invoices')
                    .update(updateFields)
                    .eq('id', data.id)
                    .select();

                if (!updateErr && updated && updated.length > 0) {
                    finalData = updated[0];
                }
            }

            res.status(201).json({ success: true, data: finalData });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    update: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            await InvoiceModel.update(id, req.body);

            // Re-trigger conditionally on update
            const enriched = await getEnrichedInvoice(id);
            const invType = (enriched.invoice_type || (enriched.customers?.gst_no ? 'B2B' : 'B2C')).toUpperCase();
            const isB2B = invType === 'B2B';
            const netAmount = Number(enriched.net_amount);
            const isExternal = Boolean(enriched.is_external);

            let eInvoiceResult: any = null;
            let ewbResult: any = null;

            if (!isExternal && isB2B && netAmount > 0 && enriched.einvoice_status !== 'GENERATED') {
                console.log(`[invoiceController] Re-triggering e-Invoice on update for B2B Invoice ${enriched.invoice_number}`);
                eInvoiceResult = await EInvoiceService.generateEInvoice(enriched, enriched.customers, enriched.items);
            } else if (isExternal && enriched.einvoice_status !== 'GENERATED') {
                console.log(`[invoiceController] External bill detected on update (${enriched.billing_software || 'External'}). Setting einvoice_status to NOT_APPLICABLE for Invoice ${enriched.invoice_number}`);
                await supabase.from('sales_invoices').update({ einvoice_status: 'NOT_APPLICABLE' }).eq('id', id);
            }

            if (!isExternal && netAmount > 50000 && enriched.ewb_status !== 'GENERATED') {
                console.log(`[invoiceController] Re-triggering EWB on update for Invoice ${enriched.invoice_number}`);
                ewbResult = await EwbService.generateEwb(enriched, enriched.customers, enriched.items);
            }

            if (eInvoiceResult || ewbResult) {
                const updateFields: any = {};
                if (eInvoiceResult) {
                    updateFields.einvoice_status = eInvoiceResult.status;
                    updateFields.einvoice_irn = eInvoiceResult.irn || null;
                    updateFields.einvoice_ack_no = eInvoiceResult.ack_no || null;
                    updateFields.einvoice_ack_date = eInvoiceResult.ack_date || null;
                    updateFields.einvoice_signed_invoice = eInvoiceResult.signed_invoice || null;
                    updateFields.einvoice_signed_qr_code = eInvoiceResult.signed_qr_code || null;
                    updateFields.einvoice_error = eInvoiceResult.error || null;
                }
                if (ewbResult) {
                    updateFields.ewb_status = ewbResult.ewb_status;
                    updateFields.ewb_no = ewbResult.ewb_no || null;
                    updateFields.ewb_date = ewbResult.ewb_date || null;
                    updateFields.ewb_valid_till = ewbResult.ewb_valid_till || null;
                    updateFields.ewb_error = ewbResult.ewb_error || null;
                }

                await supabase
                    .from('sales_invoices')
                    .update(updateFields)
                    .eq('id', id);
            }

            res.json({ success: true, message: 'Invoice updated successfully' });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    delete: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            await InvoiceModel.delete(id);
            res.json({ success: true, message: 'Invoice deleted successfully' });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    generateEInvoice: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const invoice = await getEnrichedInvoice(id);

            if (invoice.is_external) {
                return res.status(400).json({ success: false, message: 'E-Invoice generation is disabled for bills raised outside the system (external bills).' });
            }

            if (!invoice.customers?.gst_no) {
                return res.status(400).json({ success: false, message: 'E-Invoice requires a B2B customer with a valid GST number.' });
            }

            console.log(`[invoiceController] Manually generating e-Invoice for Invoice ID: ${id}`);
            const result = await EInvoiceService.generateEInvoice(invoice, invoice.customers, invoice.items);

            const { data: updated, error: updateErr } = await supabase
                .from('sales_invoices')
                .update({
                    einvoice_status: result.status,
                    einvoice_irn: result.irn || null,
                    einvoice_ack_no: result.ack_no || null,
                    einvoice_ack_date: result.ack_date || null,
                    einvoice_signed_invoice: result.signed_invoice || null,
                    einvoice_signed_qr_code: result.signed_qr_code || null,
                    einvoice_error: result.error || null
                })
                .eq('id', id)
                .select();

            if (updateErr) throw new Error(updateErr.message);

            res.json({ success: true, data: updated[0] });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    generateEwb: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { vehicle_no, transporter_id, transporter_name, trans_distance, trans_mode, vehicle_type, trans_doc_no, trans_doc_date } = req.body || {};

            let invoice = await getEnrichedInvoice(id);

            // Update transport fields if provided
            if (vehicle_no !== undefined || transporter_id !== undefined || trans_distance !== undefined || trans_mode !== undefined) {
                const updateBody: any = {};
                if (vehicle_no !== undefined) updateBody.vehicle_no = vehicle_no || null;
                if (transporter_id !== undefined) updateBody.transporter_id = transporter_id || null;
                if (transporter_name !== undefined) updateBody.transporter_name = transporter_name || null;
                if (trans_distance !== undefined) updateBody.trans_distance = Number(trans_distance) || 0;
                if (trans_mode !== undefined) updateBody.trans_mode = trans_mode || '1';
                if (vehicle_type !== undefined) updateBody.vehicle_type = vehicle_type || 'Regular';
                if (trans_doc_no !== undefined) updateBody.trans_doc_no = trans_doc_no || null;
                if (trans_doc_date !== undefined) updateBody.trans_doc_date = trans_doc_date && trans_doc_date.trim() !== '' ? trans_doc_date : null;

                await supabase.from('sales_invoices').update(updateBody).eq('id', id);
                invoice = await getEnrichedInvoice(id);
            }

            console.log(`[invoiceController] Manually generating E-Way Bill for Invoice ID: ${id}`);
            const result = await EwbService.generateEwb(invoice, invoice.customers, invoice.items);

            const { data: updated, error: updateErr } = await supabase
                .from('sales_invoices')
                .update({
                    ewb_status: result.ewb_status,
                    ewb_no: result.ewb_no || null,
                    ewb_date: result.ewb_date || null,
                    ewb_valid_till: result.ewb_valid_till || null,
                    ewb_error: result.ewb_error || null
                })
                .eq('id', id)
                .select();

            if (updateErr) throw new Error(updateErr.message);

            res.json({ success: true, data: updated[0] });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    cancelEInvoice: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { reasonCode, remarks, cancel_reason, cancel_remarks } = req.body || {};
            const finalReason = reasonCode || cancel_reason || '2';
            const finalRemarks = remarks || cancel_remarks || 'Cancelled from ERP';
            const invoice = await getEnrichedInvoice(id);

            if (!invoice.einvoice_irn) {
                return res.status(400).json({ success: false, message: 'Invoice does not have a generated IRN to cancel.' });
            }

            console.log(`[invoiceController] Cancelling e-Invoice for Invoice ID: ${id}`);
            const result = await EInvoiceService.cancelEInvoice(invoice, finalReason, finalRemarks);

            if (result.status === 'CANCELLED') {
                const { data: updated, error: updateErr } = await supabase
                    .from('sales_invoices')
                    .update({
                        einvoice_status: 'CANCELLED',
                        einvoice_error: null
                    })
                    .eq('id', id)
                    .select();

                if (updateErr) throw new Error(updateErr.message);
                res.json({ success: true, data: updated[0] });
            } else {
                res.status(400).json({ success: false, message: result.error || 'Failed to cancel e-Invoice' });
            }
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    cancelEwb: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { reasonCode, remarks } = req.body;
            const invoice = await getEnrichedInvoice(id);

            if (!invoice.ewb_no) {
                return res.status(400).json({ success: false, message: 'Invoice does not have a generated E-Way Bill to cancel.' });
            }

            console.log(`[invoiceController] Cancelling E-Way Bill for Invoice ID: ${id}`);
            const result = await EwbService.cancelEwb(invoice, reasonCode || '3', remarks || 'Cancelled from ERP');

            if (result.ewb_status === 'CANCELLED') {
                const { data: updated, error: updateErr } = await supabase
                    .from('sales_invoices')
                    .update({
                        ewb_status: 'CANCELLED',
                        ewb_error: null
                    })
                    .eq('id', id)
                    .select();

                if (updateErr) throw new Error(updateErr.message);
                res.json({ success: true, data: updated[0] });
            } else {
                res.status(400).json({ success: false, message: result.ewb_error || 'Failed to cancel E-Way Bill' });
            }
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};
