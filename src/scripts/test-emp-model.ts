// import dns from "dns";
// dns.setDefaultResultOrder("ipv4first");
import { EmployeeModel } from '../modules/maxtron/models/employeeModel';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function test() {
  try {
    const emps = await EmployeeModel.getAll();
    console.log("SUCCESS! Total employees fetched:", emps.length);
    if (emps.length > 0) {
      console.log("First employee object details:");
      console.log(JSON.stringify(emps[0], null, 2));
    }
  } catch (err: any) {
    console.error("ERROR running EmployeeModel.getAll():", err);
    if (err.cause) {
      console.error("ERROR CAUSE:", err.cause);
    }
  }
}

test();
