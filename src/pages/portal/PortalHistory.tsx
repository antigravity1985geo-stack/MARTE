import { useOutletContext } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/useAuthStore";
import { FileText, ChevronRight, Sparkles, CreditCard, Clock } from "lucide-react";

export const PortalHistory = () => {
  const { tenant } = useOutletContext<{ tenant: any }>();
  const { user } = useAuthStore();

  const { data: history, isLoading } = useQuery({
    queryKey: ['portal-history', tenant.id, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('tenant_id', tenant.id)
        .eq('client_id', user?.id)
        .order('start_time', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!tenant.id && !!user?.id
  });

  return (
    <div className="p-4 space-y-8 animate-slide-up">
      <div className="flex flex-col gap-2 pt-4">
        <Badge className="w-fit bg-purple-500/10 text-purple-500 border-none text-[10px] font-black uppercase tracking-widest px-3 py-1">
           Timeline & Reports
        </Badge>
        <h1 className="text-3xl font-black tracking-tighter">ვიზიტების ისტორია</h1>
        <p className="text-sm text-muted-foreground font-medium opacity-60">თქვენი ყველა სამედიცინო ჩანაწერი და ქვითარი.</p>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          [1, 2, 3].map(i => <div key={i} className="h-28 rounded-[2rem] bg-slate-100 animate-pulse" />)
        ) : history?.length === 0 ? (
          <div className="text-center py-20 opacity-40">
            <Clock className="h-12 w-12 mx-auto mb-4" />
            <p className="font-bold">ისტორია ცარიელია</p>
          </div>
        ) : (
          history?.map((item) => (
            <div key={item.id} className="group glass-card bg-white/90 dark:bg-slate-900/90 rounded-[2rem] p-6 shadow-xl border border-white/5 hover:scale-[1.02] transition-all duration-500 flex items-center justify-between">
              <div className="flex gap-5 items-center">
                <div className="h-14 w-14 bg-slate-50 dark:bg-slate-800 flex items-center justify-center rounded-2xl group-hover:bg-purple-500/10 group-hover:text-purple-500 transition-colors duration-500">
                   <FileText className="h-7 w-7 opacity-50 group-hover:opacity-100" />
                </div>
                <div>
                  <p className="text-lg font-black dark:text-white leading-tight">{item.title}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                     <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                       {new Date(item.start_time).toLocaleDateString('ka-GE')}
                     </p>
                     <span className="h-1 w-1 rounded-full bg-slate-300" />
                     <p className="text-[10px] font-black portal-text-primary uppercase tracking-widest">{item.status}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xl font-black dark:text-white leading-none">
                     {item.price || "---"} ₾
                  </p>
                  <Badge className={`mt-2 text-[9px] font-black border-none uppercase tracking-tighter px-2 py-0 ${item.payment_status === 'paid' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                     {item.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                  </Badge>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-8 bg-slate-900 text-white rounded-[2.5rem] shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12">
            <Sparkles className="h-16 w-16" />
         </div>
         <p className="text-sm font-bold opacity-80 mb-2 italic">Smart History ✨</p>
         <p className="text-xs text-white/50 leading-relaxed">ისტორია ავტომატურად ინახება და ხელმისაწვდომია ნებისმიერ დროს. ქვითრების ჩამოსატვირთად დააჭირეთ შესაბამის ვიზიტს.</p>
      </div>
    </div>
  );
};
