import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Info, Megaphone, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';
import { Button } from './ui/button';

export function GlobalAnnouncements() {
  const { isAuthenticated } = useAuthStore();
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);

  // Load dismissed ID from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('marte_dismissed_announcement');
    if (saved) setDismissedKey(saved);
  }, []);

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
    localStorage.setItem('marte_dismissed_announcement', activeAnnouncement.id);
    setDismissedKey(activeAnnouncement.id);
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
