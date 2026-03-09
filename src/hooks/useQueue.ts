import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { create } from 'zustand';

// Session-only state for queue active toggle
interface QueueActiveState {
  isActive: boolean;
  activateQueue: () => void;
  deactivateQueue: () => void;
}
export const useQueueActive = create<QueueActiveState>((set) => ({
  isActive: false,
  activateQueue: () => set({ isActive: true }),
  deactivateQueue: () => set({ isActive: false }),
}));

export interface QueueTicket {
  id: string;
  number: number;
  status: 'waiting' | 'serving' | 'completed';
  counter: string;
  notes: string;
  created_at: string;
  called_at: string | null;
  completed_at: string | null;
}

export function useQueue() {
  const queryClient = useQueryClient();

  const ticketsQuery = useQuery({
    queryKey: ['queue_tickets'],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase.from('queue_tickets')
        .select('*')
        .gte('created_at', `${today}T00:00:00`)
        .order('number', { ascending: true });
      if (error) throw error;
      return (data || []) as QueueTicket[];
    },
    refetchInterval: 5000,
  });

  const tickets = ticketsQuery.data || [];

  const generateTicket = useMutation({
    mutationFn: async (notes?: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('არ ხართ ავტორიზებული');
      const maxNum = tickets.reduce((max, t) => Math.max(max, t.number), 0);
      const { data, error } = await supabase.from('queue_tickets')
        .insert({ user_id: user.id, number: maxNum + 1, status: 'waiting', notes: notes || '' })
        .select().single();
      if (error) throw error;
      return data as QueueTicket;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queue_tickets'] }),
  });

  const callNext = useMutation({
    mutationFn: async (counter?: string) => {
      const next = tickets.find(t => t.status === 'waiting');
      if (!next) return null;
      const { data, error } = await supabase.from('queue_tickets')
        .update({ status: 'serving', called_at: new Date().toISOString(), counter: counter || '' })
        .eq('id', next.id).select().single();
      if (error) throw error;
      return data as QueueTicket;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queue_tickets'] }),
  });

  const completeTicket = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('queue_tickets')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queue_tickets'] }),
  });

  const skipTicket = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('queue_tickets')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queue_tickets'] }),
  });

  const resetQueue = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('არ ხართ ავტორიზებული');
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from('queue_tickets')
        .delete()
        .eq('user_id', user.id)
        .gte('created_at', `${today}T00:00:00`);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['queue_tickets'] }),
  });

  return {
    tickets,
    isLoading: ticketsQuery.isLoading,
    generateTicket,
    callNext,
    completeTicket,
    skipTicket,
    resetQueue,
    getWaitingCount: () => tickets.filter(t => t.status === 'waiting').length,
    getCurrentServing: () => tickets.filter(t => t.status === 'serving'),
  };
}
