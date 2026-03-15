import { PageTransition } from '@/components/PageTransition';
import { ClinicCalendar } from '@/components/clinic/ClinicCalendar';

export default function ClinicCalendarPage() {
  return (
    <PageTransition>
      <div className="flex flex-col gap-6 p-4 md:p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">ექიმების კალენდარი</h1>
            <p className="text-sm text-muted-foreground mt-2">
              ექიმების ვიზიტების და ჯავშნების სამართავი პანელი
            </p>
          </div>
        </div>
        
        <div className="relative">
          <ClinicCalendar />
        </div>
      </div>
    </PageTransition>
  );
}
