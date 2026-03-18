import { Outlet, useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { usePortal } from "@/hooks/usePortal";
import { Loader2, Calendar, Clock, User, Home } from "lucide-react";
import { useEffect } from "react";

export const PortalLayout = () => {
  const { tenant_slug } = useParams();
  const { data: tenant, isLoading, error } = usePortal(tenant_slug);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const auth = localStorage.getItem(`portal_auth_${tenant_slug}`);
    if (!auth && !location.pathname.includes('/auth')) {
      navigate(`/portal/${tenant_slug}/auth`, { replace: true });
    }
  }, [tenant_slug, location.pathname, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold text-destructive">პორტალი ვერ მოიძებნა</h1>
        <p className="mt-2 text-muted-foreground">გთხოვთ გადაამოწმოთ URL მისამართი.</p>
      </div>
    );
  }

  const primaryColor = tenant.primary_color || '#3b82f6';

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans dark:bg-slate-950">
      {/* Dynamic Style for Branding */}
      <style>
        {`
          :root {
            --portal-primary: ${primaryColor};
          }
          .portal-bg-primary { background-color: var(--portal-primary); }
          .portal-text-primary { color: var(--portal-primary); }
          .portal-border-primary { border-color: var(--portal-primary); }
        `}
      </style>

      <header className="sticky top-0 z-50 flex items-center justify-between border-b/10 border-white/5 bg-white/60 px-4 py-4 backdrop-blur-xl dark:bg-slate-900/60 transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="relative group">
            {tenant.logo_url ? (
              <img src={tenant.logo_url} alt={tenant.name} className="h-10 w-10 rounded-xl object-contain shadow-sm group-hover:scale-110 transition-transform duration-300" />
            ) : (
              <div className="portal-bg-primary flex h-10 w-10 items-center justify-center rounded-xl text-white font-bold shadow-lg shadow-portal-primary/20 group-hover:rotate-6 transition-all duration-300">
                {tenant.name.charAt(0)}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white bg-green-500 portal-bg-primary shadow-sm" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold tracking-tight text-slate-900 dark:text-white leading-none">{tenant.name}</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1 opacity-70">Client Portal</span>
          </div>
        </div>
        <button className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
          <User className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-20">
        <Outlet context={{ tenant }} />
      </main>

      {/* Bottom Navigation (Mobile-First) */}
      <nav className="fixed bottom-6 left-4 right-4 z-50 flex items-center justify-around rounded-3xl border border-white/20 bg-white/70 px-4 py-4 backdrop-blur-2xl shadow-2xl dark:bg-slate-900/70 transition-all duration-500">
        <Link
          to={`/portal/${tenant_slug}`}
          className={`relative group flex flex-col items-center gap-1.5 transition-all duration-300 ${location.pathname === `/portal/${tenant_slug}` ? 'portal-text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
        >
          <div className={`p-1.5 rounded-xl transition-all duration-300 ${location.pathname === `/portal/${tenant_slug}` ? 'bg-portal-primary/10' : 'group-hover:bg-slate-100/50'}`}>
            <Home className={`h-6 w-6 transition-transform duration-300 ${location.pathname === `/portal/${tenant_slug}` ? 'scale-110' : 'group-hover:scale-105'}`} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider">მთავარი</span>
          {location.pathname === `/portal/${tenant_slug}` && (
            <div className="absolute -bottom-1 h-1 w-1 rounded-full portal-bg-primary" />
          )}
        </Link>
        <Link
          to={`/portal/${tenant_slug}/booking`}
          className={`relative group flex flex-col items-center gap-1.5 transition-all duration-300 ${location.pathname.includes('/booking') ? 'portal-text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
        >
          <div className={`p-1.5 rounded-xl transition-all duration-300 ${location.pathname.includes('/booking') ? 'bg-portal-primary/10' : 'group-hover:bg-slate-100/50'}`}>
            <Calendar className={`h-6 w-6 transition-transform duration-300 ${location.pathname.includes('/booking') ? 'scale-110' : 'group-hover:scale-105'}`} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider">დაჯავშნა</span>
          {location.pathname.includes('/booking') && (
            <div className="absolute -bottom-1 h-1 w-1 rounded-full portal-bg-primary" />
          )}
        </Link>
        <Link
          to={`/portal/${tenant_slug}/history`}
          className={`relative group flex flex-col items-center gap-1.5 transition-all duration-300 ${location.pathname.includes('/history') ? 'portal-text-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
        >
          <div className={`p-1.5 rounded-xl transition-all duration-300 ${location.pathname.includes('/history') ? 'bg-portal-primary/10' : 'group-hover:bg-slate-100/50'}`}>
            <Clock className={`h-6 w-6 transition-transform duration-300 ${location.pathname.includes('/history') ? 'scale-110' : 'group-hover:scale-105'}`} />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider">ისტორია</span>
          {location.pathname.includes('/history') && (
            <div className="absolute -bottom-1 h-1 w-1 rounded-full portal-bg-primary" />
          )}
        </Link>
      </nav>
    </div>
  );
};
