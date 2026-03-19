import { motion } from "framer-motion";
import { TrendingUp, Users, Package, ArrowRight } from "lucide-react";

const kpiCards = [
  { icon: TrendingUp, label: "შემოსავალი", value: "+12.4%", color: "text-primary" },
  { icon: Users, label: "აქტიური მომხმარებლები", value: "1,248", color: "text-primary" },
  { icon: Package, label: "დღის შეკვეთები", value: "342", color: "text-primary" },
];

const HeroSection = () => {
  return (
    <section id="hero" className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-accent/40 via-background to-background" />
      <div className="absolute top-20 right-0 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[100px]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[80px]" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping-dot" />
              Phase 2 დასრულებულია — Real-time ეკოსისტემა
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground tracking-tight text-balance leading-tight mb-6"
          >
            მართე ბიზნესი ინტელექტუალურად —{" "}
            <span className="text-primary">Marte ERP</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg text-muted-foreground text-pretty max-w-2xl mx-auto mb-10"
          >
            სრული ეკოსისტემა: საწყობი, ბუღალტერია, HR და POS ერთ პლატფორმაზე.
            ჩვენ ვაქცევთ სირთულეს სიმარტივედ.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-primary text-primary-foreground font-semibold shadow-glow hover:brightness-110 transition-all"
            >
              გაიგე მეტი
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-card text-foreground font-medium shadow-stack hover:shadow-stack-lg transition-all"
            >
              დაგვიკავშირდით
            </a>
          </motion.div>
        </div>

        {/* Floating Dashboard Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="max-w-4xl mx-auto"
        >
          <div className="glass shadow-stack-lg rounded-[24px] p-6 sm:p-8">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/60" />
                <div className="w-3 h-3 rounded-full bg-primary/60" />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                marte-erp.app/dashboard
              </span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs text-primary font-medium">Live</span>
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {kpiCards.map((kpi, i) => (
                <motion.div
                  key={kpi.label}
                  className={`glass-strong shadow-stack rounded-[16px] p-5 ${
                    i === 0 ? "animate-float" : i === 1 ? "animate-float-delayed" : "animate-float-slow"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <kpi.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
                  </div>
                  <p className="text-2xl font-bold text-foreground tabular-nums">{kpi.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Mini chart placeholder */}
            <div className="mt-6 rounded-[16px] bg-secondary/50 p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-foreground">შემოსავლის ტრენდი</span>
                <span className="text-xs text-muted-foreground tabular-nums">ბოლო 7 დღე</span>
              </div>
              <div className="flex items-end gap-1.5 h-16">
                {[40, 55, 45, 60, 75, 65, 85].map((h, i) => (
                  <motion.div
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ duration: 0.5, delay: 0.6 + i * 0.08 }}
                    className="flex-1 rounded-t-md bg-primary/20"
                  >
                    <div
                      className="w-full rounded-t-md bg-primary transition-all"
                      style={{ height: `${60 + Math.random() * 40}%` }}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
