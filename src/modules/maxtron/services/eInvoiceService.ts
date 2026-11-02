import { supabase } from '../../../config/supabase';

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

/**
 * GST rate reported for each line: the rate typed for it. 0% is a real rate.
 *
 * Lines saved before the rate was stored per line have none, and an invoice
 * whose typed tax total disagrees with its line rates cannot be reported both
 * ways. Both take the rate the invoice was actually charged at (its saved tax
 * over its taxable value), so what goes to the portal always matches the saved
 * totals. Nothing is assumed to be 18%.
 */
export function lineGstRates(invoice: any, items: any[]): number[] {
  const taxable = Number(invoice.total_amount || invoice.total_value || 0);
  const savedTax = Number(invoice.tax_amount || 0);
  const invoiceRate = taxable > 0 ? Math.round((savedTax / taxable) * 100) : 0;
  const typed = items.map((i: any) =>
    i.gst_percent === undefined || i.gst_percent === null || i.gst_percent === '' ? null : Number(i.gst_percent));
  const taxFromRates = items.reduce((sum: number, i: any, idx: number) =>
    sum + (Number(i.quantity) || 0) * (Number(i.rate) || 0) * (typed[idx] ?? invoiceRate) / 100, 0);
  const contradicts = Math.abs(taxFromRates - savedTax) > 1;
  return typed.map(t => (t === null || contradicts ? invoiceRate : t));
}

/**
 * What the portal needs but the records do not hold. A registered e-Invoice or
 * e-Way Bill cannot be edited afterwards, so nothing is filled in on the
 * customer's behalf — these used to go out with a default HSN code, PIN code,
 * address, city and vehicle number.
 */
export function missingForPortal(customer: any, items: any[]): string[] {
  const missing: string[] = [];
  const addr = customer?.addresses?.[0] || {};
  if (!addr.street) missing.push('customer address');
  if (!addr.city) missing.push('customer city');
  if (!/^\d{6}$/.test(String(addr.zip_code || '').replace(/\D/g, ''))) missing.push('customer PIN code');
  items.forEach((item: any, idx: number) => {
    const name = item.finished_products?.product_name;
    if (!name) missing.push(`product on line ${idx + 1}`);
    else if (!item.finished_products?.hsn_code) missing.push(`HSN code of ${name}`);
  });
  return missing;
}


export interface EInvoiceResponse {
  irn?: string;
  ack_no?: string;
  ack_date?: string;
  signed_invoice?: string;
  signed_qr_code?: string;
  status: 'GENERATED' | 'FAILED';
  error?: string;
  raw_response?: any;
}

export interface CreditNoteResponse {
  irn?: string;
  ack_no?: string;
  ack_date?: string;
  signed_qr_code?: string;
  status: 'GENERATED' | 'FAILED' | 'NOT_APPLICABLE';
  error?: string;
  raw_response?: any;
}

export class EInvoiceService {
  private static getCredentials() {
    return {
      username: process.env.EINVOICE_PROD_USERNAME || process.env.MI_GSP_PROD_USERNAME || process.env.MI_GSP_USERNAME || '',
      password: process.env.EINVOICE_PROD_PASSWORD || process.env.MI_GSP_PROD_PASSWORD || process.env.MI_GSP_PASSWORD || '',
      gstin: process.env.EINVOICE_PROD_GSTIN || process.env.MI_GSP_PROD_GSTIN || process.env.MI_GSP_GSTIN || '',
      baseUrl: process.env.EINVOICE_PROD_BASE_URL || process.env.MI_GSP_PROD_BASE_URL || 'https://prod-api.mastersindia.co/api/v1',
      environment: 'production'
    };
  }

  public static isMockMode(): boolean {
    if (process.env.ENABLE_LIVE_EINVOICE !== 'true') {
      return true;
    }
    const creds = this.getCredentials();
    return !creds.username || !creds.password || !creds.gstin;
  }

  /**
   * Main method to generate E-Invoice (IRN) via Masters India GSP
   */
  public static async generateEInvoice(
    invoice: any,
    customer: any,
    items: any[]
  ): Promise<EInvoiceResponse> {
    try {
      // 1. Validation
      if (!customer.gst_no) {
        return {
          status: 'FAILED',
          error: 'E-Invoice can only be generated for B2B transactions. Customer GST No is missing.',
        };
      }

      const missing = missingForPortal(customer, items);
      if (missing.length > 0) {
        return {
          status: 'FAILED',
          error: `E-Invoice not sent. Missing on record: ${missing.join(', ')}. Add it and generate again.`,
        };
      }

      // Check if Mock Mode
      if (this.isMockMode()) {
        const creds = this.getCredentials();
        console.log(`[EInvoiceService] Running in Mock Mode (${creds.environment}) for Invoice ${invoice.invoice_number}`);
        return this.simulateMockEInvoice(invoice);
      }

      const creds = this.getCredentials();

      // Step A: Authenticate with Masters India GSP to get JWT token
      console.log(`[EInvoiceService] Authenticating with Masters India Token API (${creds.environment}): ${creds.baseUrl}/token-auth/`);
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

      // Step B: Build standard e-Invoice schema payload (Version 1.1)
      const docNo = String(invoice.invoice_number || invoice.order_number || 'INV-0001').substring(0, 16);
      const docDate = invoice.invoice_date || invoice.order_date || new Date().toISOString();
      const totalAmount = Number(invoice.total_amount || invoice.total_value || 0);
      const taxAmount = invoice.tax_amount ? Number(invoice.tax_amount) : 0;
      const sellerGstin = creds.gstin || '32AUYPV8850B1Z2';
      const sellerStateCode = sellerGstin ? sellerGstin.substring(0, 2) : "32";
      const sellerLegalName = invoice.companies?.company_name === 'KEIL' ? "KEIL Industries Ltd." : "MAXTRON ASSOCIATES";
      const sellerPincode = sellerStateCode === "32" ? 678001 : 201301;
      const sellerLocation = sellerStateCode === "32" ? "Palakkad" : "Noida";

      const buyerStateCode = customer.gst_no ? customer.gst_no.substring(0, 2) : sellerStateCode;
      const isIgst = buyerStateCode !== sellerStateCode;

      // Buyer PIN code as recorded (checked present above), digits only
      const buyerPincode = parseInt(String(customer.addresses[0].zip_code).replace(/[^0-9]/g, ''));

      // GST per line at the rate typed for it. The invoice's saved tax is the
      // total, so the last line takes whatever paise rounding leaves over.
      const gstRates = lineGstRates(invoice, items);

      let calculatedGstSum = 0;
      const formattedItems = items.map((item: any, idx: number) => {
        const itemVal = Number(item.amount);
        let itemGst = 0;

        if (idx === items.length - 1) {
          itemGst = Number((taxAmount - calculatedGstSum).toFixed(2));
        } else {
          itemGst = Number(((itemVal * gstRates[idx]) / 100).toFixed(2));
          calculatedGstSum += itemGst;
        }

        const cgstAmount = isIgst ? 0 : Number((itemGst / 2).toFixed(2));
        const sgstAmount = isIgst ? 0 : Number((itemGst / 2).toFixed(2));
        const igstAmount = isIgst ? itemGst : 0;

        return {
          item_serial_number: (idx + 1).toString(),
          product_description: item.finished_products.product_name,
          is_service: "N",
          hsn_code: item.finished_products.hsn_code,
          bar_code: "",
          quantity: Number(item.quantity),
          free_quantity: 0,
          unit: "KGS",
          unit_price: Number(item.rate),
          total_amount: itemVal,
          pre_tax_value: 0,
          discount: 0,
          other_charge: 0,
          assessable_value: itemVal,
          gst_rate: gstRates[idx],
          igst_amount: igstAmount,
          cgst_amount: cgstAmount,
          sgst_amount: sgstAmount,
          cess_rate: 0,
          cess_amount: 0,
          cess_nonadvol_amount: 0,
          state_cess_rate: 0,
          state_cess_amount: 0,
          state_cess_nonadvol_amount: 0,
          total_item_value: Number((itemVal + itemGst).toFixed(2))
        };
      });

      const einvoicePayload = {
        user_gstin: sellerGstin,
        data_source: "erp",
        transaction_details: {
          supply_type: "B2B",
          charge_type: "N",
          igst_on_intra: "N",
          ecommerce_gstin: ""
        },
        document_details: {
          document_type: "INV",
          document_number: docNo, // Max 16 characters
          document_date: new Date(docDate).toLocaleDateString('en-GB') // "DD/MM/YYYY"
        },
        seller_details: {
          gstin: sellerGstin,
          legal_name: sellerLegalName,
          trade_name: sellerLegalName,
          address1: "13-95, 13-96, PIRIVUSALA", // as printed on the invoice
          address2: "CHANDRANAGAR",
          location: sellerLocation,
          pincode: sellerPincode,
          state_code: sellerStateCode,
        },
        buyer_details: {
          gstin: customer.gst_no,
          legal_name: customer.customer_name,
          trade_name: customer.customer_name,
          address1: customer.addresses[0].street,
          address2: "",
          location: customer.addresses[0].city,
          pincode: buyerPincode,
          place_of_supply: buyerStateCode,
          state_code: buyerStateCode,
        },
        value_details: {
          total_assessable_value: totalAmount,
          total_cgst_value: isIgst ? 0 : taxAmount / 2,
          total_sgst_value: isIgst ? 0 : taxAmount / 2,
          total_igst_value: isIgst ? taxAmount : 0,
          total_cess_value: 0,
          total_cess_value_of_state: 0,
          total_discount: 0,
          total_other_charge: 0,
          total_invoice_value: totalAmount + taxAmount,
          round_off_amount: 0,
          total_invoice_value_additional_currency: 0
        },
        item_list: formattedItems
      };

      console.log(`[EInvoiceService] Hitting Masters India E-Invoice API: ${creds.baseUrl}/einvoice/`);
      const apiRes = await fetch(`${creds.baseUrl}/einvoice/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `JWT ${token}`,
        },
        body: JSON.stringify(einvoicePayload),
      });

      if (!apiRes.ok) {
        const errText = await apiRes.text();
        throw new Error(`Masters India E-Invoice API failed with status ${apiRes.status}: ${errText}`);
      }

      const responseData = await apiRes.json();
      const result = responseData.results || responseData.data || responseData;
      const msg = result.message || result.data || result;

      const irn = msg.Irn || msg.irn || result.Irn || result.irn;
      const ackNo = (msg.AckNo || msg.ack_no || result.AckNo || result.ack_no)?.toString();
      const ackDt = msg.AckDt || msg.ack_date || msg.ack_dt || result.AckDt || result.ack_date;
      const signedInvoice = msg.SignedInvoice || msg.signed_invoice || result.SignedInvoice || result.signed_invoice;
      const signedQrCode = msg.SignedQRCode || msg.signed_qr_code || msg.SignedQrCode || result.SignedQRCode || result.signed_qr_code;

      const isSuccess = (result.status === 'Success' || responseData.success === true || responseData.status_cd === '1' || Boolean(irn));

      if (isSuccess && irn) {
        const successRes: EInvoiceResponse = {
          irn,
          ack_no: ackNo,
          ack_date: parseGspDateTime(ackDt) || ackDt,
          signed_invoice: signedInvoice,
          signed_qr_code: signedQrCode,
          status: 'GENERATED',
          raw_response: responseData
        };

        console.log('\n================================================================================');
        console.log('⚡ [EInvoiceService] E-INVOICE GENERATED SUCCESSFULLY');
        console.log('--------------------------------------------------------------------------------');
        console.log(`Invoice Number   : ${invoice.invoice_number}`);
        console.log(`IRN              : ${irn}`);
        console.log(`Ack Number       : ${ackNo}`);
        console.log(`Ack Date         : ${ackDt}`);
        console.log(`Signed Invoice   : ${signedInvoice ? (signedInvoice.substring(0, 60) + '... (' + signedInvoice.length + ' chars)') : 'N/A'}`);
        console.log(`Signed QR Code   : ${signedQrCode ? (signedQrCode.substring(0, 60) + '... (' + signedQrCode.length + ' chars)') : 'N/A'}`);
        console.log('--------------------------------------------------------------------------------');
        console.log('Response Payload:');
        console.log(JSON.stringify({
          success: true,
          data: {
            Irn: irn,
            AckNo: ackNo,
            AckDt: ackDt,
            SignedInvoice: signedInvoice,
            SignedQRCode: signedQrCode
          }
        }, null, 2));
        console.log('================================================================================\n');

        return successRes;
      } else {
        const errorMsg = result.errorMessage || result.message || 'Unknown GSP error occurred';
        const errStr = typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg);

        console.error('\n❌ [EInvoiceService] E-Invoice Generation Failed from Masters India:', errStr);
        return {
          status: 'FAILED',
          error: errStr,
          raw_response: responseData
        };
      }
    } catch (error: any) {
      console.error('[EInvoiceService] Error in E-Invoice generation:', error);
      return {
        status: 'FAILED',
        error: `Connection error: ${error.message}`,
      };
    }
  }

  private static simulateMockEInvoice(invoice: any): EInvoiceResponse {
    // Generate a 64-character hex IRN string
    const irn = require('crypto').randomBytes(32).toString('hex');
    const ack_no = Math.floor(100000000000000 + Math.random() * 900000000000000).toString();
    const ack_date = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Generate realistic simulated SignedInvoice and SignedQRCode JWT tokens
    const mockHeader = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64');
    const mockPayload = Buffer.from(JSON.stringify({
      Irn: irn,
      AckNo: Number(ack_no),
      AckDt: ack_date,
      DocNo: invoice.invoice_number || 'INV-MOCK',
      TotInvVal: invoice.net_amount || invoice.total_amount || 0
    })).toString('base64');
    const mockSig = require('crypto').randomBytes(64).toString('base64url');

    const signed_invoice = `${mockHeader}.${mockPayload}.${mockSig}`;
    const signed_qr_code = `${mockHeader}.${mockPayload}.${mockSig}`;

    const res: EInvoiceResponse = {
      irn,
      ack_no,
      ack_date,
      signed_invoice,
      signed_qr_code,
      status: 'GENERATED',
      raw_response: {
        success: true,
        data: {
          Irn: irn,
          AckNo: ack_no,
          AckDt: ack_date,
          SignedInvoice: signed_invoice,
          SignedQRCode: signed_qr_code
        }
      }
    };

    console.log('\n================================================================================');
    console.log('⚡ [EInvoiceService] E-INVOICE GENERATION (SIMULATED MOCK MODE)');
    console.log('--------------------------------------------------------------------------------');
    console.log(`Invoice Number   : ${invoice.invoice_number}`);
    console.log(`IRN              : ${irn}`);
    console.log(`Ack Number       : ${ack_no}`);
    console.log(`Ack Date         : ${ack_date}`);
    console.log(`Signed Invoice   : ${signed_invoice.substring(0, 60)}... (${signed_invoice.length} chars)`);
    console.log(`Signed QR Code   : ${signed_qr_code.substring(0, 60)}... (${signed_qr_code.length} chars)`);
    console.log('--------------------------------------------------------------------------------');
    console.log('Response Payload:');
    console.log(JSON.stringify({
      success: true,
      data: {
        Irn: irn,
        AckNo: ack_no,
        AckDt: ack_date,
        SignedInvoice: signed_invoice,
        SignedQRCode: signed_qr_code
      }
    }, null, 2));
    console.log('================================================================================\n');

    return res;
  }

  /**
   * Generate Credit Note (CRN) IRN for a Sales Return linked to a B2B e-Invoice
   * Per GSTN rules, document_type = "CRN" with preceding_document_details referencing original IRN
   */
  public static async generateCreditNote(
    returnRecord: any,
    originalInvoice: any,
    customer: any,
    items: any[]
  ): Promise<CreditNoteResponse> {
    try {
      // Only applicable for B2B returns against e-invoiced documents
      if (!customer?.gst_no) {
        return {
          status: 'NOT_APPLICABLE',
          error: 'Credit Note only applicable for B2B customers with GST number.',
        };
      }

      if (!originalInvoice?.einvoice_irn) {
        return {
          status: 'NOT_APPLICABLE',
          error: 'Original invoice does not have an e-Invoice IRN. Credit Note cannot be generated.',
        };
      }

      const missing = missingForPortal(customer, items);
      if (missing.length > 0) {
        return {
          status: 'FAILED',
          error: `Credit Note not sent. Missing on record: ${missing.join(', ')}. Add it and generate again.`,
        };
      }

      if (this.isMockMode()) {
        console.log(`[EInvoiceService] Simulating Credit Note generation (Mock Mode) for Return ${returnRecord.return_number}`);
        return this.simulateMockCreditNote(returnRecord);
      }

      const creds = this.getCredentials();

      // Authenticate with Masters India GSP
      const authRes = await fetch(`${creds.baseUrl}/token-auth/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: creds.username, password: creds.password }),
      });

      if (!authRes.ok) {
        const errText = await authRes.text();
        throw new Error(`Masters India authentication failed: ${errText}`);
      }

      const authData = await authRes.json();
      const token = authData.token;
      if (!token) throw new Error('Invalid response from Masters India GSP: missing auth token.');

      const sellerGstin = creds.gstin || '32AUYPV8850B1Z2';
      const sellerStateCode = sellerGstin.substring(0, 2);
      const sellerLegalName = returnRecord.companies?.company_name === 'KEIL' ? 'KEIL Industries Ltd.' : 'MAXTRON ASSOCIATES';
      const sellerPincode = sellerStateCode === '32' ? 678001 : 201301;
      const sellerLocation = sellerStateCode === '32' ? 'Palakkad' : 'Noida';

      const buyerStateCode = customer.gst_no.substring(0, 2);
      const isIgst = buyerStateCode !== sellerStateCode;

      const buyerPincode = parseInt(String(customer.addresses[0].zip_code).replace(/[^0-9]/g, ''));

      const origInvoiceTax = Number(originalInvoice.tax_amount || 0);
      const origInvoiceTaxable = Number(
        originalInvoice.total_amount ||
        (Number(originalInvoice.net_amount || 0) - origInvoiceTax) ||
        0
      );
      // The return is credited at the rate the original invoice was charged at —
      // an invoice billed at 0% is credited at 0%, not 18%.
      const effectiveGstRate = origInvoiceTaxable > 0
        ? Math.round((origInvoiceTax / origInvoiceTaxable) * 100)
        : 0;

      let totalReturnAssessableValue = 0;
      let totalReturnCgst = 0;
      let totalReturnSgst = 0;
      let totalReturnIgst = 0;

      const formattedItems = items.map((item: any, idx: number) => {
        const itemVal = Number(item.value || (Number(item.quantity) * Number(item.rate)));
        totalReturnAssessableValue += itemVal;

        const itemGst = Number(((itemVal * effectiveGstRate) / 100).toFixed(2));
        const cgstAmount = isIgst ? 0 : Number((itemGst / 2).toFixed(2));
        const sgstAmount = isIgst ? 0 : Number((itemGst / 2).toFixed(2));
        const igstAmount = isIgst ? itemGst : 0;

        totalReturnCgst += cgstAmount;
        totalReturnSgst += sgstAmount;
        totalReturnIgst += igstAmount;

        return {
          item_serial_number: (idx + 1).toString(),
          product_description: item.finished_products.product_name,
          is_service: 'N',
          hsn_code: item.finished_products.hsn_code,
          bar_code: '',
          quantity: Number(item.quantity),
          free_quantity: 0,
          unit: 'KGS',
          unit_price: Number(item.rate),
          total_amount: itemVal,
          pre_tax_value: 0,
          discount: 0,
          other_charge: 0,
          assessable_value: itemVal,
          gst_rate: effectiveGstRate,
          igst_amount: igstAmount,
          cgst_amount: cgstAmount,
          sgst_amount: sgstAmount,
          cess_rate: 0,
          cess_amount: 0,
          cess_nonadvol_amount: 0,
          state_cess_rate: 0,
          state_cess_amount: 0,
          state_cess_nonadvol_amount: 0,
          total_item_value: Number((itemVal + itemGst).toFixed(2))
        };
      });

      if (items.length === 0) {
        totalReturnAssessableValue = Number(returnRecord.total_return_value || 0);
        const totalGst = Number(((totalReturnAssessableValue * effectiveGstRate) / 100).toFixed(2));
        if (isIgst) {
          totalReturnIgst = totalGst;
        } else {
          totalReturnCgst = Number((totalGst / 2).toFixed(2));
          totalReturnSgst = Number((totalGst / 2).toFixed(2));
        }
      }

      const totalReturnTax = totalReturnCgst + totalReturnSgst + totalReturnIgst;
      const totalReturnInvoiceValue = Number((totalReturnAssessableValue + totalReturnTax).toFixed(2));

      const returnDate = returnRecord.return_date
        ? new Date(returnRecord.return_date).toLocaleDateString('en-GB')
        : new Date().toLocaleDateString('en-GB');

      const origInvoiceDate = originalInvoice.invoice_date
        ? new Date(originalInvoice.invoice_date).toLocaleDateString('en-GB')
        : returnDate;

      const creditNotePayload = {
        user_gstin: sellerGstin,
        data_source: 'erp',
        transaction_details: {
          supply_type: 'B2B',
          charge_type: 'N',
          igst_on_intra: 'N',
          ecommerce_gstin: ''
        },
        document_details: {
          document_type: 'CRN',  // Credit Note
          document_number: String(returnRecord.return_number || 'CRN-0001').substring(0, 16),
          document_date: returnDate
        },
        preceding_document_details: [{
          reference_of_original_invoice: String(originalInvoice.invoice_number).substring(0, 16),
          preceding_invoice_date: origInvoiceDate,
          other_reference: originalInvoice.einvoice_irn || ''
        }],
        seller_details: {
          gstin: sellerGstin,
          legal_name: sellerLegalName,
          trade_name: sellerLegalName,
          address1: '13-95, 13-96, PIRIVUSALA', // as printed on the invoice
          address2: 'CHANDRANAGAR',
          location: sellerLocation,
          pincode: sellerPincode,
          state_code: sellerStateCode,
        },
        buyer_details: {
          gstin: customer.gst_no,
          legal_name: customer.customer_name,
          trade_name: customer.customer_name,
          address1: customer.addresses[0].street,
          address2: '',
          location: customer.addresses[0].city,
          pincode: buyerPincode,
          place_of_supply: buyerStateCode,
          state_code: buyerStateCode,
        },
        value_details: {
          total_assessable_value: Number(totalReturnAssessableValue.toFixed(2)),
          total_cgst_value: Number(totalReturnCgst.toFixed(2)),
          total_sgst_value: Number(totalReturnSgst.toFixed(2)),
          total_igst_value: Number(totalReturnIgst.toFixed(2)),
          total_cess_value: 0,
          total_cess_value_of_state: 0,
          total_discount: 0,
          total_other_charge: 0,
          total_invoice_value: totalReturnInvoiceValue,
          round_off_amount: 0,
          total_invoice_value_additional_currency: 0
        },
        item_list: formattedItems
      };

      console.log(`[EInvoiceService] Generating Credit Note (CRN) via Masters India for Return ${returnRecord.return_number}`);
      const apiRes = await fetch(`${creds.baseUrl}/einvoice/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `JWT ${token}`,
        },
        body: JSON.stringify(creditNotePayload),
      });

      if (!apiRes.ok) {
        const errText = await apiRes.text();
        throw new Error(`Masters India Credit Note API failed with status ${apiRes.status}: ${errText}`);
      }

      const responseData = await apiRes.json();
      const result = responseData.results || responseData.data || responseData;
      const msg = result.message || result.data || result;

      const irn = msg.Irn || msg.irn || result.Irn || result.irn;
      const ackNo = (msg.AckNo || msg.ack_no || result.AckNo || result.ack_no)?.toString();
      const ackDt = msg.AckDt || msg.ack_date || result.AckDt || result.ack_date;
      const signedQrCode = msg.SignedQRCode || msg.signed_qr_code || result.SignedQRCode || result.signed_qr_code;

      const isSuccess = (result.status === 'Success' || responseData.success === true || Boolean(irn));

      if (isSuccess && irn) {
        console.log(`\n[EInvoiceService] CREDIT NOTE (CRN) GENERATED: ${irn} for Return ${returnRecord.return_number}`);
        return {
          irn,
          ack_no: ackNo,
          ack_date: parseGspDateTime(ackDt) || ackDt,
          signed_qr_code: signedQrCode,
          status: 'GENERATED',
          raw_response: responseData
        };
      } else {
        const errorMsg = result.errorMessage || result.message || 'Unknown GSP error during CRN generation';
        const errStr = typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg);
        console.error(`[EInvoiceService] Credit Note generation failed: ${errStr}`);
        return { status: 'FAILED', error: errStr, raw_response: responseData };
      }
    } catch (error: any) {
      console.error('[EInvoiceService] Error in Credit Note generation:', error);
      return { status: 'FAILED', error: `Connection error: ${error.message}` };
    }
  }

  private static simulateMockCreditNote(returnRecord: any): CreditNoteResponse {
    const irn = require('crypto').randomBytes(32).toString('hex');
    const ack_no = Math.floor(100000000000000 + Math.random() * 900000000000000).toString();
    const ack_date = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const mockHeader = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64');
    const mockPayload = Buffer.from(JSON.stringify({
      Irn: irn,
      AckNo: Number(ack_no),
      AckDt: ack_date,
      DocNo: returnRecord.return_number || 'CRN-MOCK',
      DocType: 'CRN'
    })).toString('base64');
    const mockSig = require('crypto').randomBytes(64).toString('base64url');
    const signed_qr_code = `${mockHeader}.${mockPayload}.${mockSig}`;

    console.log('\n================================================================================');
    console.log('⚡ [EInvoiceService] CREDIT NOTE (CRN) GENERATION (SIMULATED MOCK MODE)');
    console.log('--------------------------------------------------------------------------------');
    console.log(`Return Number    : ${returnRecord.return_number}`);
    console.log(`CRN IRN          : ${irn}`);
    console.log(`Ack Number       : ${ack_no}`);
    console.log(`Ack Date         : ${ack_date}`);
    console.log('================================================================================\n');

    return { irn, ack_no, ack_date, signed_qr_code, status: 'GENERATED', raw_response: { success: true } };
  }

  /**
   * Cancel E-Invoice via Masters India
   */
  public static async cancelEInvoice(
    invoice: any,
    reasonCode: string,
    remarks: string
  ): Promise<{ status: 'CANCELLED' | 'FAILED'; error?: string }> {
    try {
      if (this.isMockMode()) {
        console.log(`[EInvoiceService] Simulating E-Invoice cancellation (Mock Mode) for Invoice ${invoice.invoice_number}`);
        return { status: 'CANCELLED' };
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
        user_gstin: creds.gstin,
        irn: invoice.einvoice_irn,
        cancel_reason: reasonCode,
        cancel_remarks: remarks,
      };

      console.log(`[EInvoiceService] Hitting Masters India Cancel E-Invoice API: ${creds.baseUrl}/cancel-einvoice/`);
      const apiRes = await fetch(`${creds.baseUrl}/cancel-einvoice/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `JWT ${token}`,
        },
        body: JSON.stringify(cancelPayload),
      });

      if (!apiRes.ok) {
        const errText = await apiRes.text();
        throw new Error(`Masters India E-Invoice Cancel API failed with status ${apiRes.status}: ${errText}`);
      }

      const responseData = await apiRes.json();
      const result = responseData.results;

      if (result.status === 'Success') {
        return {
          status: 'CANCELLED',
        };
      } else {
        const errorMsg = result.errorMessage || result.message || 'Unknown GSP error occurred during cancellation';
        return {
          status: 'FAILED',
          error: typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg),
        };
      }
    } catch (error: any) {
      console.error('[EInvoiceService] Error in E-Invoice cancellation:', error);
      return {
        status: 'FAILED',
        error: `Connection error: ${error.message}`,
      };
    }
  }
}
