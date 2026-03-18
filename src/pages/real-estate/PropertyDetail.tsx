import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Ruler, BedDouble, Calendar, ArrowLeft, 
  Share2, Heart, ShieldCheck, Mail, Phone, Building,
  Image as ImageIcon, Info, Sparkles, Bath, Maximize2, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { MortgageCalculator } from '@/components/real-estate/MortgageCalculator';

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: property, isLoading } = useQuery({
    queryKey: ['property-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('re_properties')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "ლინკი კოპირებულია",
      description: "განცხადების ლინკი დაკოპირდა ბუფერში.",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/20"
        >
          <Building className="h-8 w-8 text-primary" />
        </motion.div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6 border border-white/10">
          <Info className="h-10 w-10 text-slate-500" />
        </div>
        <h1 className="text-3xl font-black mb-4 tracking-tight">განცხადება ვერ მოიძებნა</h1>
        <Button onClick={() => navigate('/martehome')} className="rounded-xl h-12 px-8">დაბრუნება მთავარზე</Button>
      </div>
    );
  }

  const specs = [
    { label: 'ფართი', value: `${property.area} მ²`, icon: Ruler, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'ოთახი', value: property.rooms, icon: BedDouble, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'მდგომარეობა', value: property.construction_status === 'new' ? 'ახალი' : 'ძველი', icon: Building, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'სართული', value: property.floor || 'N/A', icon: Layers, color: 'text-orange-400', bg: 'bg-orange-400/10' },
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans selection:bg-primary/30 selection:text-primary-foreground">
      <Toaster />
      
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[10%] left-[-5%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-[20%] right-[-5%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
      </div>

      {/* Modern Header */}
      <nav className="fixed top-0 inset-x-0 z-[60] bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 py-4 px-6 md:px-12 flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="gap-2 text-slate-400 hover:text-white hover:bg-white/5 font-bold rounded-xl"
        >
          <ArrowLeft className="h-5 w-5" /> უკან
        </Button>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleCopyLink}
            className="w-11 h-11 border-white/5 bg-white/5 rounded-xl hover:bg-white/10 text-slate-300"
          >
            <Share2 className="h-5 w-5" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            className="w-11 h-11 border-white/5 bg-white/5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-red-500"
          >
            <Heart className="h-5 w-5" />
          </Button>
        </div>
      </nav>

      <main className="relative z-10 pt-28 pb-32 px-4 md:px-12 max-w-[1400px] mx-auto">
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column: Content (8 Columns) */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* Gallery Section */}
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="relative rounded-[40px] overflow-hidden aspect-[16/9] shadow-2xl border border-white/5">
                <img 
                  src={property.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c'} 
                  alt={property.title}
                  className="w-full h-full object-cover"
                />
                
                <div className="absolute top-6 left-6 flex gap-3">
                  <Badge className="bg-primary/90 text-primary-foreground py-2 px-5 font-black text-xs uppercase tracking-widest shadow-xl">
                     {property.listing_type === 'sale' ? 'იყიდება' : property.listing_type === 'rent' ? 'ქირავდება' : 'გირავდება'}
                  </Badge>
                  {property.construction_status === 'new' && (
                    <Badge className="bg-slate-900/60 backdrop-blur-md text-white border border-white/10 py-2 px-5 font-black text-xs uppercase tracking-widest">
                      ახალი აშენებული
                    </Badge>
                  )}
                </div>

                <div className="absolute bottom-6 right-6">
                  <Button variant="outline" className="bg-slate-900/60 backdrop-blur-md border-white/10 text-white rounded-xl gap-2 font-bold h-12 px-6">
                    <ImageIcon className="h-5 w-5" /> ყველა ფოტო (1/{property.images?.length || 1})
                  </Button>
                </div>
              </div>

              {/* Thumbnails (Simulated) */}
              <div className="grid grid-cols-4 md:grid-cols-6 gap-4">
                {(property.images || Array(4).fill(null)).slice(0, 6).map((_, i) => (
                  <div key={i} className="aspect-square rounded-2xl overflow-hidden border border-white/10 cursor-pointer hover:border-primary/50 transition-colors bg-white/5">
                    <img 
                      src={property.images?.[i] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c'} 
                      className="w-full h-full object-cover opacity-50 hover:opacity-100 transition-opacity" 
                      alt={`Thumb ${i}`}
                    />
                  </div>
                ))}
              </div>
            </motion.section>

            {/* Title and Stats Grid */}
            <section className="space-y-10">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-10">
                <div className="space-y-4">
                  <Badge variant="outline" className="text-primary border-primary/20 font-black uppercase tracking-widest p-0 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" /> VIP განთავსება
                  </Badge>
                  <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">{property.title}</h1>
                  <div className="flex items-center gap-4 text-slate-400 font-bold">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      {property.city}, {property.district}
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(property.created_at).toLocaleDateString('ka-GE')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">ღირებულება</p>
                  <h2 className="text-5xl font-black text-white italic tracking-tighter">
                    ${Number(property.price).toLocaleString()}
                  </h2>
                </div>
              </div>

              {/* Advanced Specs Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {specs.map((spec, i) => (
                  <Card key={i} className="bg-white/5 border-white/5 p-6 rounded-[32px] group hover:border-primary/30 transition-all duration-300">
                    <div className={`w-12 h-12 rounded-2xl ${spec.bg} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                      <spec.icon className={`h-6 w-6 ${spec.color}`} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{spec.label}</p>
                      <p className="text-xl font-black text-white">{spec.value}</p>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Description */}
              <div className="space-y-6 pt-10 border-t border-white/5">
                <h3 className="text-2xl font-black tracking-tight">აღწერა</h3>
                <div className="p-8 bg-white/5 rounded-[40px] border border-white/5 text-lg text-slate-300 leading-relaxed font-medium">
                  {property.description || 'აღწერა არ არის მითითებული.'}
                </div>
              </div>

              {/* Feature Tags */}
              <div className="space-y-6">
                <h3 className="text-xl font-black tracking-tight uppercase tracking-widest text-[10px] text-slate-500">მახასიათებლები</h3>
                <div className="flex flex-wrap gap-3">
                  {['ცენტრალური გათბობა', 'კონდიცირება', 'ინტერნეტი', 'ტელევიზია', 'ავეჯი', 'აივანი', 'პარკინგი'].map((tag, i) => (
                    <Badge key={i} variant="outline" className="bg-white/5 border-white/10 text-slate-300 font-bold px-5 py-2 rounded-full">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Sidebar (4 Columns) */}
          <aside className="lg:col-span-4 space-y-8">
            
            {/* Contact Card */}
            <Card className="bg-white/5 border-white/10 backdrop-blur-xl rounded-[40px] p-8 sticky top-28 shadow-2xl">
              <div className="space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center border border-white/10 shadow-lg">
                    <Building className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-white">MARTE User</h4>
                    <p className="text-xs text-slate-500 font-black uppercase tracking-widest">განმთავსებელი</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <Button className="w-full h-16 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-2xl text-lg gap-3 shadow-[0_10px_30px_rgba(16,185,129,0.3)] transition-transform active:scale-95 group">
                    <Phone className="h-6 w-6 transform group-hover:rotate-12 transition-transform" />
                    +995 5** ** ** **
                  </Button>
                  <Button variant="outline" className="w-full h-16 bg-white/5 border-white/10 hover:bg-white/10 text-white font-black rounded-2xl gap-3">
                    <Mail className="h-6 w-6" />
                    წერილის მიწერა
                  </Button>
                </div>

                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg">
                      <ShieldCheck className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-black text-emerald-500 uppercase tracking-widest text-[11px]">ვერიფიცირებულია</span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">
                    ეს განცხადება და განმთავსებელი შემოწმდა MARTE-ს უსაფრთხოების გუნდის მიერ.
                  </p>
                </div>
              </div>
            </Card>

            {/* Inline Mortgage Calculator for this property */}
            <MortgageCalculator />

            {/* Quick Insights Card */}
            <Card className="bg-gradient-to-br from-primary/20 via-[#020617] to-[#020617] border border-primary/10 rounded-[40px] p-10 relative overflow-hidden group">
              <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[60px]" />
              <div className="relative z-10 space-y-6 text-center">
                <Sparkles className="h-10 w-10 text-primary mx-auto" />
                <h3 className="text-2xl font-black italic text-white tracking-tight">MARTE AI ინსაითი</h3>
                <p className="text-sm text-slate-400 font-bold leading-relaxed">
                  ეს ქონება 15%-ით იაფია ამ უბნის საშუალო ფასზე. საინვესტიციოდ მიმზიდველი წინადადებაა!
                </p>
                <Button variant="ghost" className="text-primary font-black uppercase tracking-widest text-[10px] gap-2 hover:bg-primary/10">
                  გაიგე მეტი <ArrowLeft className="h-4 w-4 rotate-180" />
                </Button>
              </div>
            </Card>

          </aside>
        </div>
      </main>
    </div>
  );
}
