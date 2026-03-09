import { useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { CyberCard } from '@/components/CyberCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ShoppingCart, Package, Users, BarChart3, FileText, Truck,
  Factory, Wallet, Shield, Zap, Globe, TrendingUp,
  Warehouse, ChevronRight, MessageSquare, Mail, Phone, MapPin,
  CheckCircle2, Star, Rocket, Layout, Sparkles, Brain, ShieldCheck, Calculator
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function Index() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.9]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navbarLinks = [
    { name: 'მთავარი', href: '#hero' },
    { name: 'პერიფერია', href: '#features' },
    { name: 'ჩვენს შესახებ', href: '#about' },
    { name: 'კონტაქტი', href: '#contact' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0c10] text-foreground selection:bg-primary/30 selection:text-primary-foreground font-sans">

      {/* Navbar */}
      <nav className={`fixed top-4 inset-x-0 z-[100] transition-all duration-500 px-6`}>
        <div className={`max-w-7xl mx-auto px-6 py-4 flex items-center justify-between rounded-full transition-all duration-500 
          ${isScrolled ? 'glass-navbar shadow-2xl scale-[0.98]' : 'bg-transparent'}`}>
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20 group-hover:bg-primary/30 transition-all duration-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <Warehouse className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-black tracking-tighter gradient-text">MARTE</span>
          </div>

          <div className="hidden md:flex items-center gap-8 px-6 py-2 rounded-full bg-white/5 border border-white/5">
            {navbarLinks.map(link => (
              <a key={link.name} href={link.href} className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">
                {link.name}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {!isAuthenticated ? (
              <Button onClick={() => navigate('/auth')} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 px-6 font-bold rounded-full">
                დასაწყისი
              </Button>
            ) : (
              <Button onClick={() => navigate('/app')} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 px-6 font-bold rounded-full text-xs">
                პანელი
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header id="hero" className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden hero-banner">
        {/* Dynamic Mesh & Vignette Overlay */}
        <div className="absolute inset-0 mesh-gradient opacity-30 mix-blend-overlay pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-[#0a0c10] to-transparent pointer-events-none" />

        <motion.div
          style={{ opacity, scale }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="relative z-10 text-center max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-primary-foreground text-xs font-bold mb-8 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>AI-ით გაძლიერებული ERP & POS სისტემა</span>
          </div>


        </motion.div>
      </header>

      {/* Stats Section */}
      <section className="py-20 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
            {[
              { label: 'ჩატარებული ტრანზაქცია', value: '1M+' },
              { label: 'ბედნიერი კლიენტი', value: '500+' },
              { label: 'Uptime სტატისტიკა', value: '99.9%' },
              { label: 'მოდულების რაოდენობა', value: '45+' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="space-y-1"
              >
                <p className="text-3xl sm:text-4xl font-black text-white">{stat.value}</p>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 max-w-7xl mx-auto relative">
        <div className="text-center mb-16">
          <h2 className="text-sm font-bold text-primary uppercase tracking-[0.3em] mb-4">შესაძლებლობები</h2>
          <h3 className="text-3xl sm:text-4xl font-black tracking-tighter text-white">ყველაფერი ერთ <span className="text-primary italic">ეკოსისტემაში</span></h3>
        </div>

        <div className="bento-grid">
          {/* Main Feature - POS */}
          <motion.div variants={itemVariants} className="bento-item group bento-item-1">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                <ShoppingCart className="h-8 w-8 text-primary" />
              </div>
              <h4 className="text-2xl font-black text-white">POS 2.0</h4>
              <p className="text-muted-foreground font-medium">სწრაფი გაყიდვები, ოფლაინ რეჟიმი და სრული სინქრონიზაცია.</p>
            </div>
            <div className="mt-8 p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="flex justify-between items-center text-xs font-bold text-primary uppercase mb-2">
                <span>სისტემის სისწრაფე</span>
                <span>99.9%</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[95%] shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
              </div>
            </div>
          </motion.div>

          {/* AI Feature */}
          <motion.div variants={itemVariants} className="bento-item bento-item-2 bg-gradient-to-br from-accent/20 to-transparent">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-2xl bg-accent/20 flex items-center justify-center border border-accent/20">
                <Zap className="h-8 w-8 text-accent" />
              </div>
              <div>
                <h4 className="text-xl font-black text-white">Smart Inventory</h4>
                <p className="text-sm text-muted-foreground font-medium">AI პროგნოზირება და ავტომატური მარაგები.</p>
              </div>
            </div>
          </motion.div>

          {/* CRM */}
          <motion.div variants={itemVariants} className="bento-item group bento-item-3">
            <Users className="h-8 w-8 text-info mb-4" />
            <h4 className="text-lg font-bold text-white">CRM</h4>
            <p className="text-xs text-muted-foreground">კლიენტების ლოიალობა.</p>
          </motion.div>

          {/* Finance */}
          <motion.div variants={itemVariants} className="bento-item group bento-item-4">
            <Calculator className="h-8 w-8 text-success mb-4" />
            <h4 className="text-lg font-bold text-white">ბუღალტერია</h4>
            <p className="text-xs text-muted-foreground">BASS სტანდარტები.</p>
          </motion.div>

          {/* Logistic */}
          <motion.div variants={itemVariants} className="bento-item group bento-item-2 !grid-column-span-2">
            <div className="flex items-center justify-between w-full">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Truck className="h-6 w-6 text-destructive" />
                  <span className="text-xl font-black text-white">ლოჯისტიკა</span>
                </div>
                <p className="text-sm text-muted-foreground font-medium">მიწოდების თრეკინგი და მარშრუტები.</p>
              </div>
              <div className="h-20 w-32 bg-white/5 rounded-xl border border-white/5 flex items-center justify-center">
                <Globe className="h-10 w-10 text-destructive/50" />
              </div>
            </div>
          </motion.div>

          {/* Factory */}
          <motion.div variants={itemVariants} className="bento-item group bento-item-3">
            <Factory className="h-8 w-8 text-warning mb-4" />
            <h4 className="text-lg font-bold text-white">წარმოება</h4>
          </motion.div>

          {/* Analytics */}
          <motion.div variants={itemVariants} className="bento-item group bento-item-3">
            <BarChart3 className="h-8 w-8 text-primary mb-4" />
            <h4 className="text-lg font-bold text-white">BI ანალიზი</h4>
          </motion.div>

        </div>
      </section>

      {/* About Us */}
      <section id="about" className="py-24 px-6 max-w-7xl mx-auto overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center border border-accent/20">
              <Brain className="h-8 w-8 text-accent-foreground" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tighter text-white">ჩვენი მისია — თქვენი <span className="text-accent underline decoration-accent/30 underline-offset-8">მართვა</span></h2>
            <p className="text-xl text-muted-foreground leading-relaxed">
              MARTE შეიქმნა თანამედროვე ქართული ბიზნესის მოთხოვნების გათვალისწინებით. ჩვენი მიზანია რუტინული პროცესების ავტომატიზაცია, რათა თქვენ მეტი დრო დაუთმოთ სტრატეგიულ განვითარებას.
            </p>
            <div className="space-y-4">
              {[
                'ლოკალური მხარდაჭერა 24/7',
                'სრული შესაბამისობა ქართულ კანონმდებლობასთან',
                'ავტომატური RS.GE ინტეგრაცია',
                'AI-ზე დაფუძნებული პროგნოზირება'
              ].map(item => (
                <div key={item} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                    <CheckCircle2 className="h-3 w-3 text-primary" />
                  </div>
                  <span className="font-semibold text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="absolute inset-0 bg-accent/30 blur-[100px] rounded-full opacity-20" />
            <div className="glass-card p-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <Star className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">Senior Architect Experience</p>
                  <p className="text-sm text-muted-foreground">დახვეწილი ინჟინერია</p>
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="h-12 w-1.5 rounded-full bg-primary" />
                  <p className="text-sm italic leading-relaxed text-muted-foreground">
                    "ჩვენ არ ვაშენებთ უბრალო პროგრამას, ჩვენ ვქმნით ბიზნესის ციფრულ ნერვულ სისტემას, რომელიც რეაგირებს ყველა ცვლილებაზე."
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">სისტემის მდგრადობა</span>
                    <span className="text-xs font-black text-primary">99.9%</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: '99.9%' }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="h-full bg-primary shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-32 px-6 bg-gradient-to-b from-transparent to-primary/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div className="space-y-8">
              <h2 className="text-3xl sm:text-5xl font-black tracking-tighter text-white">დაგვიკავშირდით</h2>
              <p className="text-xl text-muted-foreground">
                მზად ხართ სცადოთ? მიიღეთ 14-დღიანი უფასო დემო ვერსია ან მოითხოვეთ პერსონალური კონსულტაცია.
              </p>

              <div className="space-y-6 pt-4">
                {[
                  { icon: Mail, label: 'Email', value: 'sales@marte.ge' },
                  { icon: Phone, label: 'ტელეფონი', value: '+995 322 00 00 00' },
                  { icon: MapPin, label: 'მისამართი', value: 'თბილისი, საქართველო' },
                ].map(info => (
                  <div key={info.label} className="flex items-center gap-4 group">
                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-primary/50 transition-colors">
                      <info.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase">{info.label}</p>
                      <p className="text-lg font-semibold text-white">{info.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="p-8 rounded-3xl border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl"
            >
              <form className="grid grid-cols-1 gap-6" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest font-bold">სახელი</Label>
                    <Input className="bg-white/5 border-white/10 rounded-xl py-6" placeholder="გიორგი" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest font-bold">გვარი</Label>
                    <Input className="bg-white/5 border-white/10 rounded-xl py-6" placeholder="ბერიძე" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest font-bold">Email</Label>
                  <Input type="email" className="bg-white/5 border-white/10 rounded-xl py-6" placeholder="email@example.ge" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-widest font-bold">შეტყობინება</Label>
                  <Textarea className="bg-white/5 border-white/10 rounded-xl min-h-[120px]" placeholder="რით შეგვიძლია დაგეხმაროთ?" />
                </div>
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground py-5 rounded-2xl font-bold shadow-lg shadow-primary/20 h-auto">
                  <MessageSquare className="mr-2 h-5 w-5" /> შეტყობინების გაგზავნა
                </Button>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
          <div className="flex items-center gap-2">
            <Warehouse className="h-5 w-5 text-primary" />
            <span className="text-xl font-black tracking-tighter text-white">MARTE</span>
            <span className="text-muted-foreground text-sm ml-2">© 2026 ყველა უფლება დაცულია.</span>
          </div>

          <div className="flex gap-8 text-sm font-medium text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">წესები და პირობები</a>
            <a href="#" className="hover:text-primary transition-colors">კონფიდენციალურობა</a>
            <a href="#" className="hover:text-primary transition-colors">დახმარება</a>
          </div>

          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:border-primary/50 transition-colors cursor-pointer">
              <Globe className="h-5 w-5 text-muted-foreground hover:text-primary" />
            </div>
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center border border-white/10 hover:border-primary/50 transition-colors cursor-pointer">
              <ShieldCheck className="h-5 w-5 text-muted-foreground hover:text-primary" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={`block text-foreground ${className}`}>{children}</label>;
}
