import { useOutletContext, useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ShoppingBag, ArrowRight, Sparkles } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { offlineQueue } from "@/lib/offlineQueue";
import { toast } from "sonner";
import { useI18n } from "@/hooks/useI18n";
import { getTranslatedField } from "@/lib/i18n/content";

export const PortalCatalog = () => {
  const { tenant } = useOutletContext<{ tenant: any }>();
  const { tenant_slug } = useParams();
  const [searchTerm, setSearchTerm] = useState("");
  const { lang, t } = useI18n();

  const { data: items, isLoading } = useQuery({
    queryKey: ['portal-catalog', tenant.id, tenant.industry],
    queryFn: async () => {
      // Check for cache if offline
      if (!navigator.onLine) {
        const cached = await offlineQueue.getCachedPortalCatalog(tenant.id);
        if (cached) {
          toast.info("მონაცემები იტვირთება ქეშიდან (Offline)");
          return cached.items;
        }
      }

      let query;
      if (tenant.industry === 'salon') {
        query = supabase.from('salon_services').select('*').eq('tenant_id', tenant.id).eq('is_active', true);
      } else if (tenant.industry === 'clinic') {
        query = supabase.from('clinic_services').select('*').eq('tenant_id', tenant.id).eq('is_active', true);
      } else {
        query = supabase.from('products').select('*').eq('tenant_id', tenant.id);
      }
      
      const { data, error } = await query;
      if (error) {
        const cached = await offlineQueue.getCachedPortalCatalog(tenant.id);
        if (cached) return cached.items;
        throw error;
      };

      if (data) {
        await offlineQueue.cachePortalCatalog(tenant.id, data);
      }

      return data;
    }
  });

  const filteredItems = items?.filter(item => {
    const displayName = getTranslatedField(item, 'name', lang);
    const categoryName = (item.category || item.category_id || '');
    return displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           categoryName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6 p-4 pb-24">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-black tracking-tighter">{t('catalog')}</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('portal_search') || "ძებნა..."}
            className="pl-10 h-12 rounded-2xl border-none bg-white dark:bg-slate-900 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-40 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {filteredItems?.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="group overflow-hidden rounded-[2rem] border-none shadow-sm hover:shadow-xl transition-all duration-300 dark:bg-slate-900">
                  <CardContent className="p-0">
                    <div className="relative h-32 bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                       {item.images?.[0] ? (
                         <img src={item.images[0]} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                       ) : (
                         <ShoppingBag className="h-12 w-12 text-slate-300" />
                       )}
                       <Badge className="absolute top-4 right-4 bg-white/90 text-black backdrop-blur-md border-none px-3 font-bold">
                          {item.price || item.sell_price || item.base_price} ₾
                       </Badge>
                    </div>
                      <div className="p-5">
                        <div className="flex justify-between items-start mb-2">
                           <h3 className="font-bold text-lg leading-tight">{getTranslatedField(item, 'name', lang)}</h3>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-4">
                          {getTranslatedField(item, 'description', lang) || t('no_description_portal')}
                        </p>
                        <Button asChild className="w-full h-12 rounded-xl portal-bg-primary text-white group">
                          <Link to={`/portal/${tenant_slug}/booking?serviceId=${item.id}`}>
                            {t('booking')} <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                          </Link>
                        </Button>
                      </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
