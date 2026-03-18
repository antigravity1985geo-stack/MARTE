import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePortal } from "@/hooks/usePortal";
import { Loader2, Phone } from "lucide-react";
import { toast } from "sonner";

export const PortalAuth = () => {
  const { tenant_slug } = useParams();
  const navigate = useNavigate();
  const { data: tenant, isLoading } = usePortal(tenant_slug);
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 9) {
      toast.error("გთხოვთ შეიყვანოთ ვალიდური ნომერი");
      return;
    }

    setIsSubmitting(true);
    // Simulate lookup / OTP
    setTimeout(() => {
      setIsSubmitting(false);
      localStorage.setItem(`portal_auth_${tenant_slug}`, JSON.stringify({ phone }));
      toast.success("მოგესალმებით!");
      navigate(`/portal/${tenant_slug}`);
    }, 1000);
  };

  if (isLoading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin portal-text-primary" /></div>;

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4 font-sans font-black tracking-tighter">
      {/* Animated Background Mesh */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute top-[-10%] left-[-10%] h-[50%] w-[50%] rounded-full portal-bg-primary mix-blend-screen blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[50%] w-[50%] rounded-full bg-purple-600 mix-blend-screen blur-[120px] animate-pulse delay-1000" />
      </div>

      <Card className="relative z-10 w-full max-w-md border-none bg-white/10 shadow-2xl backdrop-blur-3xl rounded-[3rem] overflow-hidden animate-slide-up">
        <CardHeader className="portal-bg-primary text-white p-10 text-center relative overflow-hidden">
          {/* Decorative element */}
          <div className="absolute -top-10 -right-10 h-40 w-40 bg-white/10 rounded-full blur-3xl" />
          
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-white/20 backdrop-blur-xl border border-white/30 shadow-2xl relative z-10">
            <Phone className="h-10 w-10" />
          </div>
          <CardTitle className="text-3xl font-black tracking-tighter relative z-10">შესვლა პორტალზე</CardTitle>
          <p className="mt-2 text-white/60 text-xs font-bold uppercase tracking-widest relative z-10 leading-relaxed">
            {tenant?.name} &bull; Exclusive Access
          </p>
        </CardHeader>
        <CardContent className="p-10 bg-white dark:bg-slate-900 shadow-inner">
          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">მობილურის ნომერი</label>
              <div className="relative">
                <Input
                  type="tel"
                  placeholder="599 XX XX XX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-16 text-2xl text-center font-black tracking-[0.2em] border-slate-100 bg-slate-50/50 rounded-2xl focus:ring-portal-primary focus:border-portal-primary transition-all pr-4"
                />
              </div>
            </div>
            <Button 
               type="submit" 
               className="w-full h-16 portal-bg-primary text-xl font-black rounded-2xl shadow-2xl shadow-portal-primary/40 hover:scale-[1.02] active:scale-95 transition-all"
               disabled={isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : "გაგრძელება"}
            </Button>
          </form>
          <div className="mt-10 flex flex-col items-center gap-4">
             <div className="h-px w-12 bg-slate-100" />
             <p className="text-center text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-40 italic">
               Secure Identification System
             </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
