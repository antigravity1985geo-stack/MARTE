import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, FileText, Calculator, Users, Truck, ShoppingCart,
  BarChart3, Wallet, Building2, ClipboardList, Settings, Shield,
  Database, Layers, RefreshCw, Receipt, CreditCard, Banknote,
  UserCheck, Clock, CalendarDays, FileSpreadsheet, PieChart,
  MonitorSmartphone, Wifi, HardDrive, Archive, BookOpen,
  Scale, TrendingUp, Landmark, Menu, X, Warehouse
} from "lucide-react";
import { useAuthStore } from "@/stores/useAuthStore";
import { useNavigate } from "react-router-dom";

const modules = [
  { icon: Package, label: "საწყობის მართვა", desc: "ინვენტარიზაცია და მარაგების კონტროლი" },
  { icon: ShoppingCart, label: "POS სისტემა", desc: "გაყიდვების ტერმინალი" },
  { icon: FileText, label: "ინვოისები", desc: "ავტომატური ინვოისინგი" },
  { icon: Calculator, label: "ბუღალტერია", desc: "ორადი ბუღალტერია" },
  { icon: Receipt, label: "RS.GE ინტეგრაცია", desc: "ზედნადებები და ფისკალიზაცია" },
  { icon: Users, label: "HR მენეჯმენტი", desc: "თანამშრომლების მართვა" },
  { icon: Banknote, label: "ხელფასები", desc: "სრული Payroll ავტომატიზაცია" },
  { icon: UserCheck, label: "Attendance", desc: "დასწრების აღრიცხვა" },
  { icon: Truck, label: "ლოჯისტიკა", desc: "მიწოდების მართვა" },
  { icon: BarChart3, label: "ანალიტიკა", desc: "ბიზნეს რეპორტინგი" },
  { icon: Wallet, label: "ფინანსები", desc: "ფულადი ნაკადების კონტროლი" },
  { icon: Building2, label: "ფილიალები", desc: "მრავალფილიალიანი მართვა" },
  { icon: CreditCard, label: "გადახდები", desc: "საბანკო ინტეგრაცია" },
  { icon: ClipboardList, label: "შეკვეთები", desc: "შეკვეთების ციკლი" },
  { icon: Settings, label: "კონფიგურაცია", desc: "სისტემის პარამეტრები" },
  { icon: Shield, label: "უსაფრთხოება", desc: "წვდომის კონტროლი" },
  { icon: Database, label: "მონაცემთა ბაზა", desc: "რეალურ-დროში სინქრონიზაცია" },
  { icon: Layers, label: "მოდულები", desc: "მოდულარული არქიტექტურა" },
  { icon: RefreshCw, label: "სინქრონიზაცია", desc: "ყველა მოწყობილობაზე" },
  { icon: Clock, label: "სამუშაო საათები", desc: "დროის აღრიცხვა" },
  { icon: CalendarDays, label: "კალენდარი", desc: "შვებულებები და გრაფიკი" },
  { icon: FileSpreadsheet, label: "ექსპორტი", desc: "Excel/PDF რეპორტები" },
  { icon: PieChart, label: "დეშბორდი", desc: "KPI მონიტორინგი" },
  { icon: MonitorSmartphone, label: "კროს-პლატფორმა", desc: "ყველა მოწყობილობაზე" },
  { icon: Wifi, label: "Real-time", desc: "მყისიერი განახლებები" },
  { icon: HardDrive, label: "ფაილების საცავი", desc: "დოკუმენტების მართვა" },
  { icon: Archive, label: "არქივი", desc: "ისტორიული მონაცემები" },
  { icon: BookOpen, label: "სასწავლო ცენტრი", desc: "ვიდეო გაკვეთილები" },
  { icon: Scale, label: "საგადასახადო", desc: "ავტომატური გამოთვლა" },
  { icon: TrendingUp, label: "პროგნოზირება", desc: "ბიზნეს ტრენდები" },
  { icon: Landmark, label: "საბანკო", desc: "ანგარიშსწორება" },
];

const navLinks = [
  { label: "მთავარი", href: "#hero" },
  { label: "ჩვენი პროექტი", href: "#modules", hasMega: true },
  { label: "ინდუსტრიები", href: "#industries" },
  { label: "ჩვენს შესახებ", href: "#about" },
  { label: "სამომავლო გეგმები", href: "#roadmap" },
  { label: "კონტაქტი", href: "#contact" },
];

const menuVariants = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 30 },
  },
  exit: { opacity: 0, y: 10, scale: 0.98, transition: { duration: 0.15 } },
};

const Navbar = () => {
  const [megaOpen, setMegaOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong shadow-stack">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="#hero" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
             <Warehouse className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight text-foreground">
            MARTE ERP
          </span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <div
              key={link.label}
              className="relative"
              onMouseEnter={() => link.hasMega && setMegaOpen(true)}
              onMouseLeave={() => link.hasMega && setMegaOpen(false)}
            >
              <a
                href={link.href}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-secondary"
              >
                {link.label}
              </a>

              {/* Mega Menu */}
              {link.hasMega && (
                <AnimatePresence>
                  {megaOpen && (
                    <motion.div
                      variants={menuVariants}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[800px] glass-strong shadow-stack-lg rounded-[20px] p-6"
                    >
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                        30+ მოდული ერთ ეკოსისტემაში
                      </p>
                      <div className="grid grid-cols-4 gap-2 text-left">
                        {modules.map((mod) => (
                          <div
                            key={mod.label}
                            className="flex items-start gap-3 p-3 rounded-xl hover:bg-accent transition-colors cursor-pointer group"
                          >
                            <mod.icon className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-foreground group-hover:text-accent-foreground">
                                {mod.label}
                              </p>
                              <p className="text-xs text-muted-foreground leading-snug">
                                {mod.desc}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          ))}
        </div>

        {/* CTA + Mobile */}
        <div className="flex items-center gap-3">
          {!isAuthenticated ? (
            <button
              onClick={() => navigate("/auth")}
              className="hidden sm:inline-flex items-center px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold animate-pulse-glow hover:brightness-110 transition-all font-sans"
            >
              ავტორიზაცია
            </button>
          ) : (
            <button
              onClick={() => navigate("/app")}
              className="hidden sm:inline-flex items-center px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold animate-pulse-glow hover:brightness-110 transition-all font-sans"
            >
              პანელი
            </button>
          )}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-secondary transition-colors text-foreground"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden glass-strong border-t border-border overflow-hidden"
          >
            <div className="container mx-auto px-6 py-4 flex flex-col gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 text-sm font-medium text-foreground rounded-lg hover:bg-secondary transition-colors"
                >
                  {link.label}
                </a>
              ))}
              {!isAuthenticated ? (
                <button
                  onClick={() => { navigate("/auth"); setMobileOpen(false); }}
                  className="mt-2 text-center px-5 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
                >
                  ავტორიზაცია
                </button>
              ) : (
                <button
                  onClick={() => { navigate("/app"); setMobileOpen(false); }}
                  className="mt-2 text-center px-5 py-3 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
                >
                  პანელი
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
