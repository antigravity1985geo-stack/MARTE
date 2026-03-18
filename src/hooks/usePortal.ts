import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const usePortal = (slug: string | undefined) => {
  return useQuery({
    queryKey: ['portal-tenant', slug],
    queryFn: async () => {
      if (!slug) throw new Error("Tenant slug is required");

      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });
};
