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
    // Always fetch from DB — single source of truth (no localStorage fallback)
    supabase.from('profiles').select('avatar_url').eq('id', user.id).single().then(({ data }) => {
      if ((data as any)?.avatar_url) setAvatarUrl((data as any).avatar_url);
    });
  }, [user]);

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/60 backdrop-blur-xl px-4 pl-14 lg:pl-6 transition-all shadow-sm">
      {/* Desktop search */}
      <div className="hidden sm:block">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input 
            placeholder="ძიება..." 
            className="pl-9 w-64 h-9 bg-muted/20 border-border text-foreground placeholder:text-muted-foreground transition-all focus:w-80 focus:bg-muted/40 focus:border-primary/50 rounded-lg outline-none ring-0 shadow-none" 
          />
        </div>
      </div>

      {/* Mobile search toggle */}
      <div className="sm:hidden">
        {searchOpen ? (
          <div className="relative animate-fade-in">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ძიება..."
              className="pl-9 w-48 h-9 bg-muted/20 border-border text-foreground"
              autoFocus
              onBlur={() => setSearchOpen(false)}
            />
          </div>
        ) : (
          <button onClick={() => setSearchOpen(true)} className="h-9 w-9 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
            <Search className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <NotificationPanel />
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-accent transition-all hover:rotate-12"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        {user && (
          <Link to="/app/profile" className="flex items-center gap-3 ml-2 pl-2 border-l border-border hover:opacity-80 transition-opacity">
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-foreground leading-tight">{user.fullName}</p>
              <p className="text-[10px] text-muted-foreground font-medium">პროფილი</p>
            </div>
            <Avatar className="h-8 w-8 ring-2 ring-primary/20 transition-all hover:ring-primary/40">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={user.fullName} className="object-cover" />}
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {user.fullName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
        )}
      </div>
    </header>
  );
}
