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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 pl-14 lg:pl-6 backdrop-blur-xl transition-all">
      {/* Left - Greeting (Hidden on tiny screens) */}
      <div className="hidden sm:flex flex-col">
        <span className="text-xs text-muted-foreground">კეთილი იყოს თქვენი დაბრუნება</span>
        <h1 className="text-sm font-semibold text-foreground">
          გამარჯობა, {user?.fullName || 'სტუმარო'}
        </h1>
      </div>

      {/* Center - Search */}
      <div className="flex-1 max-w-md mx-auto hidden md:block px-4">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
          <Input 
            placeholder="მოძებნეთ რაც გსურთ..." 
            className="pl-9 w-full h-10 bg-input border-border text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-1 focus:ring-primary/50 rounded-lg outline-none shadow-none" 
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 select-none rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Mobile search toggle */}
      <div className="sm:hidden">
        {searchOpen ? (
          <div className="relative animate-fade-in">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ძიება..."
              className="pl-9 w-48 h-9 bg-input border-border text-foreground focus:border-primary"
              autoFocus
              onBlur={() => setSearchOpen(false)}
            />
          </div>
        ) : (
          <button onClick={() => setSearchOpen(true)} className="flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
            <Search className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <div className="flex size-10 items-center justify-center">
          <NotificationPanel />
        </div>
        
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          <span className="sr-only">თემის შეცვლა</span>
        </button>
        
        {user && (
          <Link to="/app/profile" className="ml-2 flex flex-shrink-0 items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-secondary">
            <Avatar className="size-8 border border-border">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={user.fullName} className="object-cover" />}
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                {user.fullName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-left lg:block">
              <p className="text-sm font-medium text-foreground">{user.fullName}</p>
              <p className="text-xs text-muted-foreground">{user.email || 'პროფილი'}</p>
            </div>
          </Link>
        )}
      </div>
    </header>
  );
}
