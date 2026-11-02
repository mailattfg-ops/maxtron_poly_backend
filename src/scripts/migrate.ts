import dns from "dns";

dns.setDefaultResultOrder("ipv4first");
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') }); // Ensure it reads from the correct backend root

const connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error('❌ Error: SUPABASE_DB_URL is missing in your .env file.');
  console.error('📋 Please get your Database Connection String (URI format starting with postgres://) from Supabase -> Settings -> Database');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false } // Required for Supabase external connections
});

async function runMigrations() {
  console.log('🔄 Starting automated database migration...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('1️⃣ Creating user_types table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_types (
        id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
        name text UNIQUE NOT NULL,
        description text
      );
    `);

    console.log('2️⃣ Inserting default user_types...');
    await client.query(`
      INSERT INTO user_types (id, name, description)
      SELECT uuid_generate_v4(), val.name, val.description
      FROM (VALUES
        ('admin', 'System Administrator with full access'),
        ('hr', 'Human Resources and Payroll manager'),
        ('sales', 'Sales representative and order manager'),
        ('production', 'Production floor and machine scheduler'),
        ('finance', 'Accountant and finance module manager')
      ) AS val(name, description)
      WHERE NOT EXISTS (
        SELECT 1 FROM user_types WHERE user_types.name = val.name AND user_types.company_id IS NULL
      );
    `);

    console.log('3️⃣ Creating Employee Master tables (Categories & Departments)...');

    // Clean up old separate employees table if it exists
    await client.query('DROP TABLE IF EXISTS employees CASCADE;');

    await client.query(`
      CREATE TABLE IF NOT EXISTS companies(
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_code VARCHAR(50) UNIQUE NOT NULL,
        company_name VARCHAR(255) UNIQUE NOT NULL,
        gst_no VARCHAR(100),
        license_no VARCHAR(100),
        license_details TEXT,
        license_renewal_date DATE,
        pcb_authorization_no VARCHAR(100),
        pcb_details TEXT,
        pcb_renewal_date DATE,
        no_of_employees INTEGER DEFAULT 0,
        email VARCHAR(255),
        phone VARCHAR(50),
        website VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      INSERT INTO companies(id, company_code, company_name) VALUES
      (gen_random_uuid(), 'MAXTRON-CODE', 'MAXTRON'),
      (gen_random_uuid(), 'KEIL-CODE', 'KEIL')
      ON CONFLICT(company_name) DO NOTHING;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_categories(
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category_name VARCHAR(100) NOT NULL,
        company_id UUID REFERENCES companies(id),
        UNIQUE(category_name, company_id)
      );
    `);

    console.log('3.5️⃣ Seeding Categories...');
    await client.query(`
      -- Global standard categories (company_id is NULL)
      INSERT INTO employee_categories(category_name, company_id)
      SELECT val.category_name, val.company_id::UUID
      FROM (VALUES
        ('Management', NULL),
        ('Staff - Technical', NULL),
        ('Staff - Non-Technical', NULL),
        ('Worker - Skilled', NULL),
        ('Worker - Unskilled', NULL)
      ) AS val(category_name, company_id)
      WHERE NOT EXISTS (
        SELECT 1 FROM employee_categories 
        WHERE employee_categories.category_name = val.category_name 
          AND employee_categories.company_id IS NULL
      );

      -- Company specific categories (cloned for each company as requested)
      INSERT INTO employee_categories(category_name, company_id)
      SELECT cats.name, c.id
      FROM (VALUES ('Management'), ('Staff - Technical'), ('Staff - Non-Technical'), ('Worker - Skilled'), ('Worker - Unskilled')) AS cats(name)
      CROSS JOIN companies c
      WHERE NOT EXISTS (
        SELECT 1 FROM employee_categories 
        WHERE employee_categories.category_name = cats.name 
          AND employee_categories.company_id = c.id
      );
    `);

    console.log('4️⃣ Clean up dependencies to apply new structural updates...');
    await client.query(`
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS user_departments, addresses, employee_qualifications, employee_experiences, employee_certificates, employee_licenses, employee_passports, employee_loans, employee_suspenses, employee_targets, employee_incentive_slabs, attendance, marketing_visits, customers CASCADE;
      DROP TABLE IF EXISTS production_batches, production_conversions, production_conversion_items, production_packing, production_wastage, finished_products, raw_materials CASCADE;
      DROP TABLE IF EXISTS customer_order_items, customer_orders, sales_invoice_items, sales_invoices, delivery_items, deliveries, sales_return_items, sales_returns, vehicles CASCADE;
      DROP TABLE IF EXISTS rm_order_items, rm_orders, purchase_entry_items, purchase_entries, material_consumptions, purchase_returns, inventory, supplier_master CASCADE;
      DROP SEQUENCE IF EXISTS employee_code_seq;
      DROP SEQUENCE IF EXISTS cutting_no_seq;
      DROP SEQUENCE IF EXISTS order_no_seq;
      DROP SEQUENCE IF EXISTS invoice_no_seq;
      DROP SEQUENCE IF EXISTS delivery_no_seq;
      DROP SEQUENCE IF EXISTS sales_return_no_seq;
      DROP SEQUENCE IF EXISTS purchase_entry_no_seq;
      DROP SEQUENCE IF EXISTS consumption_slip_no_seq;
    `);

    console.log('4.2️⃣ Creating sequences...');
    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS employee_code_seq START 1001;
      CREATE SEQUENCE IF NOT EXISTS cutting_no_seq START 1;
      CREATE SEQUENCE IF NOT EXISTS order_no_seq START 1;
    `);

    console.log('4.5️⃣ Creating users table (Unified with Employee data)...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users(
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type UUID,
        employee_code VARCHAR(50) UNIQUE NOT NULL DEFAULT 'EMP-' || nextval('employee_code_seq')::text,
        name TEXT NOT NULL,
        username TEXT, --email used for login
        password TEXT, --hashed using bcrypt
        address TEXT, --communication address
        permanent_address TEXT,
        date_of_birth DATE,
        guarantor_name VARCHAR(150),
        is_married BOOLEAN DEFAULT FALSE,
        family_details TEXT,
        category_id UUID,
        company_id UUID,
        has_license BOOLEAN DEFAULT FALSE,
        has_passport BOOLEAN DEFAULT FALSE,
        phone TEXT,
        aadhaar VARCHAR(100),
        basic_salary NUMERIC(15, 2) DEFAULT 0,
        is_deleted BOOLEAN DEFAULT FALSE,
        has_insurance BOOLEAN DEFAULT FALSE,
        branch_id UUID,
        bank_account_no VARCHAR(100),
        bank_ifsc VARCHAR(50),
        bank_branch VARCHAR(150),
        bank_account_type VARCHAR(50),
        bank_name VARCHAR(150),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        --Foreign Key Connections
        CONSTRAINT fk_profile_type 
            FOREIGN KEY(type) 
            REFERENCES user_types(id)
            ON DELETE RESTRICT,

        CONSTRAINT fk_profile_category 
            FOREIGN KEY(category_id) 
            REFERENCES employee_categories(id)
            ON DELETE SET NULL,

        CONSTRAINT fk_company 
            FOREIGN KEY(company_id) 
            REFERENCES companies(id)
            ON DELETE SET NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS users_username_active_idx 
      ON users (username) 
      WHERE (is_deleted = false AND username IS NOT NULL);
    `);



    console.log('5️⃣ Creating inventory table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory(
      id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
      name text NOT NULL,
      sku text UNIQUE NOT NULL,
      quantity numeric DEFAULT 0,
      category text,
      price numeric DEFAULT 0.00,
      created_at timestamp with time zone DEFAULT now()
      );
    `);

    console.log('7️⃣ Creating Employee HR Module and Company dependent tables...');

    // Companies Table


    await client.query(`
      CREATE TABLE IF NOT EXISTS customers(
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        customer_name VARCHAR(255) NOT NULL,
        customer_code VARCHAR(50) NOT NULL,
        gst_no VARCHAR(100),
        credit_period INTEGER DEFAULT 0, -- Store as days
        credit_limit NUMERIC(12, 2) DEFAULT 0,
        mobile_no VARCHAR(50),
        email_id VARCHAR(255),
        department VARCHAR(100),
        custom_label1 VARCHAR(100),
        custom_value1 TEXT,
        custom_label2 VARCHAR(100),
        custom_value2 TEXT,
        delivery_period VARCHAR(100), -- New Field
        delivery_mode VARCHAR(100), -- New Field
        opening_balance NUMERIC(12, 2) DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(customer_code, company_id)
      );
    `);

    // Dependencies (Addresses can belong to users, companies, or customers)
    await client.query(`
      CREATE TABLE IF NOT EXISTS addresses(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
      address_type VARCHAR(50),
      street VARCHAR(255),
      city VARCHAR(100),
      state VARCHAR(100),
      zip_code VARCHAR(20),
      country VARCHAR(100) DEFAULT 'India',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_qualifications(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
      qualification_type VARCHAR(30) CHECK(qualification_type IN('BASIC', 'ADDITIONAL')),
      qualification_name VARCHAR(200)
    );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_experiences(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
      company_name VARCHAR(150),
      from_period DATE,
      to_period DATE,
      post VARCHAR(150),
      responsibilities TEXT
    );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_certificates(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
      certificate_type VARCHAR(50) CHECK(certificate_type IN('MEDICAL', 'POLICE_VERIFICATION')),
      issued BOOLEAN DEFAULT FALSE,
      issue_date DATE,
      expiry_date DATE
    );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_licenses(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
      license_no VARCHAR(100),
      license_number VARCHAR(100),
      class_of_vehicle VARCHAR(100),
      issue_date DATE,
      expiry_date DATE
    );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_passports(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
      passport_no VARCHAR(100),
      issue_date DATE,
      expiry_date DATE
    );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_loans(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
      loan_availed NUMERIC(12, 2),
      balance_receivable NUMERIC(12, 2),
      loan_date DATE
    );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_targets(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
      minimum_target NUMERIC(12, 2)
    );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_incentive_slabs(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
      slab_from NUMERIC(12, 2),
      slab_to NUMERIC(12, 2),
      incentive_percent NUMERIC(5, 2)
    );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS employee_suspenses(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
      suspense_issued NUMERIC(12, 2),
      balance_receivable NUMERIC(12, 2)
    );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS attendance(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      shift VARCHAR(20) NOT NULL, --DAY, NIGHT, GENERAL
        clock_in TIME,
      clock_out TIME,
      status VARCHAR(20) DEFAULT 'PRESENT',
      remarks TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS marketing_visits(
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      employee_id UUID REFERENCES users(id) ON DELETE CASCADE,
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
      customer_name VARCHAR(255) NOT NULL,
      location TEXT,
      visit_date DATE NOT NULL,
      time_in TIME,
      time_out TIME,
      purpose TEXT,
      outcome TEXT,
      feedback TEXT,
      is_quotation BOOLEAN DEFAULT FALSE,
      quotation_items JSONB DEFAULT '[]'::jsonb,
      quotation_delivery_date DATE,
      quotation_status VARCHAR(50) DEFAULT 'Pending',
      probability VARCHAR(20) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    `);

    console.log('7.5️⃣ Creating Supplier Master table...');
    // await client.query('DROP TABLE IF EXISTS suppliers CASCADE;');
    // await client.query('DROP TABLE IF EXISTS supplier_master CASCADE;');
    await client.query(`
      CREATE TABLE supplier_master (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        supplier_code VARCHAR(50) UNIQUE NOT NULL,
        supplier_name VARCHAR(255) NOT NULL,
        supplier_address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
        billing_address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
        gst_no VARCHAR(100),
        credit_period INTEGER DEFAULT 0,
        credit_limit NUMERIC(15, 2) DEFAULT 0,
        product_supplied TEXT,
        delivery_period VARCHAR(100),
        delivery_mode VARCHAR(100),
        opening_balance NUMERIC(15, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query('ALTER TABLE supplier_master ENABLE ROW LEVEL SECURITY;');
    await client.query('CREATE POLICY "master_supplier_access" ON supplier_master FOR ALL USING (true) WITH CHECK (true);');

    console.log('8️⃣ Inserting default admin user...');
    await client.query(`
      INSERT INTO users(type, name, username, password, address, employee_code)
      SELECT id, 'System Admin', 'admin@maxtron.com', '$2b$10$d8OgKHsj1xpvu6wdrN/cc.26v8lE2TVTX3/hIeeHf5E5wGklxKaaC', 'Maxtron HQ, Server Room 1', 'SYS-ADMIN-01'
      FROM user_types WHERE name = 'admin'
      ON CONFLICT(username) DO NOTHING;
    `);

    console.log('9️⃣ Creating Raw Materials Master Data...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS raw_materials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        rm_code VARCHAR(50) NOT NULL,
        rm_name VARCHAR(255) NOT NULL,
        rm_description TEXT,
        rate_per_unit NUMERIC(10, 2) DEFAULT 0,
        unit_type VARCHAR(20) DEFAULT 'Kg',
        grade VARCHAR(100),
        availability VARCHAR(100),
        stock_threshold NUMERIC(15, 2) DEFAULT 0,
        opening_stock NUMERIC(15, 2) DEFAULT 0,
        hsn_code VARCHAR(100) DEFAULT NULL,
        rm_type_code VARCHAR(255) DEFAULT NULL,
        company_id UUID REFERENCES companies(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(rm_code, company_id)
      );
    `);

    console.log('9.5️⃣ Creating Production MES tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS finished_products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_code VARCHAR(50) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        color VARCHAR(100),
        thickness_microns NUMERIC(10, 2),
        size VARCHAR(100),
        avg_count_per_kg NUMERIC(10, 2),
        description TEXT,
        stock_threshold NUMERIC(15, 2) DEFAULT 0,
        opening_stock NUMERIC(15, 2) DEFAULT 0,
        hsn_code VARCHAR(100) DEFAULT NULL,
        company_id UUID REFERENCES companies(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(product_code, company_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS production_batches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        batch_number VARCHAR(100) NOT NULL,
        product_id UUID REFERENCES finished_products(id),
        shift VARCHAR(50) NOT NULL,
        operator_id UUID REFERENCES users(id),
        supervisor_id UUID REFERENCES users(id),
        machine_no VARCHAR(50),
        raw_material_consumed_qty NUMERIC(15, 3),
        extrusion_output_qty NUMERIC(15, 3),
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        company_id UUID REFERENCES companies(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(batch_number, company_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS production_conversions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversion_number VARCHAR(50) UNIQUE DEFAULT 'CUT-' || to_char(CURRENT_DATE, 'YYMM') || '-' || LPAD(nextval('cutting_no_seq')::text, 4, '0'),
        batch_id UUID REFERENCES production_batches(id),
        shift VARCHAR(50),
        input_qty NUMERIC(15, 3),
        output_qty NUMERIC(15, 3),
        wastage_qty NUMERIC(15, 3),
        remarks TEXT,
        operator_id UUID REFERENCES users(id),
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        company_id UUID REFERENCES companies(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS production_conversion_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversion_id UUID REFERENCES production_conversions(id) ON DELETE CASCADE,
        product_id UUID REFERENCES finished_products(id),
        quantity NUMERIC(15, 3) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS production_packing (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversion_id UUID REFERENCES production_conversions(id),
        bundle_count INTEGER NOT NULL,
        qty_per_bundle NUMERIC(15, 3) NOT NULL,
        total_packed_qty NUMERIC(15, 3) NOT NULL,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        company_id UUID REFERENCES companies(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS production_wastage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        stage VARCHAR(50) NOT NULL,
        source_id UUID,
        material_id UUID, 
        product_id UUID,
        wastage_qty NUMERIC(15, 3) NOT NULL,
        reason_code VARCHAR(100),
        remarks TEXT,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        company_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT production_wastage_material_id_fkey FOREIGN KEY (material_id) REFERENCES raw_materials(id) ON DELETE SET NULL,
        CONSTRAINT production_wastage_product_id_fkey FOREIGN KEY (product_id) REFERENCES finished_products(id) ON DELETE SET NULL,
        CONSTRAINT production_wastage_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      );
    `);

    console.log('9.8️⃣ Creating Sales Module tables...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        registration_number VARCHAR(50) NOT NULL,
        model VARCHAR(100),
        vehicle_type VARCHAR(50), 
        body_type VARCHAR(50),
        fitness_date DATE,
        fitness_renewal_date DATE,
        km_on_day_1 NUMERIC(15, 2) DEFAULT 0,
        engine_no VARCHAR(100),
        chassis_no VARCHAR(100),
        owner_name VARCHAR(255),
        owner_address TEXT,
        gps_installed BOOLEAN DEFAULT FALSE,
        gps_company VARCHAR(100),
        gps_install_date DATE,
        seating_capacity INTEGER,
        purpose VARCHAR(100), 
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(registration_number, company_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number VARCHAR(50) UNIQUE DEFAULT 'ORD-' || to_char(CURRENT_DATE, 'YYMM') || '-' || LPAD(nextval('order_no_seq')::text, 4, '0'),
        customer_id UUID REFERENCES customers(id),
        executive_id UUID REFERENCES users(id),
        order_date DATE NOT NULL DEFAULT CURRENT_DATE,
        total_value NUMERIC(15, 2) DEFAULT 0, -- Taxable Value
        tax_amount NUMERIC(15, 2) DEFAULT 0,
        net_amount NUMERIC(15, 2) DEFAULT 0, -- Total inclusive of tax
        section_type VARCHAR(50) DEFAULT 'customer order',
        round_off NUMERIC(15, 2) DEFAULT 0,
        is_round_off BOOLEAN DEFAULT FALSE,
        remarks TEXT,
        company_id UUID REFERENCES companies(id),
        transporter_id VARCHAR(100) DEFAULT NULL,
        transporter_name VARCHAR(255) DEFAULT NULL,
        trans_distance NUMERIC(10, 2) DEFAULT NULL,
        trans_mode VARCHAR(50) DEFAULT NULL,
        vehicle_no VARCHAR(50) DEFAULT NULL,
        vehicle_type VARCHAR(50) DEFAULT NULL,
        trans_doc_no VARCHAR(100) DEFAULT NULL,
        trans_doc_date DATE DEFAULT NULL,
        ewb_status VARCHAR(50) DEFAULT 'PENDING',
        ewb_no VARCHAR(50) DEFAULT NULL,
        ewb_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
        ewb_valid_till TIMESTAMP WITH TIME ZONE DEFAULT NULL,
        ewb_error TEXT DEFAULT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES customer_orders(id) ON DELETE CASCADE,
        product_id UUID REFERENCES finished_products(id),
        quantity NUMERIC(15, 3) NOT NULL,
        rate NUMERIC(15, 2) NOT NULL,
        gst_percent NUMERIC(5, 2) DEFAULT 0,
        gst_amount NUMERIC(15, 2) DEFAULT 0,
        total_value NUMERIC(15, 2) DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS production_expenses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
        category VARCHAR(100), -- Spare Parts, Maintenance, Consumables, Utilities, Others
        description TEXT,
        amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
        payment_mode VARCHAR(50) DEFAULT 'CASH',
        reference_no VARCHAR(100),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Extended Sales Tables
    await client.query(`CREATE SEQUENCE IF NOT EXISTS invoice_no_seq START 1;`);
    await client.query(`CREATE SEQUENCE IF NOT EXISTS delivery_no_seq START 1;`);
    await client.query(`CREATE SEQUENCE IF NOT EXISTS sales_return_no_seq START 1;`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_number VARCHAR(50) UNIQUE DEFAULT 'INV-' || to_char(CURRENT_DATE, 'YYMM') || '-' || LPAD(nextval('invoice_no_seq')::text, 4, '0'),
        order_id UUID REFERENCES customer_orders(id) ON DELETE SET NULL,
        customer_id UUID REFERENCES customers(id),
        executive_id UUID REFERENCES users(id),
        invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
        total_amount NUMERIC(15, 2) DEFAULT 0,
        tax_amount NUMERIC(15, 2) DEFAULT 0,
        net_amount NUMERIC(15, 2) DEFAULT 0,
        discount_amount NUMERIC(15, 2) DEFAULT 0,
        scheduled_delivery_date DATE,
        status VARCHAR(50) DEFAULT 'PENDING',
        remarks TEXT,
        company_id UUID REFERENCES companies(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_invoice_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id UUID REFERENCES sales_invoices(id) ON DELETE CASCADE,
        product_id UUID REFERENCES finished_products(id),
        quantity NUMERIC(15, 3) NOT NULL,
        rate NUMERIC(15, 2) NOT NULL,
        amount NUMERIC(15, 2) GENERATED ALWAYS AS (quantity * rate) STORED,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS deliveries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        delivery_number VARCHAR(50) UNIQUE DEFAULT 'DEL-' || to_char(CURRENT_DATE, 'YYMM') || '-' || LPAD(nextval('delivery_no_seq')::text, 4, '0'),
        invoice_id UUID REFERENCES sales_invoices(id) ON DELETE SET NULL,
        order_id UUID REFERENCES customer_orders(id) ON DELETE SET NULL,
        vehicle_id UUID REFERENCES vehicles(id),
        driver_name VARCHAR(255),
        delivery_person_id UUID REFERENCES users(id) ON DELETE SET NULL,
        receiver_name VARCHAR(255),
        receiver_section VARCHAR(255),
        delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
        delivery_time VARCHAR(50),
        contact_number VARCHAR(50),
        dc_no VARCHAR(100),
        status VARCHAR(50) DEFAULT 'OUT_FOR_DELIVERY',
        remarks TEXT,
        company_id UUID REFERENCES companies(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS delivery_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        delivery_id UUID REFERENCES deliveries(id) ON DELETE CASCADE,
        product_id UUID REFERENCES finished_products(id),
        quantity NUMERIC(15, 3) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_returns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        return_number VARCHAR(50) UNIQUE DEFAULT 'RET-' || to_char(CURRENT_DATE, 'YYMM') || '-' || LPAD(nextval('sales_return_no_seq')::text, 4, '0'),
        invoice_id UUID REFERENCES sales_invoices(id) ON DELETE SET NULL,
        customer_id UUID REFERENCES customers(id),
        return_date DATE NOT NULL DEFAULT CURRENT_DATE,
        return_through VARCHAR(20) DEFAULT 'DIRECT',
        courier_name VARCHAR(255),
        return_employee_id UUID REFERENCES users(id),
        reason TEXT,
        total_return_value NUMERIC(15, 2) DEFAULT 0,
        company_id UUID REFERENCES companies(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_return_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        return_id UUID REFERENCES sales_returns(id) ON DELETE CASCADE,
        product_id UUID REFERENCES finished_products(id),
        quantity NUMERIC(15, 3) NOT NULL,
        rate NUMERIC(15, 2) NOT NULL,
        value NUMERIC(15, 2) GENERATED ALWAYS AS (quantity * rate) STORED,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('9.9️⃣ Creating Purchase & RM Module tables...');

    // Ensure rm_orders table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS rm_orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number VARCHAR(50) UNIQUE DEFAULT 'RM-ORD-' || to_char(CURRENT_DATE, 'YYMM') || '-' || LPAD(nextval('order_no_seq')::text, 4, '0'),
        order_date DATE NOT NULL DEFAULT CURRENT_DATE,
        supplier_id UUID,
        expected_delivery_date DATE,
        total_amount NUMERIC(15, 2) DEFAULT 0,
        round_off NUMERIC(15, 2) DEFAULT 0,
        is_round_off BOOLEAN DEFAULT FALSE,
        status VARCHAR(50) DEFAULT 'PENDING',
        remarks TEXT,
        company_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT rm_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES supplier_master(id) ON DELETE SET NULL,
        CONSTRAINT rm_orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL
      );
    `);

    await client.query(`
      ALTER TABLE rm_orders 
        ADD COLUMN IF NOT EXISTS round_off NUMERIC(15, 2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS is_round_off BOOLEAN DEFAULT FALSE;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS rm_order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID,
        rm_id UUID,
        quantity NUMERIC(15, 3) NOT NULL,
        rate NUMERIC(15, 2) NOT NULL,
        amount NUMERIC(15, 2) GENERATED ALWAYS AS (quantity * rate) STORED,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT rm_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES rm_orders(id) ON DELETE CASCADE,
        CONSTRAINT rm_order_items_rm_id_fkey FOREIGN KEY (rm_id) REFERENCES raw_materials(id) ON DELETE CASCADE
      );
    `);

    await client.query(`CREATE SEQUENCE IF NOT EXISTS purchase_entry_no_seq START 1;`);
    await client.query(`CREATE SEQUENCE IF NOT EXISTS consumption_slip_no_seq START 1;`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchase_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entry_number VARCHAR(50) UNIQUE DEFAULT 'PUR-' || to_char(CURRENT_DATE, 'YYMM') || '-' || LPAD(nextval('purchase_entry_no_seq')::text, 4, '0'),
        order_id UUID,
        supplier_id UUID,
        entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
        invoice_number VARCHAR(100),
        invoice_date DATE,
        vehicle_number VARCHAR(50),
        unloading_charges NUMERIC(15, 2) DEFAULT 0,
        total_amount NUMERIC(15, 2) DEFAULT 0,
        round_off NUMERIC(15, 2) DEFAULT 0,
        is_round_off BOOLEAN DEFAULT FALSE,
        remarks TEXT,
        company_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT purchase_entries_order_id_fkey FOREIGN KEY (order_id) REFERENCES rm_orders(id) ON DELETE SET NULL,
        CONSTRAINT purchase_entries_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES supplier_master(id) ON DELETE SET NULL,
        CONSTRAINT purchase_entries_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      );
    `);

    // Cleanup: Default moved to CREATE TABLE
    /*
      ALTER TABLE purchase_entries ALTER COLUMN entry_number SET DEFAULT 'PUR-' || to_char(CURRENT_DATE, 'YYMM') || '-' || LPAD(nextval('purchase_entry_no_seq')::text, 4, '0');
    */

    await client.query(`
      CREATE TABLE IF NOT EXISTS purchase_entry_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entry_id UUID,
        rm_id UUID,
        ordered_quantity NUMERIC(15, 3),
        received_quantity NUMERIC(15, 3) NOT NULL,
        rate NUMERIC(15, 2) NOT NULL,
        amount NUMERIC(15, 2) GENERATED ALWAYS AS (received_quantity * rate) STORED,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT purchase_entry_items_entry_id_fkey FOREIGN KEY (entry_id) REFERENCES purchase_entries(id) ON DELETE CASCADE,
        CONSTRAINT purchase_entry_items_rm_id_fkey FOREIGN KEY (rm_id) REFERENCES raw_materials(id) ON DELETE CASCADE
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS material_consumptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        consumption_slip_no VARCHAR(50) UNIQUE DEFAULT 'CSN-' || to_char(CURRENT_DATE, 'YYMM') || '-' || LPAD(nextval('consumption_slip_no_seq')::text, 4, '0'),
        rm_id UUID,
        quantity_used NUMERIC(15, 3) NOT NULL,
        consumption_date DATE NOT NULL DEFAULT CURRENT_DATE,
        process_type VARCHAR(100),
        machine_no VARCHAR(100),
        issued_by UUID,
        remarks TEXT,
        company_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT material_consumptions_rm_id_fkey FOREIGN KEY (rm_id) REFERENCES raw_materials(id) ON DELETE CASCADE,
        CONSTRAINT material_consumptions_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
        CONSTRAINT material_consumptions_issued_by_fkey FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS purchase_returns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        return_no VARCHAR(50) UNIQUE DEFAULT 'PR-RET-' || to_char(CURRENT_DATE, 'YYMM') || '-' || LPAD(nextval('sales_return_no_seq')::text, 4, '0'),
        purchase_entry_id UUID,
        supplier_id UUID,
        return_date DATE NOT NULL DEFAULT CURRENT_DATE,
        quantity_returned NUMERIC(15, 3),
        reason TEXT,
        dispatch_details TEXT,
        status VARCHAR(50) DEFAULT 'DISPATCHED',
        total_return_value NUMERIC(15, 2) DEFAULT 0,
        company_id UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT purchase_returns_purchase_entry_id_fkey FOREIGN KEY (purchase_entry_id) REFERENCES purchase_entries(id) ON DELETE SET NULL,
        CONSTRAINT purchase_returns_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES supplier_master(id) ON DELETE SET NULL,
        CONSTRAINT purchase_returns_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
      );
    `);

    console.log('9.10️⃣ Creating Announcements table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'critical')),
        tenant TEXT NOT NULL CHECK (tenant IN ('maxtron', 'keil')),
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_by UUID REFERENCES users(id) ON DELETE SET NULL
      );
    `);
    await client.query('CREATE INDEX IF NOT EXISTS idx_announcements_tenant_active ON announcements(tenant, active);');

    console.log('9.10b️⃣ Checking and adding bank detail columns to users table if they do not exist...');
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_no VARCHAR(100);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_branch VARCHAR(150);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account_type VARCHAR(50);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name VARCHAR(150);
    `);

    console.log('9.11️⃣ Disabling Row Level Security (RLS) on all public tables...');
    const tablesRes = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public';
    `);
    for (const row of tablesRes.rows) {
      await client.query(`ALTER TABLE "${row.tablename}" DISABLE ROW LEVEL SECURITY;`);
    }

    console.log('🔟 Refreshing PostgREST schema cache...');
    await client.query("NOTIFY pgrst, 'reload schema';");


    await client.query('COMMIT');
    console.log('✅ Migration successful! All tables and unified users structure correctly created.');

  } catch (err: any) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
  } finally {
    client.release();
    pool.end();
  }
}

runMigrations();
