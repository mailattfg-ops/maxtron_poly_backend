import { Request, Response } from 'express';
import { SalesReturnModel } from '../models/salesReturnModel';
import { supabase } from '../../../config/supabase';
import { EInvoiceService } from '../services/eInvoiceService';

/**
 * Fetch a full return record with all joins needed for CRN generation.
 */
const getEnrichedReturn = async (id: string) => {
    const { data, error } = await supabase
        .from('sales_returns')
        .select(`
            *,
            invoices:sales_invoices(
                id, invoice_number, invoice_date, invoice_type,
                einvoice_irn, tax_amount, net_amount, total_amount
            ),
            customers(*, addresses(*)),
            items:sales_return_items(
                *,
                finished_products(product_name, product_code, hsn_code)
            )
        `)
        .eq('id', id)
        .single();
    if (error) throw new Error(error.message);
    return data;
};

/**
 * Attempt Credit Note generation and update the return record in DB.
 * Returns the CRN result object (or null if not applicable).
 */
const tryGenerateCreditNote = async (returnRecord: any) => {
    const originalInvoice = returnRecord.invoices;
    const customer = returnRecord.customers;
    const items = returnRecord.items || [];

    if (!originalInvoice?.einvoice_irn || !customer?.gst_no) {
        // Not applicable – no IRN on original invoice or B2C customer
        await supabase
            .from('sales_returns')
            .update({ credit_note_status: 'NOT_APPLICABLE' })
            .eq('id', returnRecord.id);
        return null;
    }

    console.log(`[salesReturnController] Generating Credit Note for Return ${returnRecord.return_number}`);
    const crnResult = await EInvoiceService.generateCreditNote(
        returnRecord,
        originalInvoice,
        customer,
        items
    );

    const updateFields: any = {
        credit_note_status: crnResult.status,
        credit_note_irn: crnResult.irn || null,
        credit_note_ack_no: crnResult.ack_no || null,
        credit_note_ack_date: crnResult.ack_date || null,
        credit_note_signed_qr_code: crnResult.signed_qr_code || null,
        credit_note_error: crnResult.error || null,
    };

    await supabase.from('sales_returns').update(updateFields).eq('id', returnRecord.id);
    return crnResult;
};

export const salesReturnController = {
    getAll: async (req: Request, res: Response) => {
        try {
            const { company_id } = req.query;
            const data = await SalesReturnModel.getAll(company_id as string);
            res.json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    create: async (req: Request, res: Response) => {
        try {
            const data = await SalesReturnModel.create(req.body);

            // Auto-trigger Credit Note if original invoice has an e-Invoice IRN
            if (data.id && req.body.invoice_id) {
                const enriched = await getEnrichedReturn(data.id);
                await tryGenerateCreditNote(enriched);
            }

            res.status(201).json({ success: true, data });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    update: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            await SalesReturnModel.update(id, req.body);

            // Re-attempt Credit Note if not already generated
            const enriched = await getEnrichedReturn(id);
            if (enriched.credit_note_status !== 'GENERATED') {
                await tryGenerateCreditNote(enriched);
            }

            res.json({ success: true, message: 'Return record updated successfully' });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    delete: async (req: Request, res: Response) => {
        try {
            const id = req.params.id as string;
            await SalesReturnModel.delete(id);
            res.json({ success: true, message: 'Return record deleted successfully' });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    },

    /**
     * Manually trigger Credit Note (CRN) generation for a return.
     * Used when auto-generation failed or for retry via the UI button.
     */
    generateCreditNote: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const enriched = await getEnrichedReturn(id);

            if (!enriched.invoices?.einvoice_irn) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot generate Credit Note: the linked invoice does not have an e-Invoice IRN.'
                });
            }

            if (!enriched.customers?.gst_no) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot generate Credit Note: customer does not have a GST number (B2C).'
                });
            }

            console.log(`[salesReturnController] Manual Credit Note generation for Return ID: ${id}`);
            const crnResult = await EInvoiceService.generateCreditNote(
                enriched,
                enriched.invoices,
                enriched.customers,
                enriched.items || []
            );

            const updateFields: any = {
                credit_note_status: crnResult.status,
                credit_note_irn: crnResult.irn || null,
                credit_note_ack_no: crnResult.ack_no || null,
                credit_note_ack_date: crnResult.ack_date || null,
                credit_note_signed_qr_code: crnResult.signed_qr_code || null,
                credit_note_error: crnResult.error || null,
            };

            const { data: updated, error: updateErr } = await supabase
                .from('sales_returns')
                .update(updateFields)
                .eq('id', id)
                .select()
                .single();

            if (updateErr) throw new Error(updateErr.message);

            res.json({ success: true, data: updated });
        } catch (error: any) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
};
