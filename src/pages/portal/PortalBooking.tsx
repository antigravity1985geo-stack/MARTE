import { useNavigate, useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Clock, ChevronRight, Sparkles, CreditCard, Wallet, Check, AlertCircle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/hooks/useI18n";
import { getTranslatedField } from "@/lib/i18n/content";

export const PortalBooking = () => {
  const { tenant } = useOutletContext<{ tenant: any }>();
  const [selectedService, setSelectedService] = useState<any>(null);
  const [step, setStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'onsite' | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const navigate = useNavigate();
  const { lang, t } = useI18n();

  const { data: services, isLoading } = useQuery({
    queryKey: ['portal-services', tenant.id, tenant.industry],
    queryFn: async () => {
      let query;
      if (tenant.industry === 'salon') {
        query = supabase.from('salon_services').select('*').eq('tenant_id', tenant.id).eq('is_active', true);
      } else if (tenant.industry === 'clinic') {
        query = supabase.from('clinic_services').select('*').eq('tenant_id', tenant.id).eq('is_active', true);
      } else {
        query = supabase.from('products').select('*').eq('tenant_id', tenant.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const handleBooking = async () => {
    if (paymentMethod === 'online') {
      setIsPaying(true);
      try {
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: {
            amount: selectedService?.price || selectedService?.sell_price || selectedService?.base_price,
            currency: 'GEL',
            appointment_id: 'temp-' + Math.random().toString(36).substr(2, 9),
            tenant_id: tenant.id,
            success_url: `${window.location.origin}/portal/${tenant.slug}/payment-success`,
            failure_url: `${window.location.origin}/portal/${tenant.slug}/payment-failure`,
          }
        });

        if (error) throw error;
        if (data?.checkout_url) {
          window.location.href = data.checkout_url;
        }
      } catch (err: any) {
        console.error('Payment error:', err);
        toast.error('გადახდის ინიცირება ვერ მოხერხდა: ' + err.message);
      } finally {
        setIsPaying(false);
      }
    } else {
      toast.success("ვიზიტი წარმატებით დაიჯავშნა!");
      navigate('/portal/history');
    }
  };

  return (
    <div className="p-4 space-y-8 animate-slide-up pb-24">
      <div className="flex flex-col gap-2 pt-4">
        <Badge className="w-fit bg-portal-primary/10 text-portal-primary border-none text-[10px] font-black uppercase tracking-widest px-3 py-1">
           {t('booking_step') || 'Step'} {step}: {step === 1 ? t('select_service') : t('confirm_pay')}
        </Badge>
        <h1 className="text-3xl font-black tracking-tighter">
          {step === 1 ? (t('booking') || 'ვიზიტის დაჯავშნა') : t('confirm_pay')}
        </h1>
      </div>

      {step === 1 ? (
        <div className="space-y-4">
          {isLoading ? (
            [1, 2, 3].map(i => <div key={i} className="h-24 rounded-3xl bg-slate-100 animate-pulse" />)
          ) : (
            services?.map((service) => (
              <Card 
                key={service.id} 
                onClick={() => { setSelectedService(service); setStep(2); }}
                className="group glass-card cursor-pointer border-none shadow-xl hover:shadow-portal-primary/10 transition-all duration-500 overflow-hidden"
              >
                <CardContent className="p-6 flex items-center justify-between bg-white/90 dark:bg-slate-900/90">
                  <div className="flex items-center gap-5">
                    <div className="h-14 w-14 portal-bg-primary/10 portal-text-primary flex items-center justify-center rounded-2xl group-hover:scale-110 transition-transform duration-500">
                       <CalendarIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-lg font-black dark:text-white leading-tight">{getTranslatedField(service, 'name', lang)}</p>
                      <p className="portal-text-primary brightness-110 font-black mt-1">{service.price || service.sell_price || service.base_price} ₾</p>
                    </div>
                  </div>
                  <ChevronRight className="h-6 w-6 text-slate-300" />
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <Card className="rounded-[2rem] border-none shadow-xl bg-white dark:bg-slate-900 p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase">{t('select_service')}</p>
                <p className="text-xl font-black">{getTranslatedField(selectedService, 'name', lang)}</p>
              </div>
              <p className="text-2xl font-black portal-text-primary">{selectedService?.price || selectedService?.sell_price} ₾</p>
            </div>
          </Card>

          <div className="space-y-3">
             <p className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">{t('payment_methods') || 'გადახდის მეთოდი'}</p>
             <div 
               onClick={() => setPaymentMethod('online')}
               className={`flex items-center justify-between p-6 rounded-[2rem] cursor-pointer transition-all duration-300 border-2 ${paymentMethod === 'online' ? 'portal-border-primary bg-portal-primary/5' : 'border-transparent bg-white dark:bg-slate-900 shadow-sm'}`}
             >
                <div className="flex items-center gap-4">
                   <div className={`h-12 w-12 flex items-center justify-center rounded-2xl ${paymentMethod === 'online' ? 'portal-bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <CreditCard className="h-6 w-6" />
                   </div>
                    <div>
                       <p className="font-bold">{t('online_payment')}</p>
                       <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">TBC / BOG Checkout</p>
                    </div>
                </div>
                {paymentMethod === 'online' && <Check className="h-6 w-6 portal-text-primary" />}
             </div>
             <div 
               onClick={() => setPaymentMethod('onsite')}
               className={`flex items-center justify-between p-6 rounded-[2rem] cursor-pointer transition-all duration-300 border-2 ${paymentMethod === 'onsite' ? 'portal-border-primary bg-portal-primary/5' : 'border-transparent bg-white dark:bg-slate-900 shadow-sm'}`}
             >
                <div className="flex items-center gap-4">
                   <div className={`h-12 w-12 flex items-center justify-center rounded-2xl ${paymentMethod === 'onsite' ? 'portal-bg-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <Wallet className="h-6 w-6" />
                   </div>
                    <div>
                       <p className="font-bold">{t('onsite_payment')}</p>
                       <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{t('cash_or_card')}</p>
                    </div>
                </div>
                {paymentMethod === 'onsite' && <Check className="h-6 w-6 portal-text-primary" />}
             </div>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-5 flex gap-4">
             <AlertCircle className="h-6 w-6 text-yellow-600 shrink-0" />
             <p className="text-xs font-bold text-yellow-700 leading-relaxed">
               წინასწარ გადახდის შემთხვევაში მიიღებთ ლოიალობის დამატებით 50 ქულას!
             </p>
          </div>

          <Button 
            disabled={!paymentMethod || isPaying}
            onClick={handleBooking}
            className="w-full h-16 portal-bg-primary rounded-3xl text-lg font-black shadow-2xl shadow-portal-primary/30 hover:scale-[1.02] active:scale-95 transition-all"
          >
             {isPaying ? (
               <Loader2 className="h-6 w-6 animate-spin" />
             ) : paymentMethod === 'online' ? (
               t('confirm_pay')
             ) : (
               t('booking')
             )}
          </Button>
          <Button variant="ghost" onClick={() => setStep(1)} className="w-full font-bold text-muted-foreground uppercase text-xs h-10">
             {t('back')}
          </Button>
        </div>
      )}
    </div>
  );
};
