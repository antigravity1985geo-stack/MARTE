import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { 
  MapPin, Ruler, BedDouble, Calendar, ArrowLeft, 
  Share2, Heart, ShieldCheck, Mail, Phone, Building2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#07090d] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-[#07090d] flex flex-col items-center justify-center text-white">
        <h1 className="text-2xl font-bold mb-4">განცხადება ვერ მოიძებნა</h1>
        <Button onClick={() => navigate('/martehome')}>დაბრუნება</Button>
      </div>
    );
  }

  const specItems = [
    { label: 'ფართი', value: `${property.area} მ²`, icon: Ruler },
    { label: 'ოთახი', value: property.rooms, icon: BedDouble },
    { label: 'მდგომარეობა', value: property.construction_status === 'new' ? 'ახალი' : 'ძველი', icon: Building2 },
    { label: 'ქალაქი', value: property.city, icon: MapPin },
  ];

  return (
    <div className="min-h-screen bg-[#07090d] text-slate-100 pb-20">
      {/* Header */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-[#07090d]/60 backdrop-blur-xl border-b border-white/5 py-4 px-6 md:px-12 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 text-slate-400 hover:text-white">
          <ArrowLeft className="h-5 w-5" /> უკან
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white border border-white/5 rounded-xl">
            <Share2 className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white border border-white/5 rounded-xl">
            <Heart className="h-5 w-5" />
          </Button>
        </div>
      </nav>

      <main className="pt-24 max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Gallery & Description */}
          <div className="lg:col-span-2 space-y-8">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="aspect-[16/9] rounded-3xl overflow-hidden border border-white/10 relative shadow-2xl"
            >
              <img 
                src={property.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c'} 
                alt={property.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-6 left-6 flex gap-3">
                <Badge className="bg-primary/90 text-primary-foreground py-1.5 px-4 font-bold text-sm">
                   {property.listing_type === 'sale' ? 'იყიდება' : 'ქირავდება'}
                </Badge>
                {property.construction_status === 'new' && (
                  <Badge variant="outline" className="bg-black/40 backdrop-blur-md text-white border-white/20 py-1.5 px-4">
                    მშენებარე
                  </Badge>
                )}
              </div>
            </motion.div>

            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl md:text-4xl font-black tracking-tight">{property.title}</h1>
                <div className="text-3xl font-black text-primary">
                  ${Number(property.price).toLocaleString()}
                </div>
              </div>

              <div className="flex flex-wrap gap-4 py-6 border-y border-white/5">
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-slate-200">{property.city}, {property.district}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 border-l border-white/10 pl-4">
                  <Calendar className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-slate-200">დამატებულია: {new Date(property.created_at).toLocaleDateString('ka-GE')}</span>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-xl font-bold">აღწერა</h2>
                <p className="text-slate-400 leading-relaxed whitespace-pre-wrap">
                  {property.description || 'აღწერა არ არის მითითებული.'}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {specItems.map((item, i) => (
                  <Card key={i} className="bg-white/5 border-white/5 p-4 rounded-2xl">
                    <div className="flex items-center gap-3 mb-2">
                       <item.icon className="h-5 w-5 text-primary" />
                       <span className="text-xs font-bold text-slate-500 uppercase">{item.label}</span>
                    </div>
                    <div className="text-lg font-bold text-slate-200">{item.value}</div>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar / Contact */}
          <div className="space-y-6">
            <Card className="bg-white/5 border-white/10 rounded-3xl p-6 sticky top-28">
              <h3 className="text-lg font-bold mb-6">დაუკავშირდით გამყიდველს</h3>
              <div className="space-y-4">
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12 rounded-xl gap-2 shadow-lg shadow-primary/20">
                  <Phone className="h-5 w-5" /> +995 5** ** ** **
                </Button>
                <Button variant="outline" className="w-full h-12 rounded-xl border-white/10 hover:bg-white/5 gap-2">
                  <Mail className="h-5 w-5" /> შეტყობინების გაგზავნა
                </Button>
              </div>

              <div className="mt-8 pt-8 border-t border-white/5">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border border-white/10">
                    <Building2 className="h-6 w-6 text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold uppercase">განმთავსებელი</p>
                    <p className="font-bold text-white">MARTE User</p>
                  </div>
                </div>

                <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-primary">ვერიფიცირებული</p>
                    <p className="text-xs text-slate-400 italic">ეს განცხადება შემოწმდა Marte-ს გუნდის მიერ.</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-primary/20 to-transparent border-primary/10 rounded-3xl p-6">
              <h3 className="text-lg font-black tracking-tight text-white mb-2 italic">გსურთ განთავსება?</h3>
              <p className="text-sm text-slate-400 mb-6">დაარეგისტრირეთ თქვენი ბიზნესი Marte-ში და მიიღეთ სრული CRM წვდომა უძრავი ქონების მართვისთვის.</p>
              <Button onClick={() => navigate('/auth')} className="w-full bg-white text-black hover:bg-slate-200 font-bold rounded-xl">
                რეგისტრაცია
              </Button>
            </Card>
          </div>

        </div>
      </main>
    </div>
  );
}
