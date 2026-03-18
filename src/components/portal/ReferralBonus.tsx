import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Share2, Users, Gift, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface ReferralBonusProps {
  referralCode: string;
  tenantSlug: string;
  primaryColor?: string;
}

export const ReferralBonus = ({ referralCode, tenantSlug, primaryColor = "var(--portal-primary)" }: ReferralBonusProps) => {
  const referralLink = `${window.location.origin}/portal/${tenantSlug}/auth?ref=${referralCode}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success("ლინკი დაკოპირებულია!");
  };

  const shareToWhatsApp = () => {
    const text = `გაიარე რეგისტრაცია MARTE-ს პორტალზე და მიიღე ბონუსი: ${referralLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <Card className="overflow-hidden border-none bg-gradient-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur-xl rounded-[2.5rem] p-1 shadow-2xl">
      <CardContent className="p-8 space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Badge className="bg-indigo-500/20 text-indigo-500 dark:text-indigo-300 border-none px-4 py-1 rounded-full font-bold uppercase tracking-widest text-[10px]">
              <Gift className="h-3 w-3 mr-2" />
              მოიწვიე მეგობარი
            </Badge>
            <h3 className="text-2xl font-black tracking-tighter">მიიღე 50 ქულა ბონუსად!</h3>
            <p className="text-sm text-muted-foreground font-medium max-w-[240px] leading-relaxed">
              გაუზიარე ლინკი მეგობარს და ორივე მიიღებთ ბონუსს პირველ ვიზიტზე.
            </p>
          </div>
          <div className="h-16 w-16 bg-white dark:bg-slate-900 rounded-3xl shadow-xl flex items-center justify-center rotate-6 group-hover:rotate-0 transition-transform duration-500">
            <Users className="h-8 w-8 text-indigo-500" />
          </div>
        </div>

        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
          <div className="relative flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-100 dark:border-white/5 shadow-inner">
            <div className="flex-1 px-4 py-2 font-mono text-sm font-bold text-slate-500 truncate">
              {referralCode}
            </div>
            <Button 
              size="sm" 
              onClick={copyToClipboard}
              className="rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:scale-105 transition-transform"
            >
              <Copy className="h-4 w-4 mr-2" />
              კოპირება
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="h-14 rounded-2xl border-indigo-100 dark:border-white/10 hover:bg-indigo-50 dark:hover:bg-white/5 font-bold text-xs uppercase tracking-widest transition-all"
            onClick={shareToWhatsApp}
          >
            <MessageCircle className="h-5 w-5 mr-2 text-green-500" />
            WhatsApp
          </Button>
          <Button 
            variant="outline" 
            className="h-14 rounded-2xl border-purple-100 dark:border-white/10 hover:bg-purple-50 dark:hover:bg-white/5 font-bold text-xs uppercase tracking-widest transition-all"
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: 'MARTE Referral',
                  text: 'გაიარე რეგისტრაცია და მიიღე ბონუსი!',
                  url: referralLink,
                });
              } else {
                copyToClipboard();
              }
            }}
          >
            <Share2 className="h-5 w-5 mr-2 text-purple-500" />
            გაზიარება
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
