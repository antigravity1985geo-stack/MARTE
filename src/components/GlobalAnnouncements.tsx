import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Info, Megaphone, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from './ui/button';

export function GlobalAnnouncements() {
  const { isAuthenticated, user } = useAuthStore();
  const queryClient = useQueryClient();
  const [localDismissed, setLocalDismissed] = useState<string | null>(null);

  // Fetch profile to get dismissed announcement ID from DB
  const { data: profileData } = useQuery({
    queryKey: ['profile-dismissed-announcement', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('dismissed_announcement_id')
        .eq('id', user.id)
        .single();
      return data;
    },
    enabled: isAuthenticated && !!user?.id,
    staleTime: 60 * 1000 * 5,
  });

  const dismissedKey = localDismissed ?? profileData?.dismissed_announcement_id ?? null;

  // Mutation to persist dismissed ID to Supabase
  const dismissMutation = useMutation({
    mutationFn: async (announcementId: string) => {
      if (!user?.id) return;
      await supabase
        .from('profiles')
        .update({ dismissed_announcement_id: announcementId })
        .eq('id', user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-dismissed-announcement', user?.id] });
    },
  });

  const { data: announcements, isLoading } = useQuery({
    queryKey: ['global-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('global_announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Filter out expired client-side to be safe
      return data.filter(a => !a.expires_at || new Date(a.expires_at) > new Date());
    },
    enabled: isAuthenticated,
    staleTime: 60 * 1000 * 5, // 5 min
  });

  if (isLoading || !announcements || announcements.length === 0) return null;

  // Show only the latest active announcement
  const activeAnnouncement = announcements[0];

  // If user dismissed this specific announcement, hide it
  if (dismissedKey === activeAnnouncement.id) return null;

  const handleDismiss = () => {
    // Optimistic local dismiss for instant UI feedback
    setLocalDismissed(activeAnnouncement.id);
    // Persist to Supabase (cross-device sync)
    dismissMutation.mutate(activeAnnouncement.id);
  };

  const config = {
    info: { icon: Info, bg: 'bg-blue-500/10 dark:bg-blue-500/20', border: 'border-blue-500/20', text: 'text-blue-700 dark:text-blue-300', iconColor: 'text-blue-500' },
    success: { icon: CheckCircle2, bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', border: 'border-emerald-500/20', text: 'text-emerald-700 dark:text-emerald-300', iconColor: 'text-emerald-500' },
    warning: { icon: AlertCircle, bg: 'bg-amber-500/10 dark:bg-amber-500/20', border: 'border-amber-500/20', text: 'text-amber-700 dark:text-amber-300', iconColor: 'text-amber-500' },
    urgent: { icon: Megaphone, bg: 'bg-rose-500/10 dark:bg-rose-500/20', border: 'border-rose-500/20', text: 'text-rose-700 dark:text-rose-300', iconColor: 'text-rose-500' },
  }[activeAnnouncement.type as 'info' | 'success' | 'warning' | 'urgent'] || { icon: Info, bg: 'bg-primary/10', border: 'border-primary/20', text: 'text-foreground', iconColor: 'text-primary' };

  const Icon = config.icon;

  return (
    <div className={`w-full ${config.bg} ${config.border} border-b px-4 py-2.5 flex items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-2 z-50 relative`}>
      <div className="flex items-start sm:items-center gap-3">
        <Icon className={`h-5 w-5 mt-0.5 sm:mt-0 shrink-0 ${config.iconColor}`} />
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <span className={`font-semibold text-sm ${config.text}`}>
            {activeAnnouncement.title}
          </span>
          <span className="hidden sm:inline text-muted-foreground/50 text-xs">•</span>
          <span className="text-sm text-foreground/80 leading-snug">
            {activeAnnouncement.message}
          </span>
        </div>
      </div>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-7 w-7 shrink-0 -mr-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full" 
        onClick={handleDismiss}
      >
        <X className="h-4 w-4 opacity-70" />
      </Button>
    </div>
  );
}
