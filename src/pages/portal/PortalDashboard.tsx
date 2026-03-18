import { useOutletContext, Link, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, History as HistoryIcon, CreditCard, Star, Sparkles, Info, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/useAuthStore";
import { LoyaltyCard } from "@/components/portal/LoyaltyCard";
import { ReferralBonus } from "@/components/portal/ReferralBonus";

export const PortalDashboard = () => {
  const { tenant } = useOutletContext<{ tenant: any }>();
  // ... (existing code omitted for brevity in thought, but I'll provide the actual replacement)
  const { tenant_slug } = useParams();
  const { user } = useAuthStore();

  const { data: clientData, isLoading: clientLoading } = useQuery({
    queryKey: ['portal-client-data', tenant.id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('user_id', user?.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenant.id && !!user?.id
  });

  const loyaltyPoints = clientData?.loyalty_points || 0;
  const loyaltyTier = (clientData?.loyalty_tier || 'bronze').toUpperCase();
  
  // Logic for next tier
  const tiers = {
    'BRONZE': { next: 'SILVER', goal: 500 },
    'SILVER': { next: 'GOLD', goal: 1500 },
    'GOLD': { next: 'PLATINUM', goal: 5000 },
    'PLATINUM': { next: 'MAX', goal: 10000 }
  };
  
  const currentTierInfo = tiers[loyaltyTier as keyof typeof tiers] || tiers['BRONZE'];
  const progress = Math.min(Math.round((loyaltyPoints / currentTierInfo.goal) * 100), 100);

  return (
    <div className="space-y-6 p-4 pb-20">
      {/* Hero Section */}
      <section className="relative -mx-4 -mt-4 overflow-hidden rounded-b-[3rem] bg-slate-900 px-6 pb-24 pt-16 text-white shadow-2xl">
        {/* Animated Mesh Background */}
        <div className="absolute inset-0 opacity-40">
           <div className="absolute top-0 -left-20 h-80 w-80 rounded-full portal-bg-primary mix-blend-multiply blur-3xl animate-pulse" />
           <div className="absolute bottom-0 -right-20 h-80 w-80 rounded-full bg-purple-600 mix-blend-multiply blur-3xl animate-pulse delay-700" />
        </div>
        
        <div className="relative z-10 animate-slide-up">
          <Badge className="bg-white/10 text-white backdrop-blur-md border-white/20 mb-4 px-3 py-1 rounded-full flex items-center w-fit gap-2">
            <Sparkles className="h-3 w-3 text-yellow-400" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Premium Care</span>
          </Badge>
          <h1 className="text-4xl font-black leading-tight tracking-tighter">
            გამარჯობა! <br />
            <span className="portal-text-primary brightness-125">{tenant.name}</span> <span className="text-white/40">Portal</span>
          </h1>
          <p className="mt-4 max-w-[280px] text-sm text-white/60 leading-relaxed font-medium">
            მართეთ თქვენი ვიზიტები, იხილეთ ისტორია და დააგროვეთ ქულები ყოველი გადახდისას.
          </p>
          
          <div className="mt-8 flex gap-3">
            <Button asChild className="h-14 px-8 rounded-2xl portal-bg-primary text-white shadow-xl shadow-portal-primary/30 hover:scale-105 transition-transform">
              <Link to={`/portal/${tenant_slug}/booking`}>
                <Calendar className="mr-2 h-5 w-5" />
                დაჯავშნა
              </Link>
            </Button>
            <Button variant="outline" className="h-14 w-14 rounded-2xl border-white/10 bg-white/5 text-white hover:bg-white/10 transition-colors backdrop-blur-md">
              <Info className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </section>

      {/* Quick Actions / Categories */}
      <div className="grid grid-cols-2 gap-4 -mt-12 relative z-20">
        <Card className="group glass-card overflow-hidden border-none shadow-xl hover:shadow-portal-primary/20">
          <CardContent className="flex flex-col items-center justify-center p-8 bg-white/90 dark:bg-slate-900/90">
            <div className="portal-bg-primary/10 portal-text-primary mb-4 rounded-3xl p-4 group-hover:scale-110 transition-transform duration-500">
               <Calendar className="h-8 w-8" />
            </div>
            <span className="font-black text-xs uppercase tracking-tighter">ახალი ვიზიტი</span>
          </CardContent>
        </Card>
        <Card className="group glass-card overflow-hidden border-none shadow-xl hover:shadow-purple-500/20">
          <CardContent className="flex flex-col items-center justify-center p-8 bg-white/90 dark:bg-slate-900/90">
            <div className="bg-purple-500/10 text-purple-500 mb-4 rounded-3xl p-4 group-hover:scale-110 transition-transform duration-500">
               <HistoryIcon className="h-8 w-8" />
            </div>
            <span className="font-black text-xs uppercase tracking-tighter">ჩემი ისტორია</span>
          </CardContent>
        </Card>
      </div>

      {/* Loyalty Card */}
      <LoyaltyCard 
        points={loyaltyPoints}
        tier={loyaltyTier}
        nextTier={currentTierInfo.next}
        progress={progress}
        clientId={user?.id || ''}
        primaryColor={tenant?.primary_color}
      />

      {/* Referral Program */}
      <ReferralBonus 
        referralCode={clientData?.referral_code || "------"} 
        tenantSlug={tenant_slug || ""}
        primaryColor={tenant?.primary_color}
      />

      {/* Recent Visits */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between px-1">
           <h3 className="text-xl font-black tracking-tight">ბოლო ვიზიტები</h3>
           <Button variant="ghost" className="portal-text-primary text-xs font-bold h-8 hover:bg-portal-primary/5 uppercase tracking-wider">
              ნახვა <ArrowRight className="ml-1 h-3 w-3" />
           </Button>
        </div>
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="group relative flex items-center gap-4 bg-white p-5 rounded-[2rem] shadow-sm hover:shadow-xl transition-all duration-300 dark:bg-slate-900 border border-slate-50 dark:border-white/5">
              <div className="h-14 w-14 portal-bg-primary/10 portal-text-primary flex items-center justify-center rounded-2xl group-hover:scale-110 transition-transform duration-500">
                 <CreditCard className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-base font-bold dark:text-white">კონსულტაცია</p>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-0.5">12 მარტი, 2024</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black dark:text-white leading-none">45.00 ₾</p>
                <Badge variant="outline" className="mt-2 text-[9px] border-green-200 bg-green-50 text-green-600 dark:bg-green-500/10 dark:border-green-500/20 dark:text-green-400 uppercase font-black px-2 py-0">
                   Paid
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
