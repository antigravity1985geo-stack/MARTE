import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Building, CheckCircle2, XCircle, LogIn, Activity, Search, Filter, Plus, Download, Edit2, Users, DollarSign, Calendar, Megaphone, Trash2, Gauge, ShieldAlert, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNavigate, Navigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { AVAILABLE_FEATURES, getDefaultFeatures, IndustryType, PlanType } from '@/config/features';

export default function SuperAdminPage() {
  const { user, tenants, activeTenantId, setActiveTenant } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('overview');

  // Centralized feature list is now imported from @/config/features
  
  const [searchTerm, setSearchTerm] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [editTenant, setEditTenant] = useState<any | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Industry states
  const [addIndustry, setAddIndustry] = useState<IndustryType>('retail');
  const [addCustomIndustry, setAddCustomIndustry] = useState('');
  const [editIndustry, setEditIndustry] = useState<IndustryType>('retail');
  const [editCustomIndustry, setEditCustomIndustry] = useState('');
  const [editFeatures, setEditFeatures] = useState<Record<string, boolean>>({});
  const [editLimits, setEditLimits] = useState<Record<string, number>>({});

  // Create Tenant State
  const [addFeatures, setAddFeatures] = useState<Record<string, boolean>>({
    pos: true,
    inventory: true,
    sales: true,
    purchases: true,
    crm: true,
    accounting: true,
    hr: true
  });
  const [addLimits, setAddLimits] = useState<Record<string, number>>({
    max_users: 3,
    branches: 1,
    warehouses: 1
  });

  useEffect(() => {
    if (isAddModalOpen) {
      setAddIndustry('retail');
      setAddCustomIndustry('');
      setAddFeatures(getDefaultFeatures('retail'));
      setAddLimits({
        max_users: 3,
        branches: 1,
        warehouses: 1
      });
    }
  }, [isAddModalOpen]);

  useEffect(() => {
    if (editTenant) {
      const isPredefined = ['retail', 'fnb', 'salon', 'clinic', 'pharmacy', 'auto', 'real_estate', 'construction', 'logistics'].includes(editTenant.industry);
      if (isPredefined || !editTenant.industry) {
        setEditIndustry(editTenant.industry || 'retail');
        setEditCustomIndustry('');
      } else {
        setEditIndustry('other');
        setEditCustomIndustry(editTenant.industry);
      }
      setEditFeatures(editTenant.features || {});
      setEditLimits(editTenant.limits || {});
    }
  }, [editTenant]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

  const { data: allTenants, isLoading } = useQuery({
    queryKey: ['superadmin-tenants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          *,
          tenant_members(
            role,
            user:profiles(full_name, email)
          )
        `)
        .order('created_at', { ascending: false });
      
      console.log('Superadmin Tenants Query Result:', { data, error });
      if (error) throw error;
      
      return data.map((tenant: any) => {
        const ownerMember = tenant.tenant_members?.find((m: any) => m.role === 'owner');
        return {
          ...tenant,
          owner_name: ownerMember?.user?.full_name || 'უცნობი',
          owner_email: ownerMember?.user?.email || '-'
        };
      });
    },
  });

  const { data: platformUsers, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['superadmin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          user_roles(role),
          tenant_members(
            tenant:tenants(name, industry)
          )
        `)
        .order('full_name');
      if (error) throw error;
      return data;
    },
  });

  const { data: announcements, isLoading: isLoadingAnnouncements } = useQuery({
    queryKey: ['superadmin-announcements'],
    queryFn: async () => {
      const { data, error } = await supabase.from('global_announcements').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['superadmin-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string, status: string }) => {
      const { error } = await supabase.from('tenants').update({ subscription_status: status }).eq('id', id);
      if (error) throw error;
      return { id, status };
    },
    onSuccess: (_, vars) => {
      toast({ title: 'სტატუსი განახლდა' });
      queryClient.invalidateQueries({ queryKey: ['superadmin-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-audit-logs'] });
      logAudit(vars.status === 'active' ? 'activate_tenant' : 'suspend_tenant', vars.id);
    },
    onError: (error) => {
      toast({ title: 'შეცდომა', description: error.message, variant: 'destructive' });
    }
  });

  const handleLoginAs = (tenantId: string, tenantName: string) => {
    logAudit('login_as', tenantId, tenantName);
    setActiveTenant(tenantId);
    window.location.href = '/app';
  };

  // Helper to write an audit log entry
  const logAudit = async (action: string, targetId?: string, targetLabel?: string, metadata?: any) => {
    await supabase.from('audit_logs').insert({
      actor_id: user?.id,
      actor_email: user?.email,
      action,
      target_id: targetId,
      target_label: targetLabel,
      metadata: metadata || {}
    });
  };

  const updateTenantInfoMutation = useMutation({
    mutationFn: async (payload: { id: string, name: string, industry: string, subscription_plan: string, monthly_fee: number, subscription_end_date: string, features: any, limits: any, subscription_status?: string }) => {
      const { error } = await supabase.from('tenants').update({ 
        name: payload.name, 
        industry: payload.industry,
        subscription_plan: payload.subscription_plan,
        monthly_fee: payload.monthly_fee,
        subscription_end_date: payload.subscription_end_date || null,
        features: payload.features,
        limits: payload.limits,
        subscription_status: payload.subscription_status
      }).eq('id', payload.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast({ title: 'წარმატებით შეინახა' });
      queryClient.invalidateQueries({ queryKey: ['superadmin-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-audit-logs'] });
      setEditTenant(null);
      logAudit('update_tenant', vars.id, vars.name);
    },
    onError: (err: any) => toast({ title: 'შეცდომა', description: err.message, variant: 'destructive' })
  });

  const deleteTenantMutation = useMutation({
    mutationFn: async (id: string) => {
      const confirmed = window.confirm('ნამდვილად გსურთ ამ ბიზნესის სრულად წაშლა? ეს ქმედება შეუქცევადია!');
      if (!confirmed) return;
      
      const { error } = await supabase.from('tenants').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'ბიზნესი წაიშალა' });
      queryClient.invalidateQueries({ queryKey: ['superadmin-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-audit-logs'] });
      logAudit('delete_tenant');
    },
    onError: (err: any) => toast({ title: 'შეცდომა', description: err.message, variant: 'destructive' })
  });

  const createTenantMutation = useMutation({
    mutationFn: async (payload: { name: string, industry: string, features: any, limits: any }) => {
      // 1. Create Tenant
      const { data: tenant, error: tenantError } = await supabase.from('tenants').insert({
        name: payload.name,
        industry: payload.industry,
        subscription_status: 'active',
        subscription_plan: 'free',
        features: payload.features,
        limits: payload.limits
      }).select().single();
      
      if (tenantError) throw tenantError;

      // 2. Assign Superadmin as owner so they can manage it immediately
      if (user?.id && tenant) {
        await supabase.from('tenant_members').insert({
          tenant_id: tenant.id,
          user_id: user.id,
          role: 'owner'
        });
      }
      
      return tenant;
    },
    onSuccess: (data) => {
      toast({ title: 'ახალი ბიზნესი წარმატებით შეიქმნა' });
      queryClient.invalidateQueries({ queryKey: ['superadmin-tenants'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-audit-logs'] });
      setIsAddModalOpen(false);
      logAudit('create_tenant', data?.id, data?.name);
    },
    onError: (err: any) => toast({ title: 'ახალი ბიზნესის შექმნა ვერ მოხერხდა', description: err.message, variant: 'destructive' })
  });

  const createAnnouncementMutation = useMutation({
    mutationFn: async (payload: { title: string, message: string, type: string, expires_at: string | null }) => {
      const { error } = await supabase.from('global_announcements').insert({
        title: payload.title,
        message: payload.message,
        type: payload.type,
        expires_at: payload.expires_at,
        is_active: true
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'შეტყობინება გაიგზავნა' });
      queryClient.invalidateQueries({ queryKey: ['superadmin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['superadmin-audit-logs'] });
      logAudit('post_announcement');
    },
    onError: (err: any) => toast({ title: 'შეცდომა', description: err.message, variant: 'destructive' })
  });

  const updateAnnouncementMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
      const { error } = await supabase.from('global_announcements').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['superadmin-announcements'] })
  });

  const deleteAnnouncementMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('global_announcements').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'წაიშალა' });
      queryClient.invalidateQueries({ queryKey: ['superadmin-announcements'] });
    }
  });

  const activeCount = allTenants?.filter(t => t.subscription_status === 'active').length || 0;
  const suspendedCount = allTenants?.filter(t => t.subscription_status === 'suspended').length || 0;
  const totalMRR = allTenants?.reduce((sum, t) => sum + (t.subscription_status === 'active' ? Number(t.monthly_fee || 0) : 0), 0) || 0;

  // Derive unique industries for the filter
  const industries = useMemo(() => {
    if (!allTenants) return [];
    const unique = new Set(allTenants.map(t => t.industry).filter(Boolean));
    return Array.from(unique);
  }, [allTenants]);

  // Filter tenants
  const filteredTenants = useMemo(() => {
    if (!allTenants) return [];
    return allTenants.filter(tenant => {
      const matchesSearch = tenant.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            tenant.id.includes(searchTerm);
      const matchesIndustry = industryFilter === 'all' || tenant.industry === industryFilter;
      return matchesSearch && matchesIndustry;
    });
  }, [allTenants, searchTerm, industryFilter]);

  // Filter audit logs
  const filteredAuditLogs = useMemo(() => {
    if (!auditLogs) return [];
    return auditLogs.filter(log => {
      const match = (log.actor_email?.toLowerCase().includes(auditSearch.toLowerCase()) || 
                     log.action?.toLowerCase().includes(auditSearch.toLowerCase()) ||
                     log.target_label?.toLowerCase().includes(auditSearch.toLowerCase()));
      return match;
    });
  }, [auditLogs, auditSearch]);

  const handleExportCSV = () => {
    if (!filteredTenants || filteredTenants.length === 0) return;
    const headers = ['ID', 'Name', 'Industry', 'Status', 'CreatedAt'];
    const rows = filteredTenants.map(t => [
      t.id, 
      `"${t.name || ''}"`, 
      t.industry || '', 
      t.subscription_status || '', 
      new Date(t.created_at).toISOString()
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `marte_tenants_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Prepare data for Analytics
  const industryStats = useMemo(() => {
    if (!allTenants) return [];
    const counts: Record<string, number> = {};
    allTenants.forEach(t => {
      const ind = t.industry || 'უნაცნობი';
      counts[ind] = (counts[ind] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name: name.toUpperCase(), value })).sort((a, b) => b.value - a.value);
  }, [allTenants]);

  const growthStats = useMemo(() => {
    if (!allTenants) return [];
    const months: Record<string, number> = {};
    // Sort oldest to newest
    const sorted = [...allTenants].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    let cumulative = 0;
    sorted.forEach(t => {
      const date = new Date(t.created_at);
      const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      cumulative += 1;
      months[monthYear] = cumulative; // Takes the last cumulative value of the month
    });
    
    return Object.entries(months).map(([name, total]) => ({
      name,
      total
    }));
  }, [allTenants]);

  const mrrGrowthStats = useMemo(() => {
    if (!allTenants) return [];
    const months: Record<string, number> = {};
    const sorted = [...allTenants].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
    let cumulative = 0;
    sorted.forEach(t => {
      const date = new Date(t.created_at);
      const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      if (t.subscription_status === 'active') {
        cumulative += Number(t.monthly_fee || 0);
      }
      months[monthYear] = cumulative;
    });
    
    return Object.entries(months).map(([name, total]) => ({
      name,
      total: Math.round(total)
    }));
  }, [allTenants]);

  const groupedFeatures = useMemo(() => {
    const groups: Record<string, any[]> = {
      core: [],
      finance: [],
      inventory: [],
      hr: [],
      industry: [],
      advanced: []
    };
    AVAILABLE_FEATURES.forEach(f => {
      if (groups[f.category]) {
        groups[f.category].push(f);
      } else {
        // Fallback for unexpected categories
        if (!groups['advanced']) groups['advanced'] = [];
        groups['advanced'].push(f);
      }
    });
    return groups;
  }, []);

  const categoryLabels: Record<string, string> = {
    core: 'Core & CRM (მთავარი)',
    finance: 'Finance & Sales (ფინანსები)',
    inventory: 'Inventory & Warehouse (საწყობი)',
    hr: 'HR & Management (პერსონალი)',
    industry: 'Industry Specific (სპეციფიკური)',
    advanced: 'Advanced (დამატებითი)'
  };

  const isImpersonating = useMemo(() => {
    if (!user?.isSuperadmin || !activeTenantId) return false;
    // If the user is a natural member of this tenant, it's in their tenants list
    const isNaturalMember = tenants.some(t => t.id === activeTenantId);
    return !isNaturalMember;
  }, [user, activeTenantId, tenants]);

  // Protect the route (after all hooks)
  if (!user?.isSuperadmin) {
    return <Navigate to="/app" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-gradient-to-r from-sidebar-primary/10 to-transparent p-6 rounded-2xl border border-sidebar-border">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-xl">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
            Superadmin "God Mode"
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            MARTE პლატფორმის გლობალური მართვის პანელი. გააკონტროლეთ ყველა დარეგისტრირებული ბიზნესი, მათი ინდუსტრიები და გამოწერები.
          </p>
        </div>
        <div className="flex gap-2">
           <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
             <Download className="h-4 w-4" /> ექსპორტი
           </Button>
           <Button 
             className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
             onClick={() => setIsAddModalOpen(true)}
           >
             <Plus className="h-4 w-4" /> ახალი ბიზნესი
           </Button>
        </div>
      </div>

      {isImpersonating && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 px-4 py-3 rounded-xl flex items-center justify-between animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3 font-medium">
            <div className="p-1.5 bg-amber-500/20 rounded-lg">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none uppercase tracking-wider">Impersonation Mode</p>
              <p className="text-xs opacity-80 mt-1">თქვენ ათვალიერებთ სხვა ბიზნესის მონაცემებს "God Mode"-ით</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-amber-500/30 hover:bg-amber-500/20"
            onClick={() => {
              localStorage.removeItem('marte_active_tenant');
              window.location.reload();
            }}
          >
            რეჟიმის გამორთვა
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-card to-muted/20 border-border overflow-hidden relative">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">სულ ბიზნესები</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{allTenants?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">ჯამური რეგისტრირებული Tenants</p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-background border-emerald-100 dark:border-emerald-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600 dark:text-emerald-400">აქტიური</CardTitle>
            <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{activeCount}</div>
            <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">აქტიური გამოწერით</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/20 dark:to-background border-rose-100 dark:border-rose-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-destructive">შეჩერებული</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-700 dark:text-rose-300">{suspendedCount}</div>
            <p className="text-xs text-rose-600/70 dark:text-rose-400/70 mt-1">გაყინული ექაუნთები</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/20 dark:to-background border-indigo-100 dark:border-indigo-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-indigo-600 dark:text-indigo-400">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-indigo-700 dark:text-indigo-300">₾ {totalMRR.toFixed(2)}</div>
            <p className="text-xs text-indigo-600/70 dark:text-indigo-400/70 mt-1">ყოველთვიური შემოსავალი</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50 p-1 w-full justify-start h-auto rounded-xl flex-wrap">
          <TabsTrigger value="overview" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">მიმოხილვა</TabsTrigger>
          <TabsTrigger value="tenants" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">ბიზნესების სია</TabsTrigger>
          <TabsTrigger value="users" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">მომხმარებლები</TabsTrigger>
          <TabsTrigger value="announcements" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">გლობალური შეტყობინებები</TabsTrigger>
          <TabsTrigger value="invoicing" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">ინვოისები</TabsTrigger>
          <TabsTrigger value="audit-logs" className="px-6 py-2.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">აუდიტის ლოგი</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 animate-in fade-in">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="shadow-sm border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">ინდუსტრიების გადანაწილება</CardTitle>
                <CardDescription>რომელ სექტორებშია მოთხოვნა</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={industryStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {industryStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">ზრდის დინამიკა (Tenants)</CardTitle>
                <CardDescription>რეგისტრირებული ბიზნესების აკუმულირებული ზრდა თვეების მიხედვით</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthStats} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorTotal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">MRR დინამიკა (შემოსავალი)</CardTitle>
                <CardDescription>ყოველთვიური მზარდი შემოსავალი (MRR) დროში</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mrrGrowthStats} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMRR" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} unit=" ₾" />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorMRR)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tenants" className="animate-in fade-in">
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle>Tenants გაფართოებული სია</CardTitle>
              <CardDescription>მართეთ ბიზნესები და მათი წვდომები პლატფორმაზე.</CardDescription>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ძებნა სახელით ან ID-ით..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={industryFilter} onValueChange={setIndustryFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span><SelectValue placeholder="ყველა ინდუსტრია" /></span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ყველა ინდუსტრია</SelectItem>
                  {industries.map(ind => (
                    <SelectItem key={ind} value={ind}>
                      {ind === 'retail' ? 'საცალო ვაჭრობა' : 
                       ind === 'salon' ? 'სალონი/სპა' : 
                       ind === 'fnb' ? 'რესტორანი/კაფე' : 
                       ind === 'clinic' ? 'კლინიკა და ჯანდაცვა' :
                       ind === 'pharmacy' ? 'აფთიაქი' : 
                       ind === 'auto' ? 'ავტოსერვისი' : 
                       ind === 'logistics' ? 'საწყობი / ლოჯისტიკა' :
                       ind === 'construction' ? 'მშენებლობა' :
                       ind === 'real_estate' ? 'უძრავი ქონება' : ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead className="w-[20%]">დასახელება</TableHead>
                <TableHead>დამრეგისტრირებელი (Owner)</TableHead>
                <TableHead>ინდუსტრია</TableHead>
                <TableHead>გეგმა & ფასი</TableHead>
                <TableHead>რესურსების გამოყენება</TableHead>
                <TableHead>ვადის გასვლა</TableHead>
                <TableHead>სტატუსი</TableHead>
                <TableHead className="text-right">მოქმედება</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTenants?.map((tenant) => (
                <TableRow key={tenant.id} className="group hover:bg-muted/20 transition-colors">
                  <TableCell>
                    <div className="font-semibold text-foreground/90">{tenant.name}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-0.5" title={tenant.id}>
                      ID: {tenant.id.split('-')[0]}•••{tenant.id.split('-').pop()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{tenant.owner_name}</div>
                    <div className="text-xs text-muted-foreground">{tenant.owner_email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-background capitalize">
                      {tenant.industry || 'უნაცნობი'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{tenant.subscription_plan || 'Free'}</div>
                    <div className="text-xs text-muted-foreground">{tenant.monthly_fee ? `₾${tenant.monthly_fee}/თვე` : 'უფასო'}</div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2 w-32 group/usage cursor-help">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1"><Users className="h-2.5 w-2.5" /> მომხმ.</span>
                          <span>{tenant.usage?.users || 0}/{tenant.limits?.max_users || '∞'}</span>
                        </div>
                        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              (tenant.usage?.users || 0) / (tenant.limits?.max_users || 1) >= 0.9 ? 'bg-rose-500' : 
                              (tenant.usage?.users || 0) / (tenant.limits?.max_users || 1) >= 0.7 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, ((tenant.usage?.users || 0) / (tenant.limits?.max_users || 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1"><Building className="h-2.5 w-2.5" /> ფილ.</span>
                          <span>{tenant.usage?.branches || 0}/{tenant.limits?.branches || '∞'}</span>
                        </div>
                        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${
                              (tenant.usage?.branches || 0) / (tenant.limits?.branches || 1) >= 0.9 ? 'bg-rose-500' : 
                              (tenant.usage?.branches || 0) / (tenant.limits?.branches || 1) >= 0.7 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, ((tenant.usage?.branches || 0) / (tenant.limits?.branches || 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {tenant.subscription_end_date ? (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className={new Date(tenant.subscription_end_date) < new Date() ? 'text-destructive font-semibold text-sm' : 'text-sm text-foreground/80'}>
                          {new Date(tenant.subscription_end_date).toLocaleDateString('ka-GE', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {tenant.subscription_status === 'active' ? (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 gap-1.5 border-emerald-200 rounded-full px-2.5 shadow-sm">
                        <CheckCircle2 className="h-3 w-3" /> აქტიური
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1.5 rounded-full px-2.5 shadow-sm">
                        <XCircle className="h-3 w-3" /> შეჩერებული
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Button 
                          variant={tenant.subscription_status === 'active' ? 'outline' : 'default'}
                          size="sm" 
                          className={tenant.subscription_status === 'active' ? 'hover:bg-destructive/10 hover:text-destructive border-transparent hover:border-destructive/20' : 'bg-emerald-600 hover:bg-emerald-700'}
                          onClick={() => updateStatusMutation.mutate({ 
                            id: tenant.id, 
                            status: tenant.subscription_status === 'active' ? 'suspended' : 'active' 
                          })}
                        >
                          {tenant.subscription_status === 'active' ? 'შეჩერება' : 'აქტივაცია'}
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          className="shadow-sm border border-border/50"
                          onClick={() => handleLoginAs(tenant.id, tenant.name)}
                          title="შესვლა როგორც ეს ბიზნესი"
                        >
                          <LogIn className="h-4 w-4 mr-1.5 text-muted-foreground" />
                          Login As
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="hover:bg-primary/10 hover:text-primary transition-colors h-8 px-2"
                          onClick={() => setEditTenant(tenant)}
                          title="რედაქტირება"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="hover:bg-destructive/10 hover:text-destructive transition-colors h-8 px-2"
                          onClick={() => deleteTenantMutation.mutate(tenant.id)}
                          title="წაშლა"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredTenants?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Search className="h-8 w-8 text-muted-foreground/30" />
                      <p>ბიზნესები არ მოიძებნა</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="users" className="animate-in fade-in">
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4 border-b">
              <CardTitle>პლატფორმის მომხმარებლები</CardTitle>
              <CardDescription>ყველა რეგისტრირებული მომხმარებელი და მათი ბიზნეს კავშირები.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>სახელი და გვარი</TableHead>
                    <TableHead>ელ-ფოსტა</TableHead>
                    <TableHead>როლები</TableHead>
                    <TableHead>კომპანიები</TableHead>
                    <TableHead>გაწევრიანდა</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {platformUsers?.map((u: any) => (
                    <TableRow key={u.id} className="hover:bg-muted/10 transition-colors">
                      <TableCell className="font-medium">{u.full_name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {u.user_roles?.map((r: any) => (
                            <Badge key={r.role} variant="outline" className="text-[10px] px-1.5 py-0">
                              {r.role}
                            </Badge>
                          ))}
                          {u.is_superadmin && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[10px] px-1.5 py-0">
                              Superadmin
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-1">
                          {u.tenant_members?.map((tm: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-1 text-muted-foreground">
                              <Building className="h-3 w-3" />
                              {tm.tenant?.name}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString('ka-GE')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="announcements" className="animate-in fade-in space-y-4">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" />
                ახალი შეტყობინების შექმნა
              </CardTitle>
              <CardDescription>
                ეს შეტყობინება გამოუჩნდება ყველა მარტეს მომხმარებელს (ყველა ბიზნესს). გამოიყენეთ სისტემური სიახლეებისთვის ან გაფრთხილებებისთვის.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form 
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  const title = fd.get('title') as string;
                  const message = fd.get('message') as string;
                  const type = fd.get('type') as string;
                  const expires = fd.get('expires') as string;
                  
                  if (!title || !message) return toast({ title: 'შეავსეთ სათაური და ტექსტი', variant: 'destructive' });
                  
                  createAnnouncementMutation.mutate({
                    title, message, type, expires_at: expires ? new Date(expires).toISOString() : null
                  });
                  (e.target as HTMLFormElement).reset();
                }}
              >
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>სათაური *</Label>
                    <Input name="title" placeholder="მაგ: სისტემური განახლება" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label>შეტყობინების ტიპი</Label>
                    <Select name="type" defaultValue="info">
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">ინფორმაცია (ლურჯი)</SelectItem>
                        <SelectItem value="success">წარმატება (მწვანე)</SelectItem>
                        <SelectItem value="warning">გაფრთხილება (ყვითელი)</SelectItem>
                        <SelectItem value="urgent">სასწრაფო (წითელი)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>ტექსტი *</Label>
                  <Input name="message" placeholder="მაგ: ამაღამ 03:00 საათზე სისტემა გაითიშება 1 საათით..." required />
                </div>
                <div className="space-y-1.5 w-full md:w-1/2">
                  <Label>ვადის გასვლა (არასავალდებულო)</Label>
                  <Input name="expires" type="datetime-local" />
                </div>
                <Button type="submit" disabled={createAnnouncementMutation.isPending} className="w-full md:w-auto">
                  {createAnnouncementMutation.isPending ? 'იგზავნება...' : 'გამოქვეყნება (Broadcast)'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>ისტორია მოკლედ</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                   <TableRow>
                     <TableHead className="w-[30%]">სათაური / ტიპი</TableHead>
                     <TableHead className="w-[40%]">ტექსტი</TableHead>
                     <TableHead>გამოქვეყნდა</TableHead>
                     <TableHead>სტატუსი</TableHead>
                     <TableHead className="text-right">წაშლა</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                  {announcements?.map(a => (
                    <TableRow key={a.id} className={a.is_active ? '' : 'opacity-60 grayscale'}>
                      <TableCell>
                        <div className="font-medium flex items-center gap-2">
                          <Badge variant="outline" className={
                            a.type === 'info' ? 'text-blue-600 bg-blue-50' : 
                            a.type === 'success' ? 'text-emerald-600 bg-emerald-50' : 
                            a.type === 'warning' ? 'text-amber-600 bg-amber-50' : 
                            'text-rose-600 bg-rose-50'
                          }>
                            {a.type}
                          </Badge>
                          {a.title}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {a.message}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(a.created_at).toLocaleDateString('ka-GE')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch 
                            checked={a.is_active} 
                            onCheckedChange={(checked) => updateAnnouncementMutation.mutate({ id: a.id, is_active: checked })}
                          />
                          <span className="text-xs">{a.is_active ? 'ჩართული' : 'გამორთული'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="hover:bg-destructive/10 hover:text-destructive h-8 w-8"
                          onClick={() => {
                            if (window.confirm('ნამდვილად გსურთ წაშლა?')) {
                              deleteAnnouncementMutation.mutate(a.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!announcements || announcements.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">შეტყობინებების ისტორია ცარიელია</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit-logs" className="animate-in fade-in">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                სუპერადმინის ქმედებათა (აუდიტის ლოგი)
              </CardTitle>
              <CardDescription>
                ყველა სუპერადმინის შესრულებული ქმედება პლატფორმაზე.
              </CardDescription>
            </CardHeader>
            <div className="px-6 pb-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ძებნა ლოგებში..."
                  className="pl-9 h-9"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                />
              </div>
            </div>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>ადმინი</TableHead>
                    <TableHead>ქმედება</TableHead>
                    <TableHead>თემა / სამიზნე</TableHead>
                    <TableHead>თარიღი</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAuditLogs?.map(log => {
                    const ACTION_LABELS: Record<string, { label: string, color: string }> = {
                      login_as: { label: 'Login As შესვლა', color: 'text-blue-600 bg-blue-50' },
                      update_tenant: { label: 'რედაქტირება', color: 'text-indigo-600 bg-indigo-50' },
                      suspend_tenant: { label: 'შეჩერება', color: 'text-rose-600 bg-rose-50' },
                      activate_tenant: { label: 'აქტივაცია', color: 'text-emerald-600 bg-emerald-50' },
                      create_tenant: { label: 'შექმნა', color: 'text-violet-600 bg-violet-50' },
                      post_announcement: { label: 'შეტყობინება', color: 'text-amber-600 bg-amber-50' },
                    };
                    const action = ACTION_LABELS[log.action] || { label: log.action, color: 'text-muted-foreground bg-muted' };
                    return (
                      <TableRow key={log.id} className="hover:bg-muted/20">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-mono font-medium">{log.actor_email || 'სისტემა'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${action.color}`}>
                            {action.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                          {log.target_label || log.target_id || '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString('ka-GE', { dateStyle: 'short', timeStyle: 'short' })}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!auditLogs || auditLogs.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">
                        აუდიტის ლოგი ცარიელია
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoicing" className="animate-in fade-in">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5 text-primary" />
                ინვოისების გენერაცია
              </CardTitle>
              <CardDescription>
                ქვემოთ ჩამოთვლილია ყველა ბიზნესი, ვისაც ყოველთვიური გადასახადი აქვს. დააჭირეთ "ინვოისი" ღილაკს PDF-ის დასაბეჭდად.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>ბიზნესი</TableHead>
                    <TableHead>გეგმა</TableHead>
                    <TableHead>ყოველთვიური</TableHead>
                    <TableHead>გასვლის თარიღი</TableHead>
                    <TableHead className="text-right">ინვოისი</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allTenants?.filter(t => t.monthly_fee > 0).map(tenant => (
                    <TableRow key={tenant.id} className="hover:bg-muted/20">
                      <TableCell>
                        <div className="font-semibold">{tenant.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">{tenant.industry}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{tenant.subscription_plan || 'Custom'}</Badge>
                      </TableCell>
                      <TableCell className="font-semibold text-emerald-600">
                        ₾{Number(tenant.monthly_fee).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {tenant.subscription_end_date
                          ? new Date(tenant.subscription_end_date).toLocaleDateString('ka-GE')
                          : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={() => {
                            const invNum = `INV-${Date.now().toString().slice(-6)}`;
                            const invoiceDate = new Date().toLocaleDateString('ka-GE');
                            const dueDate = tenant.subscription_end_date
                              ? new Date(tenant.subscription_end_date).toLocaleDateString('ka-GE')
                              : '—';
                            const amount = Number(tenant.monthly_fee).toFixed(2);
                            const plan = tenant.subscription_plan || 'Custom';
                            const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>ინვოისი - ${tenant.name}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #1a1a1a; }
  h1 { font-size: 26px; color: #6d28d9; margin: 0; }
  .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #7c3aed; padding-bottom: 16px; margin-bottom: 24px; }
  .meta { margin-bottom: 24px; line-height: 1.8; }
  .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
  .total { font-size: 20px; font-weight: bold; color: #059669; margin-top: 24px; text-align: right; }
  .footer { margin-top: 16px; font-size: 12px; color: #888; }
</style>
</head><body>
<div class="header">
  <h1>MARTE Cloud ERP</h1>
  <div style="text-align:right">
    <div style="font-size:18px;font-weight:bold">ინვოისი #${invNum}</div>
    <div>${invoiceDate}</div>
  </div>
</div>
<div class="meta">
  <b>გამყიდველი:</b> MARTE Cloud ERP<br/>
  <b>მომხმარებელი:</b> ${tenant.name}<br/>
  <b>ინდუსტრია:</b> ${tenant.industry || '—'}
</div>
<div class="row"><span>სერვისი</span><span>ოდენობა</span></div>
<div class="row"><span>${plan} გამოწერა — 1 თვე</span><span>₾${amount}</span></div>
<div class="total">სულ გადასახდელი: ₾${amount}</div>
<div class="footer">გადახდის ვადა: ${dueDate}</div>
<script>window.onload = function(){ window.print(); }</script>
</body></html>`;
                            const win = window.open('', '_blank');
                            if (win) { win.document.write(html); win.document.close(); }
                          }}
                        >
                          <Download className="h-3.5 w-3.5" />
                          ინვოისი
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!allTenants || allTenants.filter(t => t.monthly_fee > 0).length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        ანაზღაურებადი ბიზნესები არ მოიძებნა. დააყენეთ გადასახადი ბიზნესის რედაქტირებაში.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* QUICK EDIT MODAL */}
      <Dialog open={!!editTenant} onOpenChange={(open) => !open && setEditTenant(null)}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>ბიზნესის რედაქტირება</DialogTitle>
          </DialogHeader>
          {editTenant && (
            <div className="space-y-4 py-4 overflow-y-auto flex-1 pr-1">
              <div className="space-y-1.5">
                <Label>ID: {editTenant.id}</Label>
              </div>
              <div className="space-y-1.5">
                <Label>დასახელება</Label>
                <Input defaultValue={editTenant.name} id="tenant-name" />
              </div>
              <div className="space-y-1.5">
                <Label>ინდუსტრია</Label>
                <Select 
                  value={editIndustry} 
                  onValueChange={(v: string) => {
                    const ind = v as IndustryType;
                    setEditIndustry(ind);
                    if (ind !== 'other') {
                      setEditFeatures(getDefaultFeatures(ind));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">საცალო ვაჭრობა</SelectItem>
                    <SelectItem value="fnb">რესტორანი/კაფე</SelectItem>
                    <SelectItem value="salon">სალონი/სპა</SelectItem>
                    <SelectItem value="clinic">კლინიკა და ჯანდაცვა</SelectItem>
                    <SelectItem value="pharmacy">აფთიაქი</SelectItem>
                    <SelectItem value="auto">ავტოსერვისი</SelectItem>
                    <SelectItem value="logistics">საწყობი / ლოჯისტიკა</SelectItem>
                    <SelectItem value="construction">მშენებლობა</SelectItem>
                    <SelectItem value="real_estate">MARTEHOME</SelectItem>
                    <SelectItem value="other">სხვა (ხელით შეყვანა)</SelectItem>
                  </SelectContent>
                </Select>
                {editIndustry === 'other' && (
                  <Input 
                    placeholder="შეიყვანეთ ინდუსტრია (მაგ: სამშენებლო)" 
                    value={editCustomIndustry}
                    onChange={(e) => setEditCustomIndustry(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>გამოწერის გეგმა</Label>
                  <Select defaultValue={editTenant.subscription_plan || 'Free'} onValueChange={(v) => {
                    const select = document.getElementById('tenant-sub-plan') as HTMLInputElement;
                    if (select) select.value = v;
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Free">Free</SelectItem>
                      <SelectItem value="Basic">Basic</SelectItem>
                      <SelectItem value="Pro">Pro</SelectItem>
                      <SelectItem value="Enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                  <input type="hidden" id="tenant-sub-plan" defaultValue={editTenant.subscription_plan || 'Free'} />
                </div>
                <div className="space-y-1.5">
                  <Label>თვიური ფასი (₾)</Label>
                  <Input type="number" step="0.01" defaultValue={editTenant.monthly_fee || 0} id="tenant-monthly-fee" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>ვადის გასვლის თარიღი</Label>
                <Input 
                  type="date" 
                  defaultValue={editTenant.subscription_end_date ? new Date(editTenant.subscription_end_date).toISOString().split('T')[0] : ''} 
                  id="tenant-sub-end" 
                />
              </div>

              <div className="pt-4 border-t border-border mt-4">
                <Label className="text-base flex items-center gap-2 mb-4">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  მოდულების მართვა (Feature Flags)
                </Label>
                <div className="space-y-6 bg-muted/20 p-4 rounded-xl border border-border/50">
                  {Object.entries(groupedFeatures).map(([categoryId, features]) => (
                    features.length > 0 && (
                      <div key={categoryId} className="space-y-3">
                        <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-2 border-b border-border/50 pb-1">
                          {categoryLabels[categoryId]}
                        </Label>
                        <div className="grid grid-cols-2 gap-3">
                          {features.map(feat => {
                            const isActive = editFeatures[feat.id] !== false;
                            return (
                              <div 
                                key={feat.id} 
                                className={`flex items-center justify-between p-2 rounded-lg transition-all border ${
                                  isActive 
                                    ? 'bg-emerald-500/5 border-emerald-500/10' 
                                    : 'bg-muted/50 border-transparent opacity-60'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {isActive ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                  ) : (
                                    <Lock className="h-4 w-4 text-muted-foreground/50" />
                                  )}
                                  <Label 
                                    htmlFor={`feature-${feat.id}`} 
                                    className={`text-xs font-medium cursor-pointer ${
                                      isActive ? 'text-foreground' : 'text-muted-foreground'
                                    }`}
                                  >
                                    {feat.label}
                                  </Label>
                                </div>
                                <Switch 
                                  id={`feature-${feat.id}`} 
                                  checked={isActive}
                                  onCheckedChange={(checked) => setEditFeatures(prev => ({ ...prev, [feat.id]: checked }))}
                                  className="scale-90"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-border mt-4">
                <Label className="text-base flex items-center gap-2 mb-4">
                  <Gauge className="h-4 w-4 text-primary" />
                  მოხმარების ლიმიტები (Usage Limits)
                </Label>
                <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">მაქს. მომხმარებელი (Users)</Label>
                    <Input 
                      type="number" 
                      min="1"
                      placeholder="ულიმიტო (ცარიელი)"
                      value={editLimits.max_users || ''}
                      onChange={(e) => setEditLimits(prev => {
                        const val = e.target.value ? parseInt(e.target.value) : undefined;
                        const newLimits = { ...prev };
                        if (val) newLimits.max_users = val;
                        else delete newLimits.max_users;
                        return newLimits;
                      })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">მეხსიერების ლიმიტი (GB)</Label>
                    <Input 
                      type="number" 
                      min="1"
                      placeholder="ულიმიტო (ცარიელი)"
                      value={editLimits.max_storage_gb || ''}
                      onChange={(e) => setEditLimits(prev => {
                        const val = e.target.value ? parseInt(e.target.value) : undefined;
                        const newLimits = { ...prev };
                        if (val) newLimits.max_storage_gb = val;
                        else delete newLimits.max_storage_gb;
                        return newLimits;
                      })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTenant(null)}>გაუქმება</Button>
            <Button 
              onClick={() => {
                const name = (document.getElementById('tenant-name') as HTMLInputElement).value;
                const ind = editIndustry === 'other' ? editCustomIndustry : editIndustry;
                const plan = (document.getElementById('tenant-sub-plan') as HTMLInputElement).value;
                const fee = parseFloat((document.getElementById('tenant-monthly-fee') as HTMLInputElement).value || '0');
                const endDate = (document.getElementById('tenant-sub-end') as HTMLInputElement).value;

                if (editIndustry === 'other' && !ind.trim()) {
                  toast({ title: 'გთხოვთ შეიყვანოთ ინდუსტრია', variant: 'destructive' });
                  return;
                }

                updateTenantInfoMutation.mutate({ 
                  id: editTenant.id, 
                  name, 
                  industry: ind,
                  subscription_plan: plan,
                  monthly_fee: fee,
                  subscription_end_date: endDate,
                  features: editFeatures,
                  limits: editLimits
                });
              }}
              disabled={updateTenantInfoMutation.isPending}
            >
              შენახვა
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CREATE NEW BUSINESS MODAL */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ახალი ბიზნესის რეგისტრაცია</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label>ბიზნესის დასახელება *</Label>
              <Input placeholder="მაგ: შპს დენტალი" id="new-tenant-name" />
            </div>
            <div className="space-y-1.5">
              <Label>ინდუსტრია *</Label>
              <Select 
                value={addIndustry} 
                onValueChange={(v: string) => {
                  const ind = v as IndustryType;
                  setAddIndustry(ind);
                  if (ind !== 'other') {
                    setAddFeatures(getDefaultFeatures(ind));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="retail">საცალო ვაჭრობა</SelectItem>
                  <SelectItem value="fnb">რესტორანი/კაფე</SelectItem>
                  <SelectItem value="salon">სალონი/სპა</SelectItem>
                  <SelectItem value="clinic">კლინიკა და ჯანდაცვა</SelectItem>
                  <SelectItem value="pharmacy">აფთიაქი</SelectItem>
                  <SelectItem value="auto">ავტოსერვისი</SelectItem>
                  <SelectItem value="logistics">საწყობი / ლოჯისტიკა</SelectItem>
                  <SelectItem value="construction">მშენებლობა</SelectItem>
                  <SelectItem value="real_estate">MARTEHOME</SelectItem>
                  <SelectItem value="other">სხვა (ხელით შეყვანა)</SelectItem>
                </SelectContent>
              </Select>
              {addIndustry === 'other' && (
                <Input 
                  placeholder="შეიყვანეთ ინდუსტრია (მაგ: სამშენებლო)" 
                  value={addCustomIndustry}
                  onChange={(e) => setAddCustomIndustry(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            <div className="pt-4 border-t">
              <Label className="text-sm font-bold flex items-center gap-2 mb-3">
                <ShieldCheck className="h-4 w-4 text-primary" />
                მოდულების გააქტიურება
              </Label>
              <div className="space-y-4 bg-muted/30 p-3 rounded-lg border border-border/50 max-h-[40vh] overflow-y-auto">
                {Object.entries(groupedFeatures).map(([categoryId, features]) => (
                  features.length > 0 && (
                    <div key={categoryId} className="space-y-2">
                      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-2 border-b border-border/50 pb-0.5">
                        {categoryLabels[categoryId]}
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        {features.map(feat => {
                          const isActive = addFeatures[feat.id] !== false;
                          return (
                            <div 
                              key={feat.id} 
                              className={`flex items-center justify-between p-1.5 rounded-md transition-all border ${
                                isActive 
                                  ? 'bg-emerald-500/5 border-emerald-500/10' 
                                  : 'bg-muted/50 border-transparent opacity-60'
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                {isActive ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                ) : (
                                  <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />
                                )}
                                <Label 
                                  htmlFor={`new-feature-${feat.id}`} 
                                  className={`text-[10px] cursor-pointer ${
                                    isActive ? 'text-foreground font-medium' : 'text-muted-foreground'
                                  }`}
                                >
                                  {feat.label}
                                </Label>
                              </div>
                              <Switch 
                                id={`new-feature-${feat.id}`} 
                                checked={isActive}
                                onCheckedChange={(checked) => setAddFeatures(prev => ({ ...prev, [feat.id]: checked }))}
                                className="scale-75"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>

            <div className="pt-4 border-t">
              <Label className="text-sm font-bold flex items-center gap-2 mb-3">
                <Gauge className="h-4 w-4 text-primary" />
                საწყისი ლიმიტები
              </Label>
              <div className="grid grid-cols-3 gap-3 bg-muted/30 p-3 rounded-lg border border-border/50">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">მომხმარებლები</Label>
                  <Input 
                    type="number" 
                    value={addLimits.max_users || 3}
                    onChange={(e) => setAddLimits(prev => ({ ...prev, max_users: parseInt(e.target.value) }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">ფილიალები</Label>
                  <Input 
                    type="number" 
                    value={addLimits.branches || 1}
                    onChange={(e) => setAddLimits(prev => ({ ...prev, branches: parseInt(e.target.value) }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground">საწყობები</Label>
                  <Input 
                    type="number" 
                    value={addLimits.warehouses || 1}
                    onChange={(e) => setAddLimits(prev => ({ ...prev, warehouses: parseInt(e.target.value) }))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>გაუქმება</Button>
            <Button 
              onClick={() => {
                const name = (document.getElementById('new-tenant-name') as HTMLInputElement).value;
                const ind = addIndustry === 'other' ? addCustomIndustry : addIndustry;
                
                createTenantMutation.mutate({ 
                  name, 
                  industry: ind,
                  features: addFeatures,
                  limits: addLimits
                });
              }}
              disabled={createTenantMutation.isPending}
            >
              {createTenantMutation.isPending ? 'იქმნება...' : 'ბიზნესის დამატება'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
