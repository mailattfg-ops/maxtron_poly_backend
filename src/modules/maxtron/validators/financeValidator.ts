import { z } from 'zod';

export const collectionSchema = z.object({
    collection_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
    customer_id: z.string().uuid("Invalid customer ID"),
    amount: z.union([z.number(), z.string()]).transform(val => Number(val)).refine(val => val > 0, "Amount must be greater than zero"),
    payment_mode: z.enum(['CASH', 'BANK', 'UPI', 'CHECK'], { 
        message: "Invalid payment mode. Allowed: CASH, BANK, UPI, CHECK" 
    }),
    reference_no: z.string().optional().nullable(),
    remarks: z.string().optional().nullable(),
    company_id: z.string().uuid("Invalid company ID"),
    allocations: z.array(z.object({
        invoice_id: z.string().uuid("Invalid invoice ID"),
        allocated_amount: z.union([z.number(), z.string()]).transform(val => Number(val)).refine(val => val > 0, "Allocated amount must be positive")
    })).optional()
});

export const paymentSchema = z.object({
    payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
    supplier_id: z.string().uuid("Invalid supplier ID"),
    amount: z.union([z.number(), z.string()]).transform(val => Number(val)).refine(val => val > 0, "Amount must be greater than zero"),
    payment_mode: z.enum(['CASH', 'BANK', 'UPI', 'CHECK'], { 
        message: "Invalid payment mode" 
    }),
    reference_no: z.string().optional().nullable(),
    remarks: z.string().optional().nullable(),
    company_id: z.string().uuid("Invalid company ID"),
    allocations: z.array(z.object({
        purchase_entry_id: z.string().uuid("Invalid purchase entry ID"),
        allocated_amount: z.union([z.number(), z.string()]).transform(val => Number(val)).refine(val => val > 0, "Allocated amount must be positive")
    })).optional()
});

export const pettyCashSchema = z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
    paid_to: z.string()
        .min(2, "Recipient name too short")
        .max(50, "Recipient name too long")
        .regex(/^[a-zA-Z0-9\s.\-]+$/, "Recipient name contains invalid characters. Only letters, numbers, spaces, dots, and hyphens are allowed."),
    amount: z.union([z.number(), z.string()]).transform(val => Number(val)).refine(val => val > 0, "Amount must be greater than zero"),
    category: z.string().min(1, "Category is required"),
    remarks: z.string().max(100, "Remarks too long").optional().nullable(),
    company_id: z.string().uuid("Invalid company ID")
});
