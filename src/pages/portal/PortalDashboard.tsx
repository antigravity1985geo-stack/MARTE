import { useOutletContext } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, History, CreditCard, Star, Sparkles, Info, ArrowRight } from "lucide-react";
import { Link, useParams } from "react-router-dom";

export const PortalDashboard = () => {
  const { tenant } = useOutletContext<{ tenant: any }>();
  const { tenant_slug } = useParams();

  return (
    <div className="space-y-6 p-4">
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
               <History className="h-8 w-8" />
            </div>
            <span className="font-black text-xs uppercase tracking-tighter">ჩემი ისტორია</span>
          </CardContent>
        </Card>
      </div>

      {/* Loyalty / Info Section */}
      <Card className="relative overflow-hidden border-none bg-slate-900 text-white shadow-2xl rounded-[2.5rem] p-8 -mx-1">
        <div className="absolute top-0 right-0 p-8 opacity-10">
           <Star className="h-24 w-24 fill-white" />
        </div>
        <div className="relative z-10 flex flex-col h-full justify-between">
          <div className="flex items-center justify-between mb-8">
            <Badge className="bg-portal-primary/20 text-portal-primary border-none px-4 py-1.5 rounded-xl font-bold italic tracking-widest uppercase">
               VIP Member
            </Badge>
            <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
               <CreditCard className="h-5 w-5 text-white/70" />
            </div>
          </div>
          
          <div>
            <p className="text-4xl font-black tracking-tighter mb-1">1,250</p>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">LOYALTY POINTS</p>
          </div>

          <div className="mt-8">
            <div className="flex justify-between items-end mb-2">
               <p className="text-[10px] font-bold text-white/60">NEXT LEVEL: GOLD</p>
               <p className="text-[10px] font-bold text-white/80">65%</p>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden backdrop-blur-sm">
               <div className="portal-bg-primary h-full w-[65%] shadow-[0_0_15px_rgba(var(--portal-primary),0.5)] transition-all duration-1000" />
            </div>
          </div>
        </div>
      </Card>

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
