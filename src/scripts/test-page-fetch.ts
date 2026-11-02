import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const secret = process.env.JWT_SECRET as string;

// User info for demo1 (MAXTRON)
const payload = {
  id: 'b2bb6f64-ef94-4312-bdc8-aa87c2d045e3',
  username: 'demo1@gmail.com',
  company_id: '739f66c9-4f5a-428f-984e-ac9e2e689b59'
};

const token = jwt.sign(payload, secret, { expiresIn: '1h' });

const API_BASE = 'http://localhost:5004';
const PRODUCT_API = `${API_BASE}/api/maxtron/products`;
const EMPLOYEES_API = `${API_BASE}/api/maxtron/employees`;

async function test() {
  try {
    const compRes = await fetch(`${API_BASE}/api/maxtron/companies`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const compData = await compRes.json();
    console.log("Matched companies in DB count:", compData.data?.length);

    let activeTenant = 'MAXTRON';
    let coId = '';
    if (compData.success && Array.isArray(compData.data)) {
      const activeCo = compData.data.find((c: any) => 
        c.company_name?.toUpperCase() === activeTenant || 
        c.company_name?.toUpperCase().includes(activeTenant)
      );
      if (activeCo) {
        coId = activeCo.id;
        console.log(`Matched company coId:`, coId);
      }
    }

    const [prodRes, empRes, conRes] = await Promise.all([
      fetch(`${PRODUCT_API}${coId ? `?company_id=${coId}` : ''}`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`${EMPLOYEES_API}`, { headers: { 'Authorization': `Bearer ${token}` } }),
      fetch(`${API_BASE}/api/maxtron/consumptions${coId ? `?company_id=${coId}` : ''}`, { headers: { 'Authorization': `Bearer ${token}` } })
    ]);

    const prodData = await prodRes.json();
    const empData = await empRes.json();
    const conData = await conRes.json();

    console.log("Products success:", prodData.success, "Count:", prodData.data?.length);
    console.log("Consumptions success:", conData.success, "Count:", conData.data?.length);
    console.log("Employees success:", empData.success, "Count:", empData.data?.length);

    if (empData.success && Array.isArray(empData.data)) {
      const filtered = empData.data.filter((e: any) => 
        (e.companies?.company_name?.toUpperCase() === activeTenant ||
        e.companies?.company_name?.toUpperCase().includes(activeTenant))
      );
      console.log("Filtered employees count for activeTenant:", activeTenant, "->", filtered.length);
      if (filtered.length > 0) {
        console.log("Filtered employee 0:", filtered[0].name);
      }
    }
  } catch (err: any) {
    console.error("Error matching:", err.message);
  }
}

test();
