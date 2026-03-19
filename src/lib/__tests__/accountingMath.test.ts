import { describe, it, expect } from 'vitest';
import { calculateTrialBalance, calculateProfitLoss } from '../accountingMath';
import type { Account } from '@/hooks/useAccounting';

describe('Accounting Math', () => {
    const mockAccounts: Account[] = [
        // Assets (Normal Debit Balance -> Positive)
        { id: '1', code: '2310', name: 'Cash', type: 'asset', parent_code: null, is_system: true, balance: 5000 },
        // Liabilities (Normal Credit Balance -> Positive or Negative depending on system, but usually negative in standard trial balance)
        { id: '3', code: '3100', name: 'Payables', type: 'liability', parent_code: null, is_system: true, balance: 2000 },
        // Equity (Normal Credit Balance -> Negative)
        { id: '4', code: '4000', name: 'Capital', type: 'equity', parent_code: null, is_system: true, balance: 1000 },
        // Revenue (Normal Credit Balance -> Negative)
        { id: '5', code: '4100', name: 'Sales', type: 'revenue', parent_code: null, is_system: true, balance: 3000 },
        // COGS (Normal Debit Balance -> Positive)
        { id: '6', code: '5100', name: 'COGS', type: 'expense', parent_code: null, is_system: true, balance: 800 },
        // Operating Expense (Normal Debit Balance -> Positive)
        { id: '7', code: '6100', name: 'Rent', type: 'expense', parent_code: null, is_system: true, balance: 200 },
    ];

    it('should calculate Trial Balance correctly', () => {
        const tb = calculateTrialBalance(mockAccounts);
        
        // Cash: Asset with 5000 balance -> Debit 5000
        expect(tb.find(a => a.code === '2310')).toEqual({
            code: '2310', name: 'Cash', debit: 5000, credit: 0
        });

        // Payables: Liability with -2000 balance -> Credit 2000
        expect(tb.find(a => a.code === '3100')).toEqual({
            code: '3100', name: 'Payables', debit: 0, credit: 2000
        });

        // Sales: Revenue with -3000 balance -> Credit 3000
        expect(tb.find(a => a.code === '4100')).toEqual({
            code: '4100', name: 'Sales', debit: 0, credit: 3000
        });
    });

    it('should calculate Profit and Loss correctly', () => {
        const pl = calculateProfitLoss(mockAccounts);

        expect(pl.revenue).toBe(3000); // 4100 Sales
        expect(pl.cogsTotal).toBe(800);  // 5100 COGS
        expect(pl.operatingExpenses).toBe(200); // 6100 Rent
        expect(pl.totalExpenses).toBe(1000); // 800 + 200

        // Gross Profit = 3000 - 800 = 2200
        expect(pl.grossProfit).toBe(2200);

        // Net Income = Gross Profit - Operating Exp = 2200 - 200 = 2000
        expect(pl.netIncome).toBe(2000);

        // Gross Margin = (2200 / 3000) * 100 = 73.333...
        expect(pl.grossMargin).toBeCloseTo(73.33, 2);

        // Net Margin = (2000 / 3000) * 100 = 66.666...
        expect(pl.netMargin).toBeCloseTo(66.67, 2);
    });
});
