import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { CreditCard, Wifi, Check, Smartphone } from "lucide-react";

const POSAnimationSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  // Card drops down
  const cardY = useTransform(scrollYProgress, [0.1, 0.4], [-200, 0]);
  const cardRotate = useTransform(scrollYProgress, [0.1, 0.35, 0.4], [-15, -5, 0]);
  const cardOpacity = useTransform(scrollYProgress, [0.1, 0.25], [0, 1]);

  // Contactless waves appear after card lands
  const wavesOpacity = useTransform(scrollYProgress, [0.4, 0.5], [0, 1]);
  const wavesScale = useTransform(scrollYProgress, [0.4, 0.55], [0.5, 1]);

  // Checkmark appears
  const checkOpacity = useTransform(scrollYProgress, [0.55, 0.65], [0, 1]);
  const checkScale = useTransform(scrollYProgress, [0.55, 0.65], [0.3, 1]);

  // Receipt slides up
  const receiptY = useTransform(scrollYProgress, [0.6, 0.75], [40, 0]);
  const receiptOpacity = useTransform(scrollYProgress, [0.6, 0.7], [0, 1]);

  return (
    <section ref={sectionRef} className="py-32 relative min-h-[120vh]">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-accent/10 to-background" />
      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-20"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            POS სისტემა
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight text-balance mb-4">
            გადახდა ერთი შეხებით
          </h2>
          <p className="text-muted-foreground text-pretty max-w-xl mx-auto">
            ინტეგრირებული POS ტერმინალი — უკონტაქტო გადახდა, ავტომატური ინვოისი და რეალურ დროში სინქრონიზაცია.
          </p>
        </motion.div>

        <div className="max-w-lg mx-auto relative" style={{ height: "400px" }}>
          {/* POS Terminal */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64">
            <div className="glass-strong shadow-stack-lg rounded-[20px] p-6 relative">
              {/* Terminal screen */}
              <div className="bg-secondary/80 rounded-[12px] p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground">Marte POS</span>
                  <div className="flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-primary" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground tabular-nums">₾ 24.50</p>
                  <p className="text-xs text-muted-foreground mt-1">მიატანეთ ბარათი</p>
                </div>

                {/* Contactless waves */}
                <motion.div
                  style={{ opacity: wavesOpacity, scale: wavesScale }}
                  className="flex justify-center mt-3"
                >
                  <div className="relative w-10 h-10 flex items-center justify-center">
                    <motion.div
                      animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute inset-0 rounded-full border-2 border-primary/40"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                      className="absolute inset-1 rounded-full border-2 border-primary/60"
                    />
                    <Wifi className="w-4 h-4 text-primary" />
                  </div>
                </motion.div>

                {/* Success check */}
                <motion.div
                  style={{ opacity: checkOpacity, scale: checkScale }}
                  className="flex flex-col items-center mt-2"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-xs font-medium text-primary mt-1">წარმატებული</span>
                </motion.div>
              </div>

              {/* Terminal body dots */}
              <div className="flex justify-center gap-1">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-border" />
                ))}
              </div>

              {/* Terminal base */}
              <div className="mt-3 h-2 bg-border rounded-full" />
            </div>
          </div>

          {/* Floating Bank Card */}
          <motion.div
            style={{ y: cardY, rotate: cardRotate, opacity: cardOpacity }}
            className="absolute top-0 left-1/2 -translate-x-1/2 w-72 z-10"
          >
            <div className="rounded-[16px] p-5 shadow-stack-lg relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, hsl(162 72% 38%), hsl(162 72% 28%), hsl(210 20% 18%))",
              }}
            >
              {/* Card chip */}
              <div className="w-10 h-7 rounded-md bg-yellow-300/80 mb-6 relative">
                <div className="absolute inset-0.5 rounded-sm border border-yellow-400/50" />
                <div className="absolute top-1/2 left-0 right-0 h-px bg-yellow-400/40" />
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-yellow-400/40" />
              </div>

              {/* Contactless icon */}
              <div className="absolute top-5 right-5">
                <Wifi className="w-5 h-5 text-white/60 rotate-90" />
              </div>

              {/* Card number */}
              <div className="flex gap-3 mb-4">
                <span className="text-sm text-white/80 tabular-nums tracking-widest">••••</span>
                <span className="text-sm text-white/80 tabular-nums tracking-widest">••••</span>
                <span className="text-sm text-white/80 tabular-nums tracking-widest">••••</span>
                <span className="text-sm text-white/80 tabular-nums tracking-widest">3719</span>
              </div>

              {/* Card details */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] text-white/40 uppercase mb-0.5">ბარათის მფლობელი</p>
                  <p className="text-xs text-white/90 font-medium">MARTE COMPANY</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/40 uppercase mb-0.5">ვადა</p>
                  <p className="text-xs text-white/90 tabular-nums">12/28</p>
                </div>
              </div>

              {/* Card logo */}
              <div className="absolute bottom-4 right-5 flex -space-x-2">
                <div className="w-6 h-6 rounded-full bg-white/20" />
                <div className="w-6 h-6 rounded-full bg-white/30" />
              </div>
            </div>
          </motion.div>

          {/* Receipt slide-up */}
          <motion.div
            style={{ y: receiptY, opacity: receiptOpacity }}
            className="absolute -bottom-24 right-0 w-44"
          >
            <div className="glass shadow-stack rounded-[12px] p-3">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-medium text-foreground">ელ. ქვითარი</span>
              </div>
              <div className="space-y-1 border-t border-border pt-2">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>პროდუქტი × 2</span>
                  <span className="tabular-nums">₾ 24.50</span>
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>დღგ (18%)</span>
                  <span className="tabular-nums">₾ 4.41</span>
                </div>
                <div className="flex justify-between text-xs font-medium text-foreground pt-1 border-t border-dashed border-border">
                  <span>ჯამი</span>
                  <span className="tabular-nums">₾ 24.50</span>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1">
                <CreditCard className="w-3 h-3 text-primary" />
                <span className="text-[9px] text-primary font-medium">RS.GE-ზე გაგზავნილი</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default POSAnimationSection;
