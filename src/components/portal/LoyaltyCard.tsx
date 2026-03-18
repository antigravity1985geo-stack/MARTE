import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QRCodeSVG } from "qrcode.react";
import { CreditCard, Star, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface LoyaltyCardProps {
  points: number;
  tier: string;
  nextTier: string;
  progress: number;
  clientId: string;
  primaryColor?: string;
}

export const LoyaltyCard = ({ 
  points, 
  tier, 
  nextTier, 
  progress, 
  clientId,
  primaryColor = "var(--portal-primary)"
}: LoyaltyCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="relative overflow-hidden border-none bg-slate-900 text-white shadow-2xl rounded-[2.5rem] p-8">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Star className="h-24 w-24 fill-white" />
        </div>
        <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/5 blur-3xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center justify-between">
          <div className="flex-1 space-y-6 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <Badge className="bg-white/10 text-white border-white/20 px-4 py-1.5 rounded-xl font-bold tracking-widest uppercase backdrop-blur-md">
                <Sparkles className="h-3 w-3 mr-2 text-yellow-400" />
                {tier} Member
              </Badge>
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/10 backdrop-blur-md">
                <CreditCard className="h-5 w-5 text-white/70" />
              </div>
            </div>
            
            <div>
              <p className="text-5xl font-black tracking-tighter mb-1">{points.toLocaleString()}</p>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">დაგროვილი ქულები</p>
            </div>

            <div className="w-full max-w-xs mx-auto md:mx-0">
              <div className="flex justify-between items-end mb-2">
                <p className="text-[10px] font-bold text-white/50 uppercase tracking-tighter">შემდეგი დონე: {nextTier}</p>
                <p className="text-[10px] font-bold text-white/80">{progress}%</p>
              </div>
              <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden backdrop-blur-sm">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full shadow-[0_0_15px_rgba(var(--portal-primary),0.5)]"
                  style={{ backgroundColor: primaryColor }}
                />
              </div>
            </div>
          </div>

          {/* QR Code Section */}
          <div className="relative group">
            <div className="absolute -inset-4 bg-white/5 rounded-[2rem] blur-xl opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="relative bg-white p-4 rounded-3xl shadow-2xl">
              <QRCodeSVG 
                value={clientId}
                size={140}
                level="H"
                includeMargin={false}
                imageSettings={{
                  src: "/pwa-icon-192.png",
                  x: undefined,
                  y: undefined,
                  height: 30,
                  width: 30,
                  excavate: true,
                }}
              />
            </div>
            <p className="mt-4 text-center text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">სკანირება ადგილზე</p>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};
