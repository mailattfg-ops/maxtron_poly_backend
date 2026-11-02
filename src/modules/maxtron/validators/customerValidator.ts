import { z } from 'zod';

export const customerSchema = z.object({
    customer_name: z.string().min(2, "Customer name is required and should be at least 2 characters"),
    customer_code: z.string().min(2, "Customer code is required"),
    gst_no: z.string().optional().nullable().or(z.literal('')),
    mobile_no: z.string()
        .regex(/^[0-9+\-\s]{7,15}$/, "Mobile number must be between 7 to 15 digits")
        .optional()
        .nullable()
        .or(z.literal('')),
    email_id: z.string()
        .email("Invalid email address format")
        .optional()
        .nullable()
        .or(z.literal('')),
    contact_person: z.string()
        .min(2, "Contact person name should be at least 2 characters")
        .optional()
        .nullable()
        .or(z.literal('')),
    custom_label1: z.string().max(100).optional().nullable().or(z.literal('')),
    custom_value1: z.string().optional().nullable().or(z.literal('')),
    custom_label2: z.string().max(100).optional().nullable().or(z.literal('')),
    custom_value2: z.string().optional().nullable().or(z.literal('')),
    credit_period: z.number().optional().nullable(),
    credit_limit: z.number().optional().nullable(),
    delivery_period: z.string().optional().nullable(),
    delivery_mode: z.string().optional().nullable(),
    opening_balance: z.number().optional().nullable(),
    is_active: z.boolean().optional(),
    company_id: z.string().uuid("Invalid company ID").optional().nullable(),
    addresses: z.array(z.any()).optional()
});
