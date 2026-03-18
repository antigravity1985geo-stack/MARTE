import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, Filter, MapPin, Home, Key, Building2, Trees, 
  ChevronRight, ArrowRight, Star, Image as ImageIcon,
  CheckCircle2, Info, Building, Ruler, BedDouble,
  Heart, Share2, Calculator, LayoutGrid, List, Sparkles, SlidersHorizontal
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem, 
  CarouselNext, 
  CarouselPrevious 
} from '@/components/ui/carousel';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from '@/components/ui/sheet';
import { useAuthStore } from '@/stores/useAuthStore';
import { MortgageCalculator } from '@/components/real-estate/MortgageCalculator';

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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

  const featuredProperties = properties?.slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans selection:bg-primary/30 selection:text-primary-foreground">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      {/* Premium Header/Navbar */}
      <nav className="fixed top-0 inset-x-0 z-[60] bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 py-4 px-6 md:px-12 flex items-center justify-between">
        <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-transform group-hover:scale-110">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
            MARTE<span className="text-primary italic">HOME</span>
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            className="hidden md:flex text-slate-400 hover:text-white hover:bg-white/5 font-bold"
            onClick={() => navigate('/martehome/search')}
          >
            ძიება
          </Button>
          <Button 
            onClick={() => isAuthenticated ? navigate('/app/real-estate/properties') : navigate('/auth')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl px-6 shadow-lg shadow-primary/20 transition-all active:scale-95"
          >
            განცხადების დამატება
          </Button>
        </div>
      </nav>

      <main className="relative z-10 pt-28 pb-20 px-4 md:px-12 max-w-[1600px] mx-auto">
        
        {/* Hero Section with Search overlap */}
        <section className="relative mb-24">
          <div className="relative rounded-[40px] overflow-hidden bg-slate-900 aspect-[21/9] md:aspect-[21/7]">
            <img 
              src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&q=80&w=2000" 
              className="absolute inset-0 w-full h-full object-cover opacity-60"
              alt="Hero"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#020617] via-[#020617]/40 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-center px-8 md:px-16 max-w-4xl">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                <Badge className="bg-primary/20 text-primary border-primary/20 mb-4 py-1.5 px-4 rounded-full backdrop-blur-md uppercase tracking-widest text-[10px] font-black">
                  პრემიუმ უძრავი ქონება
                </Badge>
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-[0.9]">
                  იპოვე შენი <br />
                  <span className="text-primary italic">ოცნების</span> სახლი
                </h1>
                <p className="text-slate-300 text-lg md:text-xl max-w-xl leading-relaxed mb-8">
                  საუკეთესო განცხადებები მთელი საქართველოს მასშტაბით. მარტივი, სწრაფი და დაცული ძებნა თქვენთვის.
                </p>
              </motion.div>
            </div>
          </div>

          {/* Search Bar - Positioned BELOW the image without overlap */}
          <div className="mt-8 px-4 md:px-12 z-20 max-w-5xl mx-auto">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card p-1.5 rounded-2xl bg-[#0f172a]/80 backdrop-blur-2xl border border-white/5 shadow-xl flex flex-col md:flex-row gap-2 items-center"
            >
              <div className="relative flex-1 w-full pl-3">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                <Input 
                  placeholder="ძებნა (აგარაკი, ბინა...)" 
                  className="pl-10 bg-transparent border-none focus-visible:ring-0 text-base h-11 w-full placeholder:text-slate-500 text-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                <Select value={filterCity} onValueChange={setFilterCity}>
                  <SelectTrigger className="w-full md:w-[160px] bg-white/5 border-white/5 rounded-xl h-10 text-sm text-slate-300">
                    <MapPin className="h-3.5 w-3.5 mr-2 text-primary" />
                    <SelectValue placeholder="ქალაქი" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-white">
                    <SelectItem value="all">ყველა ქალაქი</SelectItem>
                    {cities.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" className="rounded-xl h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground font-bold group">
                  ძიება
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mt-24">
          
          {/* Main Content Area (8 Columns) */}
          <div className="lg:col-span-8 space-y-16">
            
            {/* Featured Listings Carousel */}
            {featuredProperties.length > 0 && (
              <section className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                      <Star className="h-4 w-4 text-yellow-500" />
                    </div>
                    <h2 className="text-2xl font-black tracking-tight">VIP განცხადებები</h2>
                  </div>
                  <div className="flex gap-2">
                    {/* Embla navigation will be added by custom controls if needed */}
                  </div>
                </div>

                <Carousel opts={{ align: "start", loop: true }} className="w-full">
                  <CarouselContent className="-ml-4">
                    {featuredProperties.map((prop) => (
                      <CarouselItem key={prop.id} className="pl-4 md:basis-1/2 lg:basis-1/2">
                        <Card 
                          className="relative h-[320px] rounded-[32px] overflow-hidden border-none group cursor-pointer"
                          onClick={() => navigate(`/martehome/property/${prop.id}`)}
                        >
                          <img 
                            src={prop.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c'} 
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            alt={prop.title}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent" />
                          <div className="absolute top-4 left-4">
                            <Badge className="bg-primary text-white font-black shadow-lg">TOP</Badge>
                          </div>
                          <div className="absolute bottom-6 left-6 right-6">
                            <h3 className="text-xl font-black text-white mb-2 line-clamp-1">{prop.title}</h3>
                            <div className="flex items-center justify-between">
                              <span className="text-2xl font-black text-primary italic">${Number(prop.price).toLocaleString()}</span>
                              <div className="flex items-center gap-3 text-slate-300 text-sm font-bold">
                                <span className="flex items-center gap-1"><Ruler className="h-3.5 w-3.5" /> {prop.area}მ²</span>
                                <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" /> {prop.rooms}</span>
                              </div>
                            </div>
                          </div>
                        </Card>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <div className="flex justify-end gap-2 mt-4">
                    <CarouselPrevious className="static translate-y-0 h-10 w-10 bg-white/5 border-white/10 text-white hover:bg-white/10" />
                    <CarouselNext className="static translate-y-0 h-10 w-10 bg-white/5 border-white/10 text-white hover:bg-white/10" />
                  </div>
                </Carousel>
              </section>
            )}

            {/* List Header & View Options */}
            <section className="space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
                <div className="space-y-1">
                  <h2 className="text-3xl font-black tracking-tight">ყველა განცხადება</h2>
                  <p className="text-slate-500 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    ნაპოვნია {properties?.length || 0} ქონება
                  </p>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="flex bg-white/5 p-1 rounded-xl border border-white/10">
                    <Button 
                      variant={viewMode === 'grid' ? 'default' : 'ghost'} 
                      size="sm" 
                      onClick={() => setViewMode('grid')}
                      className="rounded-lg h-9 w-9 p-0"
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant={viewMode === 'list' ? 'default' : 'ghost'} 
                      size="sm" 
                      onClick={() => setViewMode('list')}
                      className="rounded-lg h-9 w-9 p-0"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="rounded-xl border-white/10 h-11 px-4 gap-2 flex md:hidden">
                        <SlidersHorizontal className="h-4 w-4" /> ფილტრები
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="bg-slate-900 border-white/10 text-white w-[300px]">
                      <SheetHeader className="mb-8">
                        <SheetTitle className="text-white">ფილტრები</SheetTitle>
                      </SheetHeader>
                      <SidebarFilters 
                        currentType={filterType} 
                        setType={setFilterType}
                        currentCity={filterCity}
                        setCity={setFilterCity} 
                      />
                    </SheetContent>
                  </Sheet>
                </div>
              </div>

              {/* Grid/List of Properties */}
              <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8" : "space-y-6"}>
                <AnimatePresence mode="popLayout">
                  {isLoading ? (
                    Array(6).fill(0).map((_, i) => (
                      <div key={i} className="h-[400px] w-full rounded-[32px] bg-white/5 animate-pulse border border-white/5" />
                    ))
                  ) : properties && properties.length > 0 ? (
                    properties.map((prop, i) => (
                      <motion.div
                        key={prop.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.4, delay: i * 0.05 }}
                      >
                        <Card 
                          className={`group bg-white/5 border-white/10 rounded-[32px] overflow-hidden hover:border-primary/50 transition-all duration-500 cursor-pointer hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)] ${viewMode === 'list' ? 'flex flex-row h-64' : ''}`}
                          onClick={() => navigate(`/martehome/property/${prop.id}`)}
                        >
                          <div className={`relative overflow-hidden ${viewMode === 'list' ? 'w-1/3' : 'aspect-[4/3]'}`}>
                            <img 
                              src={prop.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c'} 
                              alt={prop.title}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute top-4 left-4 flex gap-2">
                              <Badge className="bg-primary/90 text-primary-foreground font-black shadow-lg">
                                {prop.listing_type === 'sale' ? 'იყიდება' : prop.listing_type === 'rent' ? 'ქირავდება' : 'გირავდება'}
                              </Badge>
                            </div>
                            <div className="absolute top-4 right-4">
                              <Button variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-slate-900/60 backdrop-blur-md text-white/50 hover:text-red-500 hover:bg-slate-900 border border-white/5">
                                <Heart className="h-5 w-5" />
                              </Button>
                            </div>
                          </div>
                          <CardContent className={`p-6 ${viewMode === 'list' ? 'flex-1 flex flex-col justify-center' : ''}`}>
                            <div className="flex items-center gap-2 text-primary/80 text-[10px] font-black uppercase tracking-[0.2em] mb-3">
                              {propertyTypes.find(t => t.id === prop.type)?.label || 'უძრავი ქონება'}
                              <span className="w-1.5 h-1.5 rounded-full bg-primary/30" />
                              {prop.city}
                            </div>
                            <h3 className="text-xl font-black text-white mb-4 line-clamp-1 group-hover:text-primary transition-colors">
                              {prop.title}
                            </h3>
                            
                            <div className="grid grid-cols-3 gap-2 mb-6 p-4 bg-white/5 rounded-2xl border border-white/5">
                              <div className="flex flex-col">
                                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">ფართი</span>
                                <span className="text-sm font-black flex items-center gap-1.5 text-slate-200 uppercase">
                                  {prop.area} მ²
                                </span>
                              </div>
                              <div className="flex flex-col border-x border-white/10 px-4">
                                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">ოთახი</span>
                                <span className="text-sm font-black text-slate-200">
                                  {prop.rooms}
                                </span>
                              </div>
                              <div className="flex flex-col pl-2">
                                <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">ქალაქი</span>
                                <span className="text-[11px] font-black text-slate-200 truncate">
                                  {prop.city}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                              <div className="text-2xl font-black text-white italic">
                                ${Number(prop.price).toLocaleString()}
                              </div>
                              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary transition-all duration-300">
                                <ArrowRight className="h-5 w-5 text-primary group-hover:text-white transform group-hover:translate-x-0.5 transition-transform" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))
                  ) : (
                    <div className="col-span-full py-32 text-center">
                      <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-6 border border-white/10">
                        <Info className="h-12 w-12 text-slate-500" />
                      </div>
                      <h3 className="text-3xl font-black text-slate-300 mb-2">განცხადება არ მოიძებნა</h3>
                      <p className="text-slate-500 font-bold">სცადეთ ფილტრების შეცვლა ან სხვა ძიების სიტყვა</p>
                    </div>
                  )}
                </AnimatePresence>
              </div>
            </section>
          </div>

          {/* Sidebar Area (4 Columns) */}
          <aside className="lg:col-span-4 space-y-8">
            
            {/* Desktop Filters (Persistent) */}
            <div className="hidden lg:block">
              <Card className="bg-white/5 border-white/10 backdrop-blur-xl rounded-3xl p-6 sticky top-28">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <SlidersHorizontal className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="text-xl font-black tracking-tight">ფილტრაცია</h3>
                </div>
                <SidebarFilters 
                  currentType={filterType} 
                  setType={setFilterType}
                  currentCity={filterCity}
                  setCity={setFilterCity} 
                />
              </Card>
            </div>

            {/* Mortgage Calculator Widget */}
            <MortgageCalculator />

            {/* Premium CTA Card */}
            <Card className="relative overflow-hidden rounded-[40px] border-none group">
              <img 
                src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800" 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                alt="CTA"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-primary/95 to-primary/40" />
              <div className="relative p-10 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-6 border border-white/20">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-3xl font-black tracking-tight text-white mb-4 italic leading-tight">საკუთარი ბროკერი ერთ აპლიკაციაში</h3>
                <p className="text-white/80 text-sm font-bold mb-8">მართეთ თქვენი უძრავი ქონება პროფესიონალურად MARTE-ს დახმარებით.</p>
                <Button 
                  onClick={() => navigate('/auth')} 
                  className="w-full bg-white text-black hover:bg-slate-100 font-black h-14 rounded-2xl shadow-xl transition-all active:scale-95"
                >
                  გაწევრიანება
                </Button>
              </div>
            </Card>

          </aside>
        </div>
      </main>

      {/* Modern Footer */}
      <footer className="relative z-10 py-20 border-t border-white/5 mt-32 bg-[#020617]">
        <div className="max-w-[1600px] mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="md:col-span-1 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <span className="text-2xl font-black tracking-tighter text-white">MARTE<span className="text-primary italic">HOME</span></span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed font-bold">
                უძრავი ქონების მართვისა და ძიების ინოვაციური პლატფორმა საქართველოში.
              </p>
            </div>
            {['სერვისები', 'კომპანია', 'დახმარება', 'სოციალური'].map((title, i) => (
              <div key={i} className="space-y-6">
                <h4 className="text-sm font-black text-white uppercase tracking-widest">{title}</h4>
                <ul className="space-y-4">
                  {[1, 2, 3].map(j => (
                    <li key={j} className="text-slate-500 text-sm hover:text-primary cursor-pointer transition-colors font-bold">ლინკი #{j}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-xs font-bold italic">© 2026 MarteHome Ecosystem. All rights reserved.</p>
            <div className="flex gap-8">
               <span className="text-xs text-slate-500 hover:text-white cursor-pointer font-bold">კონფიდენციალურობა</span>
               <span className="text-xs text-slate-500 hover:text-white cursor-pointer font-bold">წესები</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SidebarFilters({ currentType, setType, currentCity, setCity }: any) {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ქონების ტიპი</label>
        <div className="grid grid-cols-1 gap-2">
          <Button 
            variant={currentType === 'all' ? 'default' : 'outline'}
            onClick={() => setType('all')}
            className="justify-start rounded-xl border-white/5 h-12 px-4 gap-3 font-bold"
          >
            <LayoutGrid className="h-4 w-4" />
            ყველა ტიპი
          </Button>
          {propertyTypes.map((type) => (
            <Button 
              key={type.id}
              variant={currentType === type.id ? 'default' : 'outline'}
              onClick={() => setType(type.id)}
              className="justify-start rounded-xl border-white/5 h-12 px-4 gap-3 font-bold"
            >
              <type.icon className="h-4 w-4" />
              {type.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-4 pt-8 border-t border-white/5">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">პოპულარული ქალაქები</label>
        <div className="flex flex-wrap gap-2">
          <Badge 
            className={`cursor-pointer px-4 py-1.5 rounded-full transition-all ${currentCity === 'all' ? 'bg-primary text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:border-primary/50'}`}
            onClick={() => setCity('all')}
          >
            ყველა
          </Badge>
          {cities.map((city) => (
            <Badge 
              key={city}
              className={`cursor-pointer px-4 py-1.5 rounded-full transition-all ${currentCity === city ? 'bg-primary text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:border-primary/50'}`}
              onClick={() => setCity(city)}
            >
              {city}
            </Badge>
          ))}
        </div>
      </div>

      <div className="pt-8 border-t border-white/5">
        <Button className="w-full bg-white/5 border-white/10 hover:bg-red-500/20 hover:text-red-500 hover:border-red-500/50 text-slate-400 font-black h-12 rounded-xl" onClick={() => { setType('all'); setCity('all'); }}>
          ფილტრების გასუფთავება
        </Button>
      </div>
    </div>
  );
}
