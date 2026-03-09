import { create } from 'zustand';

export type OrderStatus = 'pending' | 'confirmed' | 'approved' | 'shipped' | 'received' | 'cancelled';

export interface OrderItem {
  productId: string;
  productName?: string;
  name?: string;
  quantity: number;
  price: number;
  total?: number;
}

export interface PurchaseOrder {
  id: string;
  orderNumber?: string;
  supplierId: string;
  supplierName: string;
  items: OrderItem[];
  total?: number;
  totalAmount?: number;
  status: OrderStatus;
  orderDate?: string;
  date?: string;
  expectedDate?: string;
  receivedDate?: string;
  notes?: string;
  createdAt?: string;
}

interface OrderState {
  orders: PurchaseOrder[];
  purchaseOrders: PurchaseOrder[];
  addOrder: (o: PurchaseOrder | Omit<PurchaseOrder, 'id' | 'createdAt'>) => string;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  updateOrder: (id: string, data: Partial<PurchaseOrder>) => void;
  deleteOrder: (id: string) => void;
}

const genId = () => Math.random().toString(36).slice(2, 10);

const sampleOrders: PurchaseOrder[] = [
  {
    id: 'o1', orderNumber: 'PO-001', supplierId: 's1', supplierName: 'შპს ტექნოიმპორტი',
    items: [
      { productId: 'p1', productName: 'iPhone 15', name: 'iPhone 15', quantity: 20, price: 2800, total: 56000 },
      { productId: 'p2', productName: 'Samsung Galaxy S24', name: 'Samsung Galaxy S24', quantity: 15, price: 2200, total: 33000 },
    ],
    total: 89000, totalAmount: 89000, status: 'confirmed', orderDate: '2026-03-01', date: '2026-03-01', expectedDate: '2026-03-10', notes: 'სასწრაფო შეკვეთა', createdAt: '2026-03-01',
  },
  {
    id: 'o2', orderNumber: 'PO-002', supplierId: 's2', supplierName: 'შპს აგროფუდი',
    items: [
      { productId: 'p4', productName: 'სულგუნი', name: 'სულგუნი', quantity: 200, price: 12, total: 2400 },
    ],
    total: 2400, totalAmount: 2400, status: 'pending', orderDate: '2026-03-05', date: '2026-03-05', expectedDate: '2026-03-12', notes: '', createdAt: '2026-03-05',
  },
];

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: sampleOrders,
  get purchaseOrders() { return get().orders; },

  addOrder: (o: any) => {
    const id = o.id || genId();
    const order = { ...o, id, createdAt: o.createdAt || new Date().toISOString().slice(0, 10) };
    set(s => ({ orders: [...s.orders, order] }));
    return id;
  },

  updateOrderStatus: (id, status) => set(s => ({
    orders: s.orders.map(o => o.id === id ? {
      ...o, status,
      ...(status === 'received' ? { receivedDate: new Date().toISOString().slice(0, 10) } : {}),
    } : o),
  })),

  updateOrder: (id, data) => set(s => ({
    orders: s.orders.map(o => o.id === id ? { ...o, ...data } : o),
  })),

  deleteOrder: (id) => set(s => ({ orders: s.orders.filter(o => o.id !== id) })),
}));
