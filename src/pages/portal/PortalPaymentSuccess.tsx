import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, ArrowRight, Sparkles, Home } from "lucide-react";
import { motion } from "framer-motion";

const PortalPaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card className="glass-card border-none bg-white/90 dark:bg-slate-900/90 shadow-2xl overflow-hidden rounded-[2.5rem]">
          <div className="h-2 bg-green-500" />
          <CardContent className="p-8 text-center space-y-6">
            <div className="relative inline-block">
              <div className="h-24 w-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 h-full w-full border-2 border-dashed border-green-500/20 rounded-full"
              />
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tighter">გადახდა წარმატებულია!</h1>
              <p className="text-muted-foreground font-medium">თქვენი მომსახურება წარმატებით დაიჯავშნა და ანაზღაურდა.</p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">ტრანზაქცია</span>
                <span className="font-mono text-xs">{sessionId?.slice(0, 12)}...</span>
              </div>
              <div className="h-px bg-slate-200 dark:bg-slate-700" />
              <div className="flex justify-between items-center text-primary">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  <span className="font-bold text-xs uppercase tracking-tight">დაგერიცხათ</span>
                </div>
                <span className="font-black text-lg">+15 ქულა</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button asChild className="h-12 rounded-xl font-black portal-bg-primary shadow-lg shadow-portal-primary/20">
                <Link to="/portal/history" className="gap-2">
                  ისტორიის ნახვა <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="ghost" className="h-12 rounded-xl font-bold opacity-60">
                <Link to="/portal" className="gap-2">
                  <Home className="h-4 w-4" /> მთავარზე დაბრუნება
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default PortalPaymentSuccess;
