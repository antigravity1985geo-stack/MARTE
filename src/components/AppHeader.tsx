import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Sun, Moon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { NotificationPanel } from '@/components/NotificationPanel';
import { useAuthStore } from '@/stores/useAuthStore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTheme } from 'next-themes';
import { supabase } from '@/integrations/supabase/client';

export function AppHeader() {
  const user = useAuthStore((s) => s.user);
  const { theme, setTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    if (!user) return;
    // Try localStorage first, then DB
    const local = localStorage.getItem(`avatar_${user.id}`);
    if (local) { setAvatarUrl(local); return; }
    supabase.from('profiles').select('avatar_url').eq('id', user.id).single().then(({ data }) => {
      if ((data as any)?.avatar_url) setAvatarUrl((data as any).avatar_url);
    });
  }, [user]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-card/80 backdrop-blur-xl px-4 pl-14 lg:pl-6 transition-all">
      {/* Desktop search */}
      <div className="hidden sm:block">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input placeholder="ძიება..." className="pl-9 w-64 h-9 bg-muted/50 transition-all focus:w-80 focus:bg-card" />
        </div>
      </div>

      {/* Mobile search toggle */}
      <div className="sm:hidden">
        {searchOpen ? (
          <div className="relative animate-fade-in">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ძიება..."
              className="pl-9 w-48 h-9 bg-muted/50"
              autoFocus
              onBlur={() => setSearchOpen(false)}
            />
          </div>
        ) : (
          <Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)} className="h-9 w-9">
            <Search className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
        <NotificationPanel />
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 transition-all hover:rotate-12"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </Button>
        {user && (
          <Link to="/app/profile" className="flex items-center gap-2 ml-1 hover:opacity-80 transition-opacity">
            <Avatar className="h-8 w-8 ring-2 ring-primary/10 transition-all hover:ring-primary/30">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={user.fullName} className="object-cover" />}
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {user.fullName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium hidden md:block">{user.fullName}</span>
          </Link>
        )}
      </div>
    </header>
  );
}
