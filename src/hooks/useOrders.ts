import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';

export type OrderStatus = 'pending' | 'confirmed' | 'approved' | 'shipped' | 'received' | 'cancelled';

export interface OrderItem {
  id?: string;
  purchase_order_id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier_id: string;
  supplier_name: string;
  items: OrderItem[];
  total_amount: number;
  status: OrderStatus;
  order_date: string;
  expected_date: string;
  received_date?: string;
  notes?: string;
  created_at?: string;
}

export function useOrders() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const query = useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          purchase_order_items (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map((po: any) => ({
        ...po,
        items: po.purchase_order_items || []
      })) as PurchaseOrder[];
    },
    enabled: !!user,
  });

  const addOrder = useMutation({
    mutationFn: async (orderData: Omit<PurchaseOrder, 'id' | 'created_at'>) => {
      const { items, ...orderInfo } = orderData;
      
      // Select max order_number from existing or generate
      const newOrderNum = orderInfo.order_number || `PO-${Date.now()}`;
      
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .insert({ 
          user_id: user?.id,
          order_number: newOrderNum,
          supplier_id: orderInfo.supplier_id,
          supplier_name: orderInfo.supplier_name,
          total_amount: orderInfo.total_amount,
          status: orderInfo.status || 'pending',
          order_date: orderInfo.order_date,
          expected_date: orderInfo.expected_date,
          notes: orderInfo.notes
        })
        .select()
        .single();
        
      if (poError) throw poError;

      if (items && items.length > 0) {
        const itemsToInsert = items.map(item => ({
          purchase_order_id: po.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          price: item.price,
          total: item.total
        }));
        
        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .insert(itemsToInsert);
          
        if (itemsError) throw itemsError;
      }
      
      return po.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const updateOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const updateData: any = { status };
      if (status === 'received') {
        updateData.received_date = new Date().toISOString().split('T')[0];
      }
      
      const { error } = await supabase
        .from('purchase_orders')
        .update(updateData)
        .eq('id', id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const updateOrder = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PurchaseOrder> }) => {
      const { items, ...orderInfo } = data;
      const { error } = await supabase
        .from('purchase_orders')
        .update(orderInfo)
        .eq('id', id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const deleteOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('purchase_orders')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  return {
    orders: query.data || [],
    purchaseOrders: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    addOrder,
    updateOrderStatus,
    updateOrder,
    deleteOrder,
  };
}
