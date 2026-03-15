import { Bell } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export function NotificationPanel() {
  const { notifications, markRead, markAllRead, unreadCount } = useNotifications();
  const unread = unreadCount();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground font-bold">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b p-3">
          <h4 className="font-semibold">შეტყობინებები</h4>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={() => markAllRead.mutate()} className="text-xs">
              ყველას წაკითხვა
            </Button>
          )}
        </div>
        <ScrollArea className="h-64">
          {notifications.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">შეტყობინებები არ არის</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`border-b p-3 cursor-pointer transition-colors hover:bg-muted/50 ${!n.read ? 'bg-primary/5' : ''}`}
                onClick={() => markRead.mutate(n.id)}
              >
                <div className="flex items-start gap-2">
                  <Badge variant={n.type === 'warning' ? 'destructive' : n.type === 'success' ? 'default' : 'secondary'} className="text-[10px] mt-0.5">
                    {n.type === 'warning' ? '⚠️' : n.type === 'success' ? '✅' : 'ℹ️'}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
