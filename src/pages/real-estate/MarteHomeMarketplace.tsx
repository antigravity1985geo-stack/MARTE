import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, Filter, MapPin, Home, Key, Building2, Trees, 
  ChevronRight, ArrowRight, Star, Image as ImageIcon,
  CheckCircle2, Info, Building, Ruler, BedDouble
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/stores/useAuthStore';

const propertyTypes = [
  { id: 'apartment', label: 'ბინა', icon: Building2 },
  { id: 'house', label: 'სახლი', icon: Home },
  { id: 'villa', label: 'აგარაკი', icon: Trees },
  { id: 'private', label: 'კერძო სახლი', icon: Home },
  { id: 'block', label: 'კორპუსი', icon: Building },
  { id: 'land', label: 'მიწის ნაკვეთი', icon: Trees },
  { id: 'commercial', label: 'კომერციული', icon: Building2 },
];

const cities = ['თბილისი', 'ბათუმი', 'ქუთაისი', 'რუსთავი', 'ზუგდიდი', 'ფოთი', 'გორი'];

export default function MarteHomeMarketplace() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCity, setFilterCity] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: properties, isLoading } = useQuery({
    queryKey: ['public-properties', filterType, filterCity],
    queryFn: async () => {
      let query = supabase
        .from('re_properties')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (filterType !== 'all') query = query.eq('type', filterType);
      if (filterCity !== 'all') query = query.eq('city', filterCity);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="min-h-screen bg-[#07090d] text-slate-100 font-sans selection:bg-primary/30 selection:text-primary-foreground">
      {/* Premium Header/Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#07090d]/80 backdrop-blur-xl border-b border-white/5 py-4 px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/20 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <span className="text-xl font-black tracking-tighter gradient-text">MARTEHOME</span>
        </div>
        
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => isAuthenticated ? navigate('/app/real-estate/properties') : navigate('/auth')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-full px-6 shadow-lg shadow-primary/20 transition-all hover:scale-105"
          >
            განცხადების დამატება
          </Button>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6 md:px-12 max-w-7xl mx-auto">
        {/* Hero & Search area */}
        <section className="mb-16 text-center max-w-3xl mx-auto">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black tracking-tighter mb-6"
          >
            იპოვე შენი <span className="text-primary italic">ოცნების</span> სახლი
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-400 text-lg mb-10"
          >
            საუკეთესო განცხადებები მთელი საქართველოს მასშტაბით. მარტივი, სწრაფი და დაცული ძებნა.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-4 rounded-2xl md:rounded-full flex flex-col md:flex-row gap-4 items-center bg-white/5 border border-white/10"
          >
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <Input 
                placeholder="მოძებნეთ აგარაკი, ბინა, მიწა..." 
                className="pl-12 bg-transparent border-none focus-visible:ring-0 text-lg h-12 w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-full md:w-[160px] bg-white/5 border-white/10 rounded-full h-12">
                  <SelectValue placeholder="ტიპი" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ყველა ტიპი</SelectItem>
                  {propertyTypes.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterCity} onValueChange={setFilterCity}>
                <SelectTrigger className="w-full md:w-[160px] bg-white/5 border-white/10 rounded-full h-12">
                  <SelectValue placeholder="ქალაქი" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ყველა ქალაქი</SelectItem>
                  {cities.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </motion.div>
        </section>

        {/* Filters Quick Select */}
        <section className="flex flex-wrap gap-3 mb-12 justify-center">
          <Button 
            variant={filterType === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterType('all')}
            className="rounded-full px-6 border-white/10 transition-all hover:border-primary/50"
          >
            ყველა
          </Button>
          {propertyTypes.map(type => (
            <Button 
              key={type.id}
              variant={filterType === type.id ? 'default' : 'outline'}
              onClick={() => setFilterType(type.id)}
              className="rounded-full gap-2 px-6 border-white/10 transition-all hover:border-primary/50"
            >
              <type.icon className="h-4 w-4" />
              {type.label}
            </Button>
          ))}
        </section>

        {/* Listings Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          <AnimatePresence mode="popLayout">
            {isLoading ? (
              Array(8).fill(0).map((_, i) => (
                <div key={i} className="h-[400px] w-full rounded-3xl bg-white/5 animate-pulse border border-white/5" />
              ))
            ) : properties && properties.length > 0 ? (
              properties.map((prop, i) => (
                <motion.div
                  key={prop.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <Card className="group bg-white/5 border-white/10 rounded-3xl overflow-hidden hover:border-primary/50 transition-all duration-500 cursor-pointer hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <img 
                        src={prop.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c'} 
                        alt={prop.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute top-4 left-4 flex gap-2">
                        <Badge className="bg-primary/90 text-primary-foreground font-bold shadow-lg">
                          {prop.listing_type === 'sale' ? 'იყიდება' : prop.listing_type === 'rent' ? 'ქირავდება' : 'გირავდება'}
                        </Badge>
                        {prop.construction_status === 'new' && (
                          <Badge variant="secondary" className="backdrop-blur-md bg-white/10 text-white border-white/20">
                            მშენებარე
                          </Badge>
                        )}
                      </div>
                      <div className="absolute top-4 right-4">
                        <div className="w-10 h-10 rounded-full bg-[#07090d]/60 backdrop-blur-md flex items-center justify-center text-white/50 hover:text-red-500 transition-colors">
                          <Star className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-[#07090d] via-transparent to-transparent opacity-60" />
                    </div>
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 text-primary/80 text-xs font-bold uppercase tracking-widest mb-3">
                        {propertyTypes.find(t => t.id === prop.type)?.label || 'უძრავი ქონება'}
                        <span className="w-1 h-1 rounded-full bg-primary/30" />
                        {prop.city}
                      </div>
                      <h3 className="text-xl font-bold text-white mb-4 line-clamp-1 group-hover:text-primary transition-colors">
                        {prop.title}
                      </h3>
                      
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-slate-500 font-bold uppercase">ფართი</span>
                          <span className="text-sm font-semibold flex items-center gap-1.5">
                            <Ruler className="h-3.5 w-3.5 text-primary" />
                            {prop.area} მ²
                          </span>
                        </div>
                        <div className="flex flex-col gap-1 border-x border-white/5 px-4">
                          <span className="text-[10px] text-slate-500 font-bold uppercase">ოთახი</span>
                          <span className="text-sm font-semibold flex items-center gap-1.5">
                            <BedDouble className="h-3.5 w-3.5 text-primary" />
                            {prop.rooms}
                          </span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-slate-500 font-bold uppercase">სტატუსი</span>
                          <span className="text-[11px] font-semibold text-slate-300">
                            {prop.construction_status === 'new' ? 'ახალი' : 'ძველი'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <div className="text-2xl font-black text-white">
                          ${Number(prop.price).toLocaleString()}
                        </div>
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/20 group-hover:bg-primary transition-all duration-300">
                          <ArrowRight className="h-5 w-5 text-primary group-hover:text-primary-foreground transform group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-20 text-center">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6">
                  <Info className="h-10 w-10 text-slate-500" />
                </div>
                <h3 className="text-2xl font-bold text-slate-300 mb-2">განცხადება არ მოიძებნა</h3>
                <p className="text-slate-500">სცადეთ ფილტრების შეცვლა</p>
              </div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Footer (Simplified) */}
      <footer className="py-12 border-t border-white/5 mt-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <span className="text-xl font-black tracking-tighter text-white">MARTEHOME</span>
          </div>
          <p className="text-slate-500 text-sm">© 2026 MarteHome - ყველა უფლება დაცულია.</p>
          <div className="flex gap-4">
             <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">წესები</Button>
             <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">კონტაქტი</Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
