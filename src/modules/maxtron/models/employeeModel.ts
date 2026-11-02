import { supabase } from '../../../config/supabase';

import { User } from '../../../models/userModel';
import bcrypt from 'bcryptjs';

// The password hash must never leave the server.
const omitPassword = ({ password, ...user }: any) => user;

export const EmployeeModel = {
    // Get all employees (from users table)
    getAll: async (companyName?: string, companyId?: string, categoryId?: string, isDeleted?: boolean): Promise<User[]> => {
        let query = supabase
            .from('users')
            .select(`
                *,
                employee_categories(category_name),
                companies!inner(company_name),
                user_types(name),
                addresses(*),
                employee_qualifications(*),
                employee_experiences(*),
                employee_certificates(*),
                employee_licenses(*),
                employee_insurances(*),
                employee_passports(*),
                employee_loans(*),
                employee_targets(*),
                employee_suspenses(*),
                employee_incentive_slabs(*)
            `);

        // Default to showing only non-deleted if not specified
        const showDeleted = isDeleted === true || isDeleted === (true as any);
        query = query.eq('is_deleted', showDeleted);

        if (companyName && companyName.trim() !== '') {
            query = query.ilike('companies.company_name', `%${companyName}%`);
        }
        if (companyId && companyId.trim() !== '') {
            query = query.filter('company_id', 'eq', companyId);
        }
        if (categoryId && categoryId.trim() !== '') {
            query = query.filter('category_id', 'eq', categoryId);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return (data || []).map(omitPassword);
    },

    // Get single employee by ID
    getById: async (id: string): Promise<User | null> => {
        const { data, error } = await supabase
            .from('users')
            .select(`
                *,
                employee_categories(category_name),
                companies(company_name),
                user_types(name),
                addresses(*),
                employee_qualifications(*),
                employee_experiences(*),
                employee_certificates(*),
                employee_licenses(*),
                employee_insurances(*),
                employee_passports(*),
                employee_loans(*),
                employee_targets(*),
                employee_suspenses(*),
                employee_incentive_slabs(*)
            `)
            .eq('id', id)
            .single();

        if (error && error.code !== 'PGRST116') throw new Error(error.message);
        return data ? omitPassword(data) : null;
    },

    // Create a new employee
    create: async (employeeData: any): Promise<User> => {
        const { employee_qualifications, employee_experiences, employee_certificates, employee_licenses, employee_insurances, employee_passports, employee_loans, employee_targets, employee_suspenses, employee_incentive_slabs, addresses, ...baseUserData } = employeeData;

        let dataToInsert = { ...baseUserData };

        // Remove empty employee_code to allow DB default (auto-increment) to work
        if (!dataToInsert.employee_code || dataToInsert.employee_code.trim() === '') {
            delete dataToInsert.employee_code;
        }

        // Convert empty string UUIDs and optional fields to null
        const uuidFields = ['branch_id', 'type', 'company_id', 'category_id'];
        for (const f of uuidFields) {
            if (dataToInsert[f] === '' || dataToInsert[f] === undefined) {
                dataToInsert[f] = null;
            }
        }

        // Handle multi-branch assignment and sync branch_id
        if (dataToInsert.is_all_branches !== undefined) {
            dataToInsert.is_all_branches = Boolean(dataToInsert.is_all_branches);
        }
        if (Array.isArray(dataToInsert.branch_ids)) {
            dataToInsert.branch_ids = dataToInsert.branch_ids.filter((b: any) => typeof b === 'string' && b.trim() !== '');
            dataToInsert.branch_id = dataToInsert.branch_ids[0] || null;
        } else if (dataToInsert.branch_id) {
            dataToInsert.branch_ids = [dataToInsert.branch_id];
        } else {
            dataToInsert.branch_ids = [];
        }

        if (dataToInsert.username === '') dataToInsert.username = null;
        if (dataToInsert.date_of_birth === '') dataToInsert.date_of_birth = null;
        if (dataToInsert.date_of_joining === '') dataToInsert.date_of_joining = null;
        if (dataToInsert.relieving_date === '') dataToInsert.relieving_date = null;

        if (dataToInsert.password && dataToInsert.password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            dataToInsert.password = await bcrypt.hash(dataToInsert.password.trim(), salt);
        } else {
            delete dataToInsert.password;
        }

        const { data: user, error } = await supabase
            .from('users')
            .insert([dataToInsert])
            .select()
            .single();

        if (error) throw new Error(error.message);

        // Process nested relations
        if (user) {
            const insertRelation = async (table: string, records: any[]) => {
                if (records && records.length > 0) {
                    // Filter out completely empty records
                    const validRecords = records.filter(r => {
                        const values = Object.values(r).filter(v => v !== '' && v !== null && v !== undefined);
                        return values.length > 0;
                    });

                    if (validRecords.length > 0) {
                        const mappedRecords = validRecords.map(r => {
                            const sanitized = { ...r, employee_id: user.id };
                            delete sanitized.id;
                            delete sanitized.created_at;
                            // Convert empty strings to null for DB compatibility
                            Object.keys(sanitized).forEach(key => {
                                if (sanitized[key] === '') sanitized[key] = null;
                            });
                            return sanitized;
                        });
                        const { error } = await supabase.from(table).insert(mappedRecords);
                        if (error) {
                            throw new Error(`Failed to save ${table}: ${error.message}`);
                        }
                    }
                }
            };

            const relationTasks: Promise<any>[] = [
                insertRelation('employee_qualifications', employee_qualifications),
                insertRelation('employee_experiences', employee_experiences),
                insertRelation('employee_certificates', employee_certificates),
                insertRelation('employee_licenses', employee_licenses),
                insertRelation('employee_insurances', employee_insurances),
                insertRelation('employee_passports', employee_passports),
                insertRelation('employee_loans', employee_loans),
                insertRelation('employee_targets', employee_targets),
                insertRelation('employee_suspenses', employee_suspenses),
                insertRelation('employee_incentive_slabs', employee_incentive_slabs)
            ];

            if (addresses && addresses.length > 0) {
                const validAddresses = addresses.filter((a: any) => {
                    const vals = Object.values(a).filter(v => v !== '' && v !== null && v !== undefined);
                    return vals.length > 0;
                });
                if (validAddresses.length > 0) {
                    const mappedAddresses = validAddresses.map((a: any) => {
                        const { id, created_at, ...rest } = a;
                        return { ...rest, user_id: user.id };
                    });
                    relationTasks.push(Promise.resolve(supabase.from('addresses').insert(mappedAddresses)));
                }
            }

            await Promise.all(relationTasks);
        }

        return omitPassword(user);
    },

    // Update existing employee
    update: async (id: string, updates: any): Promise<User | null> => {
        const {
            employee_qualifications, employee_experiences, employee_certificates,
            employee_licenses, employee_insurances, employee_passports,
            employee_loans, employee_targets, employee_suspenses,
            employee_incentive_slabs, addresses, ...baseUserData
        } = updates;

        let dataToUpdate = { ...baseUserData };

        // Convert empty string UUIDs and optional fields to null
        const uuidFields = ['branch_id', 'type', 'company_id', 'category_id'];
        for (const f of uuidFields) {
            if (dataToUpdate[f] === '') {
                dataToUpdate[f] = null;
            }
        }

        // Handle multi-branch assignment and sync branch_id
        if (dataToUpdate.is_all_branches !== undefined) {
            dataToUpdate.is_all_branches = Boolean(dataToUpdate.is_all_branches);
        }
        if (Array.isArray(dataToUpdate.branch_ids)) {
            dataToUpdate.branch_ids = dataToUpdate.branch_ids.filter((b: any) => typeof b === 'string' && b.trim() !== '');
            dataToUpdate.branch_id = dataToUpdate.branch_ids[0] || null;
        } else if (dataToUpdate.branch_id !== undefined) {
            dataToUpdate.branch_ids = dataToUpdate.branch_id ? [dataToUpdate.branch_id] : [];
        }

        if (dataToUpdate.username === '') dataToUpdate.username = null;
        if (dataToUpdate.date_of_birth === '') dataToUpdate.date_of_birth = null;
        if (dataToUpdate.date_of_joining === '') dataToUpdate.date_of_joining = null;
        if (dataToUpdate.relieving_date === '') dataToUpdate.relieving_date = null;

        if (dataToUpdate.password && typeof dataToUpdate.password === 'string' && dataToUpdate.password.trim() !== '') {
            const salt = await bcrypt.genSalt(10);
            dataToUpdate.password = await bcrypt.hash(dataToUpdate.password.trim(), salt);
        } else {
            delete dataToUpdate.password;
        }

        const { data: user, error } = await supabase
            .from('users')
            .update(dataToUpdate)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);

        // Recreate relations in parallel by deleting old and inserting new
        if (user) {
            const recreateRelation = async (table: string, records: any[]) => {
                if (records !== undefined && Array.isArray(records)) {
                    await supabase.from(table).delete().eq('employee_id', user.id);

                    if (records.length > 0) {
                        const validRecords = records.filter(r => {
                            const values = Object.values(r).filter(v => v !== '' && v !== null && v !== undefined);
                            return values.length > 0;
                        });

                        if (validRecords.length > 0) {
                            const mappedRecords = validRecords.map(r => {
                                const sanitized = { ...r, employee_id: user.id };
                                delete sanitized.id;
                                delete sanitized.created_at;
                                Object.keys(sanitized).forEach(key => {
                                    if (sanitized[key] === '') sanitized[key] = null;
                                });
                                return sanitized;
                            });
                            const { error: insError } = await supabase.from(table).insert(mappedRecords);
                            if (insError) {
                                throw new Error(`Failed to update ${table}: ${insError.message}`);
                            }
                        }
                    }
                }
            };

            const tasks: Promise<any>[] = [];

            if (employee_qualifications !== undefined) tasks.push(recreateRelation('employee_qualifications', employee_qualifications));
            if (employee_experiences !== undefined) tasks.push(recreateRelation('employee_experiences', employee_experiences));
            if (employee_certificates !== undefined) tasks.push(recreateRelation('employee_certificates', employee_certificates));
            if (employee_licenses !== undefined) tasks.push(recreateRelation('employee_licenses', employee_licenses));
            if (employee_insurances !== undefined) tasks.push(recreateRelation('employee_insurances', employee_insurances));
            if (employee_passports !== undefined) tasks.push(recreateRelation('employee_passports', employee_passports));
            if (employee_loans !== undefined) tasks.push(recreateRelation('employee_loans', employee_loans));
            if (employee_targets !== undefined) tasks.push(recreateRelation('employee_targets', employee_targets));
            if (employee_suspenses !== undefined) tasks.push(recreateRelation('employee_suspenses', employee_suspenses));
            if (employee_incentive_slabs !== undefined) tasks.push(recreateRelation('employee_incentive_slabs', employee_incentive_slabs));

            if (addresses !== undefined && Array.isArray(addresses)) {
                tasks.push((async () => {
                    await supabase.from('addresses').delete().eq('user_id', user.id);
                    const validAddresses = addresses.filter((a: any) => {
                        const vals = Object.values(a).filter(v => v !== '' && v !== null && v !== undefined);
                        return vals.length > 0;
                    });
                    if (validAddresses.length > 0) {
                        const mappedAddresses = validAddresses.map((a: any) => {
                            const { id, created_at, ...rest } = a;
                            return { ...rest, user_id: user.id };
                        });
                        const { error: addrErr } = await supabase.from('addresses').insert(mappedAddresses);
                        if (addrErr) throw new Error(`Failed to update addresses: ${addrErr.message}`);
                    }
                })());
            }

            await Promise.all(tasks);
        }

        return user ? omitPassword(user) : null;
    },

    // Delete an employee (Soft Delete)
    delete: async (id: string): Promise<boolean> => {
        const { error } = await supabase.from('users').update({ is_deleted: true }).eq('id', id);
        if (error) throw new Error(error.message);
        return true;
    }
};
