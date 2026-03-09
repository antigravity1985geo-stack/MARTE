import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { create } from 'zustand';
import { useActivityLog } from '@/hooks/useActivityLog';

// Local state for active cashier (session-only, no persistence needed)
interface ActiveCashierState {
  activeCashier: { id: string; full_name: string } | null;
  setActiveCashier: (cashier: { id: string; full_name: string } | null) => void;
}

export const useActiveCashier = create<ActiveCashierState>((set) => ({
  activeCashier: null,
  setActiveCashier: (cashier) => set({ activeCashier: cashier }),
}));

export interface DbShift {
  id: string;
  user_id: string;
  cashier_id: string | null;
  cashier_name: string;
  opened_at: string;
  closed_at: string | null;
  opening_cash: number;
  closing_cash: number | null;
  is_open: boolean;
  created_at: string;
}

export interface DbShiftSale {
  id: string;
  shift_id: string;
  transaction_id: string | null;
  total: number;
  payment_type: string;
  cash_amount: number;
  card_amount: number;
  client_name: string | null;
  cashier_name: string;
  fiscal_number: string | null;
  waybill_number: string | null;
  is_refunded: boolean;
  refund_date: string | null;
  created_at: string;
  items?: { product_name: string; quantity: number; price: number; total: number }[];
}

export function useShifts() {
  const queryClient = useQueryClient();
  const { log } = useActivityLog();

  // Current open shift
  const currentShiftQuery = useQuery({
    queryKey: ['shifts', 'current'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('is_open', true)
        .maybeSingle();
      if (error) throw error;
      return data as DbShift | null;
    },
  });

  // Shift history
  const historyQuery = useQuery({
    queryKey: ['shifts', 'history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('is_open', false)
        .order('closed_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as DbShift[];
    },
  });

  // Sales for current shift
  const currentShiftSalesQuery = useQuery({
    queryKey: ['shift_sales', currentShiftQuery.data?.id],
    enabled: !!currentShiftQuery.data?.id,
    queryFn: async () => {
      const shiftId = currentShiftQuery.data!.id;
      const { data, error } = await supabase
        .from('shift_sales')
        .select('*, shift_sale_items(*)')
        .eq('shift_id', shiftId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((s: any) => ({
        ...s,
        items: (s.shift_sale_items || []).map((i: any) => ({
          product_name: i.product_name,
          quantity: i.quantity,
          price: i.price,
          total: i.total,
        })),
      })) as DbShiftSale[];
    },
  });

  const openShift = useMutation({
    mutationFn: async ({ cashierId, cashierName, openingCash }: { cashierId: string; cashierName: string; openingCash: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('არ ხართ ავტორიზებული');
      const { data, error } = await supabase
        .from('shifts')
        .insert({
          user_id: user.id,
          cashier_id: cashierId,
          cashier_name: cashierName,
          opening_cash: openingCash,
          is_open: true,
        })
        .select()
        .single();
      if (error) throw error;
      return data as DbShift;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      log({ action: 'open_shift', entityType: 'shift', entityId: data?.id, entityName: data?.cashier_name });
    },
  });

  const closeShift = useMutation({
    mutationFn: async (closingCash: number) => {
      const shift = currentShiftQuery.data;
      if (!shift) throw new Error('ცვლა არ არის გახსნილი');
      const { error } = await supabase
        .from('shifts')
        .update({ is_open: false, closed_at: new Date().toISOString(), closing_cash: closingCash })
        .eq('id', shift.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['shift_sales'] });
      log({ action: 'close_shift', entityType: 'shift' });
    },
  });

  const addSaleToShift = useMutation({
    mutationFn: async (sale: {
      transactionId?: string;
      total: number;
      paymentType: string;
      cashAmount: number;
      cardAmount: number;
      clientName?: string;
      cashierName: string;
      fiscalNumber?: string | null;
      waybillNumber?: string | null;
      items: { productName: string; quantity: number; price: number; total: number }[];
    }) => {
      const shift = currentShiftQuery.data;
      if (!shift) throw new Error('ცვლა არ არის გახსნილი');

      const { data, error } = await supabase
        .from('shift_sales')
        .insert({
          shift_id: shift.id,
          transaction_id: sale.transactionId || null,
          total: sale.total,
          payment_type: sale.paymentType,
          cash_amount: sale.cashAmount,
          card_amount: sale.cardAmount,
          client_name: sale.clientName || null,
          cashier_name: sale.cashierName,
          fiscal_number: sale.fiscalNumber || null,
          waybill_number: sale.waybillNumber || null,
        })
        .select()
        .single();
      if (error) throw error;

      if (sale.items.length > 0) {
        const { error: itemsError } = await supabase
          .from('shift_sale_items')
          .insert(sale.items.map((i) => ({
            shift_sale_id: data.id,
            product_name: i.productName,
            quantity: i.quantity,
            price: i.price,
            total: i.total,
          })));
        if (itemsError) throw itemsError;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['shift_sales'] });
      log({ action: 'sale', entityType: 'transaction', entityId: data?.id });
    },
  });

  const refundSale = useMutation({
    mutationFn: async (saleId: string) => {
      const { data, error } = await supabase
        .from('shift_sales')
        .update({ is_refunded: true, refund_date: new Date().toISOString().slice(0, 10) })
        .eq('id', saleId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_data, saleId) => {
      queryClient.invalidateQueries({ queryKey: ['shift_sales'] });
      log({ action: 'refund', entityType: 'transaction', entityId: saleId });
    },
  });

  // Adapter: make currentShift look like the old Zustand interface for backward compat
  const currentShift = currentShiftQuery.data
    ? {
        id: currentShiftQuery.data.id,
        cashierId: currentShiftQuery.data.cashier_id || '',
        cashierName: currentShiftQuery.data.cashier_name,
        openedAt: currentShiftQuery.data.opened_at,
        closedAt: currentShiftQuery.data.closed_at || undefined,
        openingCash: currentShiftQuery.data.opening_cash,
        closingCash: currentShiftQuery.data.closing_cash ?? undefined,
        isOpen: currentShiftQuery.data.is_open,
        sales: (currentShiftSalesQuery.data || []).map((s) => ({
          id: s.id,
          items: (s.items || []).map((i) => ({
            productName: i.product_name,
            quantity: i.quantity,
            price: i.price,
            total: i.total,
          })),
          total: s.total,
          paymentType: s.payment_type as 'cash' | 'card' | 'mixed',
          cashAmount: s.cash_amount,
          cardAmount: s.card_amount,
          clientName: s.client_name || undefined,
          cashierName: s.cashier_name,
          date: new Date(s.created_at).toISOString().slice(0, 10),
          time: new Date(s.created_at).toLocaleTimeString('ka-GE'),
          fiscalNumber: s.fiscal_number,
          waybillNumber: s.waybill_number,
          isRefunded: s.is_refunded,
          refundDate: s.refund_date || undefined,
        })),
      }
    : null;

  return {
    currentShift,
    shiftHistory: (historyQuery.data || []).map((s) => ({
      id: s.id,
      cashierId: s.cashier_id || '',
      cashierName: s.cashier_name,
      openedAt: s.opened_at,
      closedAt: s.closed_at || undefined,
      openingCash: s.opening_cash,
      closingCash: s.closing_cash ?? undefined,
      isOpen: s.is_open,
      sales: [],
    })),
    isLoading: currentShiftQuery.isLoading,
    openShift,
    closeShift,
    addSaleToShift,
    refundSale,
  };
}
