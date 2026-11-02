import { supabase } from '../../../config/supabase';
import { lineGstRates, missingForPortal } from './eInvoiceService';

export interface EwbResponse {
  ewb_no?: string;
  ewb_date?: string;
  ewb_valid_till?: string;
  ewb_status: 'GENERATED' | 'FAILED';
  ewb_error?: string;
}

export function parseGspDateTime(str: string): string | null {
  if (!str) return null;
  const parts = str.trim().split(/\s+/);
  const datePart = parts[0];
  const timePart = parts[1];
  const ampm = parts[2];

  if (!datePart) return null;
  const dateParts = datePart.split('/');
  if (dateParts.length !== 3) return str;

  const day = dateParts[0];
  const month = dateParts[1];
  const year = dateParts[2];

  let hourStr = '00';
  let minuteStr = '00';
  let secondStr = '00';

  if (timePart) {
    const timeParts = timePart.split(':');
    let hour = parseInt(timeParts[0]) || 0;
    const minute = parseInt(timeParts[1]) || 0;
    const second = parseInt(timeParts[2]) || 0;

    if (ampm) {
      if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12;
      if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
    }

    hourStr = String(hour).padStart(2, '0');
    minuteStr = String(minute).padStart(2, '0');
    secondStr = String(second).padStart(2, '0');
  }

  return `${year}-${month}-${day}T${hourStr}:${minuteStr}:${secondStr}`;
}

export function getStateName(stateCode: string): string {
  switch (stateCode) {
    case "32": return "KERALA";
    case "27": return "MAHARASHTRA";
    case "29": return "KARNATAKA";
    case "33": return "TAMIL NADU";
    case "36": return "TELANGANA";
    case "37": return "ANDHRA PRADESH";
    case "09": return "UTTAR PRADESH";
    case "24": return "GUJARAT";
    default: return "KERALA";
  }
}

export class EwbService {
  private static getCredentials() {
    return {
      username: process.env.EWB_PROD_USERNAME || process.env.MI_GSP_PROD_USERNAME || process.env.MI_GSP_USERNAME || '',
      password: process.env.EWB_PROD_PASSWORD || process.env.MI_GSP_PROD_PASSWORD || process.env.MI_GSP_PASSWORD || '',
      gstin: process.env.EWB_PROD_GSTIN || process.env.MI_GSP_PROD_GSTIN || process.env.MI_GSP_GSTIN || '',
      baseUrl: process.env.EWB_PROD_BASE_URL || process.env.MI_GSP_PROD_BASE_URL || 'https://prod-api.mastersindia.co/api/v1',
      environment: 'production'
    };
  }

  public static isMockMode(): boolean {
    if (process.env.ENABLE_LIVE_EWB !== 'true') {
      return true;
    }
    const creds = this.getCredentials();
    return !creds.username || !creds.password || !creds.gstin;
  }

  /**
   * Main method to generate E-Way Bill via Masters India GSP.
   */
  public static async generateEwb(
    invoice: any,
    customer: any,
    items: any[]
  ): Promise<EwbResponse> {
    try {
      // 1. Validation: an e-Way Bill is sent with what is on record or not at all
      const vehicleNo = (invoice.vehicle_no || '').trim();
      const missing = missingForPortal(customer, items);
      if (!vehicleNo && !invoice.transporter_id) missing.push('vehicle number (or transporter ID)');
      if (missing.length > 0) {
        return {
          ewb_status: 'FAILED',
          ewb_error: `E-Way Bill not sent. Missing on record: ${missing.join(', ')}. Add it and generate again.`,
        };
      }

      // Check if it's Mock Mode
      if (this.isMockMode()) {
        const creds = this.getCredentials();
        console.log(`[EwbService] Running in Mock Mode (${creds.environment}) for Invoice ${invoice.invoice_number || invoice.order_number}`);
        return this.simulateMockEwb(invoice);
      }

      const creds = this.getCredentials();
      
      // Step A: Authenticate with Masters India GSP to get JWT token
      console.log(`[EwbService] Authenticating with Masters India Token API (${creds.environment}): ${creds.baseUrl}/token-auth/`);
      const authRes = await fetch(`${creds.baseUrl}/token-auth/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: creds.username,
          password: creds.password,
        }),
      });

      if (!authRes.ok) {
        const errText = await authRes.text();
        throw new Error(`Masters India authentication failed: ${errText}`);
      }

      const authData = await authRes.json();
      const token = authData.token;

      if (!token) {
        throw new Error(`Invalid response from Masters India GSP: missing auth token.`);
      }

      // Step B: Build standard e-Way Bill request schema
      const docNo = String(invoice.invoice_number || invoice.order_number || 'INV-0001').substring(0, 16);
      const docDate = invoice.invoice_date || invoice.order_date || new Date().toISOString();
      const totalAmount = Number(invoice.total_amount || invoice.total_value || 0);
      const taxAmount = invoice.tax_amount ? Number(invoice.tax_amount) : 0;

      // Dynamic states, pincodes, and tax rates
      const sellerGstin = creds.gstin;
      const sellerStateCode = sellerGstin ? sellerGstin.substring(0, 2) : "32";
      const sellerStateName = getStateName(sellerStateCode);
      const sellerPincode = sellerStateCode === "32" ? 678001 : 400001;
      const sellerPlace = sellerStateCode === "32" ? "Palakkad" : "Mumbai";
      const sellerLegalName = invoice.companies?.company_name === 'KEIL' ? "KEIL Industries Ltd." : "MAXTRON ASSOCIATES";

      const buyerGstin = customer.gst_no || "URP";
      const buyerStateCode = buyerGstin !== "URP" ? buyerGstin.substring(0, 2) : sellerStateCode;
      const buyerStateName = getStateName(buyerStateCode);
      const buyerPincode = parseInt(String(customer.addresses[0].zip_code).replace(/[^0-9]/g, ''));
      const buyerPlace = customer.addresses[0].city;

      const isIgst = buyerStateCode !== sellerStateCode;
      const gstRates = lineGstRates(invoice, items);

      const ewbPayload = {
        userGstin: creds.gstin,
        supply_type: "outward",
        sub_supply_type: "Supply",
        sub_supply_description: "",
        document_type: "Tax Invoice",
        document_number: docNo,
        document_date: new Date(docDate).toLocaleDateString('en-GB'), // "DD/MM/YYYY" format
        gstin_of_consignor: creds.gstin,
        legal_name_of_consignor: sellerLegalName,
        address1_of_consignor: "13-95, 13-96, PIRIVUSALA", // as printed on the invoice
        address2_of_consignor: "CHANDRANAGAR",
        place_of_consignor: sellerPlace,
        pincode_of_consignor: sellerPincode,
        state_of_consignor: sellerStateName,
        actual_from_state_name: sellerStateName,
        gstin_of_consignee: buyerGstin,
        legal_name_of_consignee: customer.customer_name,
        address1_of_consignee: customer.addresses[0].street,
        address2_of_consignee: "",
        place_of_consignee: buyerPlace,
        pincode_of_consignee: buyerPincode,
        state_of_supply: buyerStateName,
        actual_to_state_name: buyerStateName,
        transaction_type: 1, // Regular
        other_value: 0,
        total_invoice_value: totalAmount + taxAmount,
        taxable_amount: totalAmount,
        cgst_amount: isIgst ? 0 : taxAmount / 2,
        sgst_amount: isIgst ? 0 : taxAmount / 2,
        igst_amount: isIgst ? taxAmount : 0,
        cess_amount: 0,
        cess_nonadvol_value: 0,
        transporter_id: invoice.transporter_id || "",
        transporter_name: invoice.transporter_name || "",
        transporter_document_number: invoice.trans_doc_no || "",
        transporter_document_date: invoice.trans_doc_date ? new Date(invoice.trans_doc_date).toLocaleDateString('en-GB') : "",
        transportation_mode: "Road", // "Road", "Rail", "Air", "Ship"
        transportation_distance: invoice.trans_distance ? Number(invoice.trans_distance) : 0, // 0 for auto-calculation
        vehicle_number: vehicleNo?.replace(/[^a-zA-Z0-9]/g, '')?.toUpperCase() || "",
        vehicle_type: invoice.vehicle_type === 'ODC' ? "ODC" : "Regular",
        generate_status: 1,
        data_source: "erp",
        user_ref: "",
        location_code: "",
        eway_bill_status: "Active",
        auto_print: "N",
        email: "",
        delete_record: "N",
        itemList: items.map((item: any, idx: number) => ({
          product_name: item.finished_products.product_name,
          product_description: item.finished_products.product_name,
          hsn_code: item.finished_products.hsn_code,
          quantity: Number(item.quantity),
          unit_of_product: "KGS",
          cgst_rate: isIgst ? 0 : gstRates[idx] / 2,
          sgst_rate: isIgst ? 0 : gstRates[idx] / 2,
          igst_rate: isIgst ? gstRates[idx] : 0,
          cess_rate: 0,
          cessNonAdvol: 0,
          taxable_amount: Number(item.amount)
        }))
      };

      console.log(`[EwbService] Hitting Masters India E-Way Bill API: ${creds.baseUrl}/ewayBillsGenerate/`);
      const apiRes = await fetch(`${creds.baseUrl}/ewayBillsGenerate/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `JWT ${token}`,
        },
        body: JSON.stringify(ewbPayload)
      });

      if (!apiRes.ok) {
        const errText = await apiRes.text();
        throw new Error(`Masters India E-Way Bill API failed with status ${apiRes.status}: ${errText}`);
      }

      const responseData = await apiRes.json();
      const result = responseData.results;

      if (result.status === 'Success' && result.message && result.message.ewayBillNo) {
        return {
          ewb_no: result.message.ewayBillNo?.toString(),
          ewb_date: parseGspDateTime(result.message.ewayBillDate) || result.message.ewayBillDate,
          ewb_valid_till: parseGspDateTime(result.message.validUpto) || result.message.validUpto,
          ewb_status: 'GENERATED',
        };
      } else {
        const errorDetail = result.errorMessage || result.message || 'Unknown GSP error occurred';
        const errStr = typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail);

        console.error('\n❌ [EwbService] E-Way Bill Generation Failed from Masters India:', errStr);
        return {
          ewb_status: 'FAILED',
          ewb_error: errStr,
        };
      }
    } catch (error: any) {
      console.error('[EwbService] Error in E-Way Bill generation:', error);
      return {
        ewb_status: 'FAILED',
        ewb_error: `Connection error: ${error.message}`,
      };
    }
  }

  private static simulateMockEwb(invoice: any): EwbResponse {
    const random10Digits = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const ewbNo = `12${random10Digits}`;

    const now = new Date();
    const validityDays = Math.max(1, Math.ceil(Number(invoice.trans_distance || 100) / 100));
    const validTill = new Date();
    validTill.setDate(now.getDate() + validityDays);

    return {
      ewb_no: ewbNo,
      ewb_date: now.toISOString(),
      ewb_valid_till: validTill.toISOString(),
      ewb_status: 'GENERATED',
    };
  }

  /**
   * Cancel E-Way Bill via Masters India
   */
  public static async cancelEwb(
    invoice: any,
    reasonCode: string,
    remarks: string
  ): Promise<{ ewb_status: 'CANCELLED' | 'FAILED'; ewb_error?: string }> {
    try {
      if (this.isMockMode()) {
        console.log(`[EwbService] Simulating E-Way Bill cancellation (Mock Mode) for Invoice ${invoice.invoice_number}`);
        return { ewb_status: 'CANCELLED' };
      }

      const creds = this.getCredentials();

      const authRes = await fetch(`${creds.baseUrl}/token-auth/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: creds.username,
          password: creds.password,
        }),
      });

      if (!authRes.ok) {
        const errText = await authRes.text();
        throw new Error(`Masters India authentication failed: ${errText}`);
      }

      const authData = await authRes.json();
      const token = authData.token;

      if (!token) {
        throw new Error(`Invalid response from Masters India GSP: missing auth token.`);
      }

      const cancelPayload = {
        userGstin: creds.gstin,
        eway_bill_number: Number(invoice.ewb_no),
        reason_of_cancel: String(reasonCode),
        cancel_remark: remarks,
      };

      console.log(`[EwbService] Hitting Masters India Cancel E-Way Bill API: ${creds.baseUrl}/ewayBillCancel/`);
      const apiRes = await fetch(`${creds.baseUrl}/ewayBillCancel/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `JWT ${token}`,
        },
        body: JSON.stringify(cancelPayload),
      });

      if (!apiRes.ok) {
        const errText = await apiRes.text();
        throw new Error(`Masters India E-Way Bill Cancel API failed with status ${apiRes.status}: ${errText}`);
      }

      const responseData = await apiRes.json();
      const result = responseData.results;

      if (result.status === 'Success') {
        return {
          ewb_status: 'CANCELLED',
        };
      } else {
        const errorDetail = result.errorMessage || result.message || 'Unknown GSP error occurred during EWB cancellation';
        return {
          ewb_status: 'FAILED',
          ewb_error: typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail),
        };
      }
    } catch (error: any) {
      console.error('[EwbService] Error in E-Way Bill cancellation:', error);
      return {
        ewb_status: 'FAILED',
        ewb_error: `Connection error: ${error.message}`,
      };
    }
  }
}
