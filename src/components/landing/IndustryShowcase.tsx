import { motion } from "framer-motion";
import { Stethoscope, UtensilsCrossed, ShoppingBag, ArrowRight, Building2 } from "lucide-react";

const industries = [
  {
    id: "clinic",
    title: "კლინიკის მართვა",
    desc: "პაციენტების რიგები, ელექტრონული რეცეპტები და სამედიცინო ისტორიები - ყველაფერი ერთ სივრცეში.",
    icon: Stethoscope,
    image: "/images/industries/clinic.png",
    color: "from-teal-500/20 to-emerald-500/20",
    border: "border-teal-500/20",
    text: "text-teal-500"
  },
  {
    id: "restaurant",
    title: "რესტორანი და POS",
    desc: "სწრაფი გაყიდვები, მაგიდების დაჯავშნა და სამზარეულოს ავტომატური მონიტორი. იდეალურია ნებისმიერი კვების ობიექტისთვის.",
    icon: UtensilsCrossed,
    image: "/images/industries/restaurant.png",
    color: "from-orange-500/20 to-red-500/20",
    border: "border-orange-500/20",
    text: "text-orange-500"
  },
  {
    id: "ecommerce",
    title: "E-commerce პლატფორმა",
    desc: "საკუთარი ონლაინ მაღაზია ინტეგრირებული საწყობთან და გადახდის სისტემებთან (TBC/BOG). გაყიდეთ ყველგან.",
    icon: ShoppingBag,
    image: "/images/industries/ecommerce.png",
    color: "from-blue-500/20 to-purple-500/20",
    border: "border-blue-500/20",
    text: "text-blue-500"
  },
  {
    id: "construction",
    title: "სამშენებლო ERP",
    desc: "პროექტების მართვა, Gantt Chart, ხარჯთაღრიცხვა და ტექნიკის კონტროლი. იდეალურია დეველოპერებისთვის.",
    icon: Building2,
    image: "/images/industries/construction.png",
    color: "from-yellow-500/20 to-orange-500/20",
    border: "border-yellow-500/20",
    text: "text-yellow-600"
  }
];

const IndustryShowcase = () => {
  return (
    <section id="industries" className="py-24 px-6 relative overflow-hidden bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-black tracking-tighter text-foreground mb-4"
          >
            სპეციალიზებული <span className="text-primary italic">გადაწყვეტილებები</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-lg max-w-2xl mx-auto"
          >
            ჩვენი ეკოსისტემა მორგებულია თქვენი ბიზნესის სპეციფიკაზე. აირჩიეთ მზა მოდულები და დაიწყეთ მართვა.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {industries.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -10 }}
              className={`relative group rounded-[32px] overflow-hidden border ${item.border} bg-gradient-to-br ${item.color} backdrop-blur-sm p-1`}
            >
              <div className="bg-background/40 p-8 rounded-[31px] h-full flex flex-col">
                <div className="flex items-center gap-4 mb-6">
                  <div className={`p-3 rounded-2xl bg-background shadow-stack-lg ${item.text}`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">
                    {item.title}
                  </h3>
                </div>
                
                <p className="text-muted-foreground text-sm leading-relaxed mb-8">
                  {item.desc}
                </p>

                <div className="relative aspect-video rounded-2xl overflow-hidden mb-6 shadow-stack border border-white/5">
                  <img 
                    src={item.image} 
                    alt={item.title} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                     <span className="text-white text-xs font-bold flex items-center gap-2">
                       დემოს ნახვა <ArrowRight className="w-3 h-3" />
                     </span>
                  </div>
                </div>

                <div className="mt-auto">
                   <div className="flex items-center gap-2 text-primary font-bold text-sm cursor-pointer hover:underline">
                     გაიგეთ მეტი <ArrowRight className="w-4 h-4" />
                   </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default IndustryShowcase;
