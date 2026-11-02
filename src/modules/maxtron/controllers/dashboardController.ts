import { Request, Response } from 'express';
import { supabase } from '../../../config/supabase';
import { StockModel } from '../models/stockModel';

export const getDashboardSummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const { companyId } = req.query;
        if (!companyId) {
            res.status(400).json({ success: false, message: 'Company ID is required' });
            return;
        }

        const cId = companyId as string;
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // Date range for 7-day charts
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        // Same date limits as before: the date part of each ISO string.
        const day = (d: Date) => d.toISOString().split('T')[0];

        // All queries in one round. Money/production totals are summed in the database
        // (dashboard_totals in migrations/perf_indexes_and_functions.sql): adding up rows
        // here was slow and stopped counting at Supabase's 1000-row cap.
        const [
            { data: totals, error: totalsError },
            { count: employeeCount },
            { count: pendingOrdersCount },
            stockSummary,
            { data: dailySales },
            { data: dailyCollections },
            { data: attendance },
            { data: recentInvoices },
            { data: recentOrders },
            { data: recentBatches }
        ] = await Promise.all([
            supabase.rpc('dashboard_totals', {
                p_company: cId,
                p_month_start: day(firstDayOfMonth),
                p_prev_start: day(firstDayOfPrevMonth),
                p_prev_end: day(lastDayOfPrevMonth)
            }),
            supabase.from('users').select('*', { count: 'exact', head: true }).eq('company_id', cId).eq('is_deleted', false),
            supabase.from('customer_orders').select('*', { count: 'exact', head: true }).eq('company_id', cId).eq('status', 'PENDING'),
            StockModel.getRMStockSummary(cId),
            supabase.from('sales_invoices').select('invoice_date, net_amount').eq('company_id', cId).gte('invoice_date', sevenDaysAgo.toISOString()),
            supabase.from('customer_collections').select('collection_date, amount').eq('company_id', cId).gte('collection_date', sevenDaysAgo.toISOString()),
            supabase.from('attendance').select('date, status').eq('company_id', cId).gte('date', sevenDaysAgo.toISOString()),
            supabase.from('sales_invoices').select('invoice_number, net_amount, invoice_date, customers(customer_name)').eq('company_id', cId).order('invoice_date', { ascending: false }).limit(5),
            supabase.from('customer_orders').select('order_number, total_amount, order_date, customers(customer_name), status').eq('company_id', cId).order('order_date', { ascending: false }).limit(5),
            supabase.from('production_batches').select('batch_number, extrusion_output_qty, date, finished_products(product_name), items:production_batch_items(finished_products(product_name))').eq('company_id', cId).order('date', { ascending: false }).limit(5)
        ]);
        if (totalsError) throw new Error(totalsError.message);

        // Calculation Logic
        const t = (key: string) => Number((totals as any)?.[key] || 0);
        const totalSales = t('cur_sales');
        const prevMonthSales = t('prev_sales');
        const salesTrend = prevMonthSales === 0 ? 100 : (((totalSales - prevMonthSales) / prevMonthSales) * 100);

        const totalProduction = t('cur_production');
        const prevMonthProduction = t('prev_production');
        const productionTrend = prevMonthProduction === 0 ? 0 : (((totalProduction - prevMonthProduction) / prevMonthProduction) * 100);

        const totalCollections = t('collections');
        const totalPayments = t('payments');
        const totalExpenses = t('expenses');
        const cashInHand = totalCollections - (totalPayments + totalExpenses);

        const collectionEfficiency = totalSales === 0 ? 0 : (totalCollections / totalSales) * 100;

        // Initialize last 7 days for charts
        const chartDataMap = new Map<string, any>();
        const attendanceMap = new Map<string, any>();

        const toDateStr = (date: Date) => {
            return date.getFullYear() + '-' +
                String(date.getMonth() + 1).padStart(2, '0') + '-' +
                String(date.getDate()).padStart(2, '0');
        };

        for (let i = 0; i < 7; i++) {
            const d = new Date(sevenDaysAgo);
            d.setDate(d.getDate() + i);
            const dStr = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
            const sortKey = toDateStr(d);

            chartDataMap.set(sortKey, { date: dStr, sortKey, sales: 0, income: 0 });
            attendanceMap.set(sortKey, { date: dStr, sortKey, present: 0, absent: 0 });
        }

        [...(dailySales || []), ...(dailyCollections || [])].forEach(item => {
            const dateVal = (item as any).invoice_date || (item as any).collection_date;
            const sortKey = typeof dateVal === 'string' ? dateVal.split('T')[0] : toDateStr(new Date(dateVal));

            if (chartDataMap.has(sortKey)) {
                const entry = chartDataMap.get(sortKey);
                if ((item as any).net_amount) entry.sales += Number((item as any).net_amount);
                if ((item as any).amount) entry.income += Number((item as any).amount);
            }
        });

        (attendance || []).forEach(att => {
            const sortKey = typeof att.date === 'string' ? att.date.split('T')[0] : toDateStr(new Date(att.date));
            if (attendanceMap.has(sortKey)) {
                const entry = attendanceMap.get(sortKey);
                if (['PRESENT', 'LATE', 'HALF_DAY'].includes(att.status)) entry.present++;
                else if (att.status === 'ABSENT') entry.absent++;
            }
        });

        const chartData = Array.from(chartDataMap.values()).sort((a: any, b: any) => a.sortKey.localeCompare(b.sortKey));
        const attendanceChartData = Array.from(attendanceMap.values()).sort((a: any, b: any) => a.sortKey.localeCompare(b.sortKey));

        const todayStr = toDateStr(new Date());
        const presentToday = attendanceMap.get(todayStr)?.present || 0;

        const lowStock = (stockSummary || []).filter(s => s.balance < 100).map(s => ({
            name: s.rm_name,
            balance: s.balance,
            unit: s.unit_type
        }));

        res.status(200).json({
            success: true,
            data: {
                stats: {
                    totalSales,
                    totalProduction,
                    employeeCount,
                    presentToday,
                    pendingOrdersCount,
                    cashInHand,
                    collectionEfficiency,
                    salesTrend,
                    productionTrend
                },
                recentActivity: {
                    invoices: recentInvoices,
                    orders: recentOrders,
                    production: recentBatches
                },
                alerts: lowStock,
                chartData,
                attendanceChartData
            }
        });

    } catch (error: any) {
        res.status(500).json({ success: false, message: 'Failed to fetch dashboard data', error: error.message });
    }
};
