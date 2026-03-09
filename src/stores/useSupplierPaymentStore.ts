import { create } from 'zustand';

export interface SupplierPayment {
  id: string;
  supplierId: string;
  supplierName: string;
  amount: number;
  type?: 'payment' | 'debt';
  method: 'cash' | 'transfer' | 'card';
  description?: string;
  note?: string;
  date: string;
  referenceNumber?: string;
}

export interface SupplierBalance {
  supplierId: string;
  supplierName: string;
  totalDebt: number;
  totalPaid: number;
  balance: number;
}

interface SupplierPaymentState {
  payments: SupplierPayment[];

  addPayment: (payment: Omit<SupplierPayment, 'id'> | SupplierPayment) => void;
  addDebt: (debt: Omit<SupplierPayment, 'id' | 'type'>) => void;
  deletePayment: (id: string) => void;
  getBalance: (supplierId: string, totalReceived?: number) => number;
  getSupplierBalance: (supplierId: string) => SupplierBalance;
  getAllBalances: () => SupplierBalance[];
  getPaymentHistory: (supplierId: string) => SupplierPayment[];
}

export const useSupplierPaymentStore = create<SupplierPaymentState>((set, get) => ({
  payments: [
    { id: '1', supplierId: 's1', supplierName: 'შპს ტექნოიმპორტი', amount: 5000, type: 'debt', method: 'transfer', description: 'ელექტრონიკის შესყიდვა - ინვოისი #001', date: '2024-01-15' },
    { id: '2', supplierId: 's1', supplierName: 'შპს ტექნოიმპორტი', amount: 3000, type: 'payment', method: 'transfer', description: 'ნაწილობრივი გადახდა', date: '2024-01-20', referenceNumber: 'TR-2024-001' },
    { id: '3', supplierId: 's2', supplierName: 'შპს აგროფუდი', amount: 2500, type: 'debt', method: 'cash', description: 'სურსათის მიღება - ზედნადები #045', date: '2024-02-01' },
    { id: '4', supplierId: 's2', supplierName: 'შპს აგროფუდი', amount: 2500, type: 'payment', method: 'cash', description: 'სრული გადახდა', date: '2024-02-05' },
  ],

  addPayment: (payment: any) => set(state => ({
    payments: [...state.payments, { ...payment, id: payment.id || Date.now().toString(), type: payment.type || 'payment' }],
  })),

  addDebt: (debt) => set(state => ({
    payments: [...state.payments, { ...debt, id: Date.now().toString(), type: 'debt' }],
  })),

  deletePayment: (id) => set(state => ({
    payments: state.payments.filter(p => p.id !== id),
  })),

  getBalance: (supplierId, totalReceived) => {
    const paid = get().payments.filter(p => p.supplierId === supplierId && p.type === 'payment').reduce((s, p) => s + p.amount, 0);
    if (totalReceived !== undefined) return totalReceived - paid;
    const debt = get().payments.filter(p => p.supplierId === supplierId && p.type === 'debt').reduce((s, p) => s + p.amount, 0);
    return debt - paid;
  },

  getSupplierBalance: (supplierId) => {
    const { payments } = get();
    const supplierPayments = payments.filter(p => p.supplierId === supplierId);
    const totalDebt = supplierPayments.filter(p => p.type === 'debt').reduce((s, p) => s + p.amount, 0);
    const totalPaid = supplierPayments.filter(p => p.type === 'payment').reduce((s, p) => s + p.amount, 0);
    const name = supplierPayments[0]?.supplierName || '';
    return { supplierId, supplierName: name, totalDebt, totalPaid, balance: totalDebt - totalPaid };
  },

  getAllBalances: () => {
    const { payments } = get();
    const supplierIds = [...new Set(payments.map(p => p.supplierId))];
    return supplierIds.map(id => get().getSupplierBalance(id));
  },

  getPaymentHistory: (supplierId) => {
    return get().payments.filter(p => p.supplierId === supplierId).sort((a, b) => b.date.localeCompare(a.date));
  },
}));
