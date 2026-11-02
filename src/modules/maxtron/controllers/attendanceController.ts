import { Request, Response } from 'express';
import { AttendanceModel } from '../models/attendanceModel';

export const getAllAttendance = async (req: Request, res: Response): Promise<void> => {
    try {
        const { company_id } = req.query;
        const attendance = await AttendanceModel.getAll(company_id as string);
        res.status(200).json({ success: true, count: attendance.length, data: attendance });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch attendance', error: error.message });
    }
};

export const getAttendanceByDate = async (req: Request, res: Response): Promise<void> => {
    try {
        const { date } = req.params;
        const { company_id } = req.query;
        const attendance = await AttendanceModel.getByDate(date as string, company_id as string);
        res.status(200).json({ success: true, count: attendance.length, data: attendance });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch attendance for date', error: error.message });
    }
};

export const createAttendance = async (req: Request, res: Response): Promise<void> => {
    try {
        const { employee_id, date, shift, status, clock_in, clock_out, remarks, company_id } = req.body;
        if (!employee_id || !date) {
            res.status(400).json({ success: false, message: 'Employee ID and Date are required' });
            return;
        }

        const cleanDate = date.split('T')[0];
        const exists = await AttendanceModel.isDuplicate(employee_id, cleanDate);
        if (exists) {
            res.status(400).json({ success: false, message: 'Attendance already marked for this employee on this date' });
            return;
        }

        const sanitizedShift = (shift && ['DAY', 'NIGHT'].includes(shift.toUpperCase())) ? shift.toUpperCase() : 'DAY';
        const isAbsent = status === 'ABSENT';

        const payload: any = {
            employee_id,
            date: cleanDate,
            shift: sanitizedShift,
            status: status || 'PRESENT',
            clock_in: (!isAbsent && clock_in && clock_in.trim() !== '') ? clock_in : null,
            clock_out: (!isAbsent && clock_out && clock_out.trim() !== '') ? clock_out : null,
            remarks: remarks || null
        };

        if (company_id && company_id.trim() !== '') {
            payload.company_id = company_id;
        }

        const newEntry = await AttendanceModel.create(payload);
        res.status(201).json({ success: true, data: newEntry, message: 'Attendance marked successfully' });
    } catch (error: any) {
        console.error('Error creating attendance entry:', error);
        res.status(500).json({ success: false, message: 'Failed to create attendance entry', error: error.message });
    }
};

export const createBulkAttendance = async (req: Request, res: Response): Promise<void> => {
    try {
        const { attendanceList } = req.body;
        if (!attendanceList || !Array.isArray(attendanceList) || attendanceList.length === 0) {
            res.status(400).json({ success: false, message: 'Attendance list is empty' });
            return;
        }

        const filteredList = [];
        const seenInBatch = new Set<string>();

        const valid = attendanceList.filter((e: any) => e.employee_id && e.date);
        const alreadyMarked = await AttendanceModel.existingKeys(
            valid.map((e: any) => e.employee_id),
            valid.map((e: any) => e.date.split('T')[0])
        );

        for (const entry of attendanceList) {
            if (!entry.employee_id || !entry.date) continue;

            const cleanDate = entry.date.split('T')[0];
            const batchKey = `${entry.employee_id}_${cleanDate}`;

            if (seenInBatch.has(batchKey)) continue;
            seenInBatch.add(batchKey);

            if (!alreadyMarked.has(batchKey)) {
                const isAbsent = entry.status === 'ABSENT';
                const sanitizedShift = (entry.shift && ['DAY', 'NIGHT'].includes(entry.shift.toUpperCase())) 
                    ? entry.shift.toUpperCase() 
                    : 'DAY';

                const sanitizedEntry: any = {
                    employee_id: entry.employee_id,
                    date: cleanDate,
                    shift: sanitizedShift,
                    status: entry.status || 'PRESENT',
                    clock_in: (!isAbsent && entry.clock_in && entry.clock_in.trim() !== '') ? entry.clock_in : null,
                    clock_out: (!isAbsent && entry.clock_out && entry.clock_out.trim() !== '') ? entry.clock_out : null,
                    remarks: entry.remarks || null
                };

                if (entry.company_id && entry.company_id.trim() !== '') {
                    sanitizedEntry.company_id = entry.company_id;
                }

                filteredList.push(sanitizedEntry);
            }
        }

        if (filteredList.length === 0) {
            res.status(400).json({ success: false, message: 'All attendance records in the list are already marked for target date' });
            return;
        }

        const result = await AttendanceModel.createBulk(filteredList);
        const skipped = attendanceList.length - filteredList.length;
        res.status(201).json({ 
            success: true, 
            count: result.length, 
            data: result, 
            message: skipped > 0 
                ? `Marked ${result.length} records (${skipped} duplicates skipped)` 
                : `Bulk attendance marked successfully for ${result.length} staff members`
        });
    } catch (error: any) {
        console.error('Error in bulk attendance:', error);
        res.status(500).json({ success: false, message: 'Failed to mark bulk attendance', error: error.message });
    }
};

export const getAttendanceByRange = async (req: Request, res: Response): Promise<void> => {
    try {
        const { start_date, end_date, company_id } = req.query;
        if (!start_date || !end_date) {
            res.status(400).json({ success: false, message: 'Start and end dates are required' });
            return;
        }
        const attendance = await AttendanceModel.getByDateRange(start_date as string, end_date as string, company_id as string);
        
        // Deduplicate same-day entries for the same employee
        const seen = new Set<string>();
        const uniqueAttendance = attendance.filter((item: any) => {
            const cleanDate = item.date ? item.date.split('T')[0] : '';
            const key = `${item.employee_id}_${cleanDate}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });

        res.status(200).json({ success: true, count: uniqueAttendance.length, data: uniqueAttendance });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch attendance summary', error: error.message });
    }
};

export const updateAttendance = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { shift, status, clock_in, clock_out, remarks, date } = req.body;
        const isAbsent = status === 'ABSENT';

        const payload: any = {
            ...req.body,
            clock_in: (!isAbsent && clock_in && clock_in.trim() !== '') ? clock_in : null,
            clock_out: (!isAbsent && clock_out && clock_out.trim() !== '') ? clock_out : null,
            remarks: remarks || null
        };

        if (date) {
            payload.date = date.split('T')[0];
        }

        if (shift) {
            payload.shift = (['DAY', 'NIGHT'].includes(shift.toUpperCase())) ? shift.toUpperCase() : 'DAY';
        }

        const updatedEntry = await AttendanceModel.update(id as string, payload);
        if (!updatedEntry) {
            res.status(404).json({ success: false, message: 'Attendance record not found' });
            return;
        }
        res.status(200).json({ success: true, data: updatedEntry, message: 'Attendance record updated successfully' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to update attendance record', error: error.message });
    }
};

export const deleteAttendance = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const deleted = await AttendanceModel.delete(id as string);
        if (!deleted) {
            res.status(404).json({ success: false, message: 'Attendance record not found' });
            return;
        }
        res.status(200).json({ success: true, message: 'Attendance record deleted' });
    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to delete attendance record', error: error.message });
    }
};
