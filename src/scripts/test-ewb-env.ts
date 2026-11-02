import { EwbService } from '../modules/maxtron/services/ewbService';
import { EInvoiceService } from '../modules/maxtron/services/eInvoiceService';
import dotenv from 'dotenv';

dotenv.config();

const mockOrder = {
  invoice_number: "INV-2026-0001",
  order_number: "ORD-2026-0001",
  invoice_date: "2026-06-24",
  total_amount: 45000,
  tax_amount: 8100,
  net_amount: 53100,
  trans_distance: 120,
  trans_mode: "1",
  vehicle_no: "MH-12-AB-1234",
  vehicle_type: "Regular",
  transporter_id: "27AAAAA1111A1Z1",
  transporter_name: "Blue Dart Logistics"
};

const mockCustomer = {
  customer_name: "Test Customer Ltd",
  gst_no: "27BBBBB2222B2Z2",
  addresses: [
    { street: "123 Business Park", city: "Pune", zip_code: "411001" }
  ]
};

const mockItems = [
  { product_name: "Film Rolls", quantity: 50, rate: 900, gst_percent: 18, total_value: 45000 }
];

async function runTests() {
  console.log("================================================================");
  console.log("🧪 TESTING SANDBOX, MOCK & LIVE API INTEGRATIONS FOR GST / EWB");
  console.log("================================================================");

  const originalEnv = { ...process.env };

  try {
    // ----------------------------------------------------
    // Scenario 1: Mock Mode Verification (EWB & E-Invoice)
    // ----------------------------------------------------
    console.log("\n--- SCENARIO 1: MOCK MODE VERIFICATION ---");
    process.env.ENABLE_LIVE_EWB = 'false';
    process.env.ENABLE_LIVE_EINVOICE = 'false';

    console.log("EWB Mock Mode Status:", EwbService.isMockMode() ? "✅ MOCK MODE" : "❌ LIVE MODE");
    const ewbMockRes = await EwbService.generateEwb(mockOrder, mockCustomer, mockItems);
    console.log("EWB Status:", ewbMockRes.ewb_status);
    console.log("EWB Number:", ewbMockRes.ewb_no);

    console.log("E-Invoice Mock Mode Status:", EInvoiceService.isMockMode() ? "✅ MOCK MODE" : "❌ LIVE MODE");
    const einvMockRes = await EInvoiceService.generateEInvoice(mockOrder, mockCustomer, mockItems);
    console.log("E-Invoice Status:", einvMockRes.status);
    console.log("E-Invoice IRN:", einvMockRes.irn);

    // ----------------------------------------------------
    // Scenario 2: Sandbox API Route Verification (Masters India GSP Sandbox)
    // ----------------------------------------------------
    console.log("\n--- SCENARIO 2: MASTERS INDIA GSP SANDBOX API ---");
    process.env.ENABLE_LIVE_EWB = 'true';
    process.env.ENABLE_LIVE_EINVOICE = 'true';
    process.env.EWB_ENV = 'sandbox';
    process.env.EINVOICE_ENV = 'sandbox';
    process.env.MI_GSP_USERNAME = 'aman@mastersindia.co';
    process.env.MI_GSP_PASSWORD = 'Miitspl@123';
    process.env.MI_GSP_GSTIN = '32AUYPV8850B1Z2';
    process.env.MI_GSP_SANDBOX_BASE_URL = 'https://sandb-api.mastersindia.co/api/v1';

    console.log("EWB Mode:", EwbService.isMockMode() ? "MOCK MODE" : "⚡ LIVE SANDBOX");
    const ewbSbRes = await EwbService.generateEwb(mockOrder, mockCustomer, mockItems);
    console.log("EWB Status:", ewbSbRes.ewb_status);
    if (ewbSbRes.ewb_status === 'GENERATED') {
      console.log("Generated EWB No:", ewbSbRes.ewb_no);
    } else {
      console.log("EWB Response/Error:", ewbSbRes.ewb_error);
    }

    console.log("\nE-Invoice Mode:", EInvoiceService.isMockMode() ? "MOCK MODE" : "⚡ LIVE SANDBOX");
    const einvSbRes = await EInvoiceService.generateEInvoice(mockOrder, mockCustomer, mockItems);
    console.log("E-Invoice Status:", einvSbRes.status);
    if (einvSbRes.status === 'GENERATED') {
      console.log("Generated IRN:", einvSbRes.irn);
    } else {
      console.log("E-Invoice Response/Error:", einvSbRes.error);
    }

    // ----------------------------------------------------
    // Scenario 3: Missing Credentials / Fallback to Mock Mode
    // ----------------------------------------------------
    console.log("\n--- SCENARIO 3: NO CREDENTIALS FALLBACK TO MOCK ---");
    process.env.ENABLE_LIVE_EWB = 'true';
    process.env.ENABLE_LIVE_EINVOICE = 'true';
    delete process.env.MI_GSP_USERNAME;
    delete process.env.MI_GSP_PASSWORD;
    delete process.env.MI_GSP_GSTIN;
    delete process.env.EWB_SANDBOX_USERNAME;
    delete process.env.EINVOICE_SANDBOX_USERNAME;

    console.log("EWB Status (Expected Mock):", EwbService.isMockMode() ? "✅ MOCK MODE" : "❌ LIVE MODE");
    console.log("E-Invoice Status (Expected Mock):", EInvoiceService.isMockMode() ? "✅ MOCK MODE" : "❌ LIVE MODE");

  } finally {
    process.env = originalEnv;
  }
}

runTests();
