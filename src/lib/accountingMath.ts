import type { Account } from '@/hooks/useAccounting';

export function calculateTrialBalance(accounts: Account[]) {
    return accounts.map((a) => ({
        code: a.code,
        name: a.name,
        debit: ['asset', 'expense'].includes(a.type) ? Math.max(0, a.balance) : Math.max(0, -a.balance),
        credit: ['liability', 'equity', 'revenue'].includes(a.type) ? Math.max(0, a.balance) : Math.max(0, -a.balance),
    }));
}

export function calculateProfitLoss(accounts: Account[]) {
    const revenueAccounts = accounts.filter((a) => a.type === 'revenue');
    const expenseAccounts = accounts.filter((a) => a.type === 'expense');

    const revenue = revenueAccounts.reduce((s, a) => s + Math.abs(a.balance), 0);
    
    // Define COGS (Cost of Goods Sold) as 5100, 7100, 7110
    const cogsAccounts = expenseAccounts.filter((a) => ['5100', '7100', '7110'].includes(a.code));
    const cogsTotal = cogsAccounts.reduce((s, a) => s + Math.abs(a.balance), 0);

    // Operating Expenses are all other expenses
    const operatingAccounts = expenseAccounts.filter((a) => !['5100', '7100', '7110'].includes(a.code));
    const operatingExpenses = operatingAccounts.reduce((s, a) => s + Math.abs(a.balance), 0);

    const grossProfit = revenue - cogsTotal;
    const totalExpenses = cogsTotal + operatingExpenses;
    const netIncome = grossProfit - operatingExpenses;

    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const netMargin = revenue > 0 ? (netIncome / revenue) * 100 : 0;

    return { 
        revenue, 
        cogsTotal, 
        grossProfit, 
        operatingExpenses, 
        totalExpenses, 
        netIncome,
        grossMargin,
        netMargin,
        breakdown: {
            revenue: revenueAccounts,
            cogs: cogsAccounts,
            operating: operatingAccounts
        }
    };
}
