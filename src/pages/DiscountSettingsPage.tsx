// src/pages/DiscountSettingsPage.tsx
import { useState, useEffect } from 'react';
import { PageTransition } from '@/components/PageTransition';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  ShieldCheck, 
  KeyRound, 
  Settings2, 
  Percent, 
  Tag, 
  Loader2, 
  Save, 
  Fingerprint,
  Info
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { supabase } from '@/integrations/supabase/client';
import { DiscountPolicy, ROLE_LABELS } from '@/types/discount';
import { useSetManagerPin } from '@/hooks/useDiscountAuth';
import { toast } from 'sonner';

const ROLES = ['cashier', 'supervisor', 'manager', 'admin'];

export default function DiscountSettingsPage() {
  const { activeTenantId } = useAuthStore();
  const [policies, setPolicies] = useState<DiscountPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  
  const { setPin, busy: pinBusy } = useSetManagerPin();
  const [newPin, setNewPin] = useState('');

  useEffect(() => {
    if (!activeTenantId) return;
    
    setLoading(true);
    supabase
      .from('discount_policies')
      .select('*')
      .eq('tenant_id', activeTenantId)
      .then(({ data }) => {
        setPolicies(data as DiscountPolicy[] || []);
        setLoading(false);
      });
  }, [activeTenantId]);

  const updatePolicy = async (role: string, updates: Partial<DiscountPolicy>) => {
    if (!activeTenantId) return;
    
    const existing = policies.find(p => p.role_name === role);
    setSavingId(role);
    
    try {
      if (existing) {
        const { error } = await supabase
          .from('discount_policies')
          .update(updates)
          .eq('id', existing.id);
          
        if (error) throw error;
        setPolicies(prev => prev.map(p => p.id === existing.id ? { ...p, ...updates } : p));
      } else {
        const { data, error } = await supabase
          .from('discount_policies')
          .insert({
            tenant_id: activeTenantId,
            role_name: role,
            self_max_pct: 0,
            self_max_fixed: 0,
            hard_max_pct: 100,
            hard_max_fixed: 9999,
            ...updates
          })
          .select()
          .single();
          
        if (error) throw error;
        setPolicies(prev => [...prev, data as DiscountPolicy]);
      }
      toast.success('პარამეტრები შენახულია');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingId(null);
    }
  };

  const handleSetPin = async () => {
    const success = await setPin(newPin);
    if (success) setNewPin('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">ფასდაკლების პარამეტრები</h1>
            <p className="text-white/40 font-medium">მართეთ ავტორიზაციის ლიმიტები და მენეჯერის PIN-ები</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Policies */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-[#0c0e12] border-white/5 shadow-2xl overflow-hidden">
              <CardHeader className="border-b border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <ShieldCheck className="text-primary" size={20} />
                  </div>
                  <div>
                    <CardTitle className="text-white font-bold">როლების ლიმიტები</CardTitle>
                    <CardDescription className="text-white/30">განსაზღვრეთ ვინ რა ლიმიტით სარგებლობს PIN-ის გარეშე</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-white/5">
                  {ROLES.map((role) => {
                    const policy = policies.find(p => p.role_name === role);
                    const isSaving = savingId === role;
                    
                    return (
                      <div key={role} className="p-6 hover:bg-white/[0.01] transition-colors relative">
                        {isSaving && (
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-10 transition-all">
                            <Loader2 className="animate-spin text-primary" size={20} />
                          </div>
                        )}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                          <div className="space-y-1">
                            <h4 className="text-white font-black text-lg capitalize flex items-center gap-2">
                              {ROLE_LABELS[role] || role}
                              {!policy?.is_active && <span className="text-[10px] bg-white/10 text-white/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest">გამორთულია</span>}
                            </h4>
                            <p className="text-white/20 text-xs font-medium uppercase tracking-widest">ავტორიზაციის ლიმიტები</p>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label className="text-[10px] text-white/30 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                <Percent size={10} className="text-amber-400" /> % (თვით)
                              </Label>
                              <Input 
                                type="number" 
                                className="h-10 bg-white/5 border-white/5 text-white font-black" 
                                defaultValue={policy?.self_max_pct ?? 0}
                                onBlur={(e) => updatePolicy(role, { self_max_pct: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] text-white/30 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                <Tag size={10} className="text-blue-400" /> ₾ (თვით)
                              </Label>
                              <Input 
                                type="number" 
                                className="h-10 bg-white/5 border-white/5 text-white font-black" 
                                defaultValue={policy?.self_max_fixed ?? 0}
                                onBlur={(e) => updatePolicy(role, { self_max_fixed: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col items-end gap-1">
                              <Label className="text-[10px] text-white/30 font-bold uppercase tracking-widest">აქტიურია</Label>
                              <Switch 
                                checked={policy?.is_active ?? true}
                                onCheckedChange={(val) => updatePolicy(role, { is_active: val })}
                                className="data-[state=checked]:bg-primary"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <div className="bg-primary/5 border border-primary/10 rounded-3xl p-6 flex gap-4">
              <Info className="text-primary shrink-0 mt-1" size={20} />
              <div className="space-y-2">
                <p className="text-white/80 font-bold text-sm">როგორ მუშაობს ლიმიტები?</p>
                <div className="text-sm text-white/40 space-y-1">
                  <p>• <strong className="text-white/60">თვით-ლიმიტი:</strong> ფასდაკლება ამ ზღვარს ქვემოთ დადასტურდება ავტომატურად, PIN-ის გარეშე.</p>
                  <p>• <strong className="text-white/60">მაქს-ლიმიტი:</strong> ამ ზღვარს ზემოთ ფასდაკლება დაიბლოკება სრულად (თუნდაც მენეჯერის PIN-ით).</p>
                  <p>• <strong className="text-white/60">PIN ავტორიზაცია:</strong> საჭიროა ნებისმიერი ფასდაკლებისთვის, რომელიც აღემატება როლის "თვით-ლიმიტს".</p>
                </div>
              </div>
            </div>
          </div>

          {/* Manager PINs */}
          <div className="space-y-6">
            <Card className="bg-[#0c0e12] border-white/5 shadow-2xl">
              <CardHeader className="bg-white/[0.02] border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                    <KeyRound className="text-amber-400" size={20} />
                  </div>
                  <div>
                    <CardTitle className="text-white font-bold">თქვენი PIN კოდი</CardTitle>
                    <CardDescription className="text-white/30">დააყენეთ პერსონალური PIN ავტორიზაციისთვის</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-white/40 text-xs font-bold uppercase tracking-widest">ახალი PIN (4-6 ციფრი)</Label>
                    <div className="relative">
                      <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                      <Input 
                        type="password" 
                        maxLength={6}
                        placeholder="••••••"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                        className="h-12 bg-white/5 border-white/5 text-center text-2xl font-black text-white tracking-[0.5em] focus:ring-amber-500/20"
                      />
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleSetPin}
                    disabled={newPin.length < 4 || pinBusy}
                    className="w-full h-12 bg-amber-500 text-black font-black text-base hover:bg-amber-400 transition-all shadow-xl shadow-amber-500/10"
                  >
                    {pinBusy ? <Loader2 className="animate-spin" /> : <><Save className="mr-2" size={18} /> შენახვა</>}
                  </Button>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                  <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">უსაფრთხოების წესები</p>
                  <ul className="text-[11px] text-white/40 space-y-2">
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      არავის გაუზიაროთ თქვენი პერსონალური PIN კოდი.
                    </li>
                    <li className="flex items-start gap-2">
                      <div className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      PIN გამოიყენება ფასდაკლების, დაბრუნების და სხვა კრიტიკული ოპერაციებისთვის.
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#0c0e12] border-white/5 shadow-2xl">
              <CardHeader className="bg-white/[0.02] border-b border-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Settings2 className="text-primary" size={20} />
                  </div>
                  <div>
                    <CardTitle className="text-white font-bold">გლობალური პარამეტრები</CardTitle>
                    <CardDescription className="text-white/30">ფასდაკლების სისტემის ქცევა</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">მიზეზის მოთხოვნა</p>
                    <p className="text-xs text-white/30">აუცილებელია ყოველი ფასდაკლებისას მიზეზის მითითება</p>
                  </div>
                  <Switch checked={true} className="data-[state=checked]:bg-primary" />
                </div>
                <div className="flex items-start justify-between gap-4 pt-4 border-t border-white/5">
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white">აუდიტ-ლოგირება</p>
                    <p className="text-xs text-white/30">ყველა ოპერაციის შენახვა რეპორტინგისთვის</p>
                  </div>
                  <Switch checked={true} disabled className="data-[state=checked]:bg-primary" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
