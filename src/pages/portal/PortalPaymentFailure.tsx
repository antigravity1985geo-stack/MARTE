import { useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { XCircle, RefreshCcw, Home, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

const PortalPaymentFailure = () => {
  const [searchParams] = useSearchParams();
  const error = searchParams.get("error") || "გადახდა ვერ განხორციელდა";

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card className="glass-card border-none bg-white/90 dark:bg-slate-900/90 shadow-2xl overflow-hidden rounded-[2.5rem]">
          <div className="h-2 bg-destructive" />
          <CardContent className="p-8 text-center space-y-6">
            <div className="relative inline-block">
              <div className="h-24 w-24 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <motion.div 
                animate={{ rotate: -360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 h-full w-full border-2 border-dashed border-destructive/20 rounded-full"
              />
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-black tracking-tighter text-destructive">შეცდომა გადახდისას</h1>
              <p className="text-muted-foreground font-medium">{error}</p>
            </div>

            <div className="bg-destructive/5 p-4 rounded-2xl flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <p className="text-[11px] text-destructive/80 text-left leading-relaxed font-bold uppercase tracking-tight">
                გთხოვთ შეამოწმოთ ბარათის ბალანსი ან სცადოთ სხვა ბარათით. თუ პრობლემა გაგრძელდა, დაუკავშირდით მხარდაჭერის გუნდს.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button asChild className="h-12 rounded-xl font-black bg-destructive hover:bg-destructive/90 shadow-lg shadow-destructive/20">
                <Link to="/portal/booking" className="gap-2">
                  <RefreshCcw className="h-4 w-4" /> თავიდან ცდა
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

export default PortalPaymentFailure;
