import { useOutletContext } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Clock, ChevronRight, Sparkles } from "lucide-react";

export const PortalBooking = () => {
  const { tenant } = useOutletContext<{ tenant: any }>();

  const services = [
    { id: 1, name: "კონსულტაცია", price: "45.00 ₾", duration: "30 წთ", icon: <CalendarIcon className="h-5 w-5" /> },
    { id: 2, name: "დიაგნოსტიკა", price: "60.00 ₾", duration: "45 წთ", icon: <Clock className="h-5 w-5" /> },
    { id: 3, name: "თერაპია", price: "80.00 ₾", duration: "60 წთ", icon: <Sparkles className="h-5 w-5" /> },
  ];

  return (
    <div className="p-4 space-y-8 animate-slide-up">
      <div className="flex flex-col gap-2 pt-4">
        <Badge className="w-fit bg-portal-primary/10 text-portal-primary border-none text-[10px] font-black uppercase tracking-widest px-3 py-1">
           Step 1: Select Service
        </Badge>
        <h1 className="text-3xl font-black tracking-tighter">ვიზიტის დაჯავშნა</h1>
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider opacity-60">
           {tenant.name} &bull; Booking Portal
        </p>
      </div>

      <div className="space-y-4">
        {services.map((service) => (
          <Card key={service.id} className="group glass-card cursor-pointer border-none shadow-xl hover:shadow-portal-primary/10 transition-all duration-500 overflow-hidden">
            <CardContent className="p-6 flex items-center justify-between bg-white/90 dark:bg-slate-900/90 group-hover:bg-white dark:group-hover:bg-slate-900 transition-colors">
              <div className="flex items-center gap-5">
                <div className="h-14 w-14 portal-bg-primary/10 portal-text-primary flex items-center justify-center rounded-2xl group-hover:scale-110 transition-transform duration-500">
                   {service.icon}
                </div>
                <div>
                  <p className="text-lg font-black dark:text-white leading-tight">{service.name}</p>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground font-bold uppercase tracking-widest">
                    <span className="flex items-center gap-1.5">
                       <Clock className="h-3 w-3" /> {service.duration}
                    </span>
                    <span className="portal-text-primary brightness-110">{service.price}</span>
                  </div>
                </div>
              </div>
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 group-hover:portal-bg-primary group-hover:text-white transition-all duration-300">
                <ChevronRight className="h-6 w-6" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-white/10 p-12 text-center flex flex-col items-center justify-center gap-6 bg-slate-50/50 dark:bg-white/5 backdrop-blur-sm">
         <div className="h-16 w-16 portal-bg-primary/10 portal-text-primary flex items-center justify-center rounded-3xl animate-bounce">
            <CalendarIcon className="h-8 w-8" />
         </div>
         <div className="space-y-2">
           <p className="text-lg font-black dark:text-white">აირჩიეთ მომსახურება</p>
           <p className="text-sm text-muted-foreground max-w-[220px] mx-auto font-medium">ხელმისაწვდომი დროები გამოჩნდება სერვისის არჩევის შემდეგ.</p>
         </div>
      </div>

      <Button className="w-full h-16 portal-bg-primary rounded-3xl text-lg font-black shadow-2xl shadow-portal-primary/30 hover:scale-[1.02] active:scale-95 transition-all">
         გაგრძელება
      </Button>
    </div>
  );
};
