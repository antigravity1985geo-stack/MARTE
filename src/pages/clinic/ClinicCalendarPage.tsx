import { PageTransition } from '@/components/PageTransition';
import { ClinicCalendar } from '@/components/clinic/ClinicCalendar';

export default function ClinicCalendarPage() {
  return (
    <PageTransition>
      <div className="flex flex-col gap-6 p-4 xl:p-8 animate-in fade-in slide-in-from-bottom-8 duration-700 ease-out">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 relative z-10">
            <h1 className="text-3xl md:text-4xl font-black tracking-tight gradient-text inline-block">ექიმების კალენდარი</h1>
            <p className="text-sm md:text-base text-muted-foreground font-medium opacity-80 backdrop-blur-sm">
              ვიზიტების და ჯავშნების ჭკვიანი სამართავი პანელი
            </p>
          </div>
        </div>
        
        <div className="relative w-full">
          {/* Subtle background glow behind the calendar */}
          <div className="absolute inset-0 bg-primary/5 rounded-[2.5rem] blur-3xl -z-10" />
          <ClinicCalendar />
        </div>
      </div>
    </PageTransition>
  );
}
