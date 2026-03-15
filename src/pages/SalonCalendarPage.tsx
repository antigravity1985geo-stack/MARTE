import BookingCalendar from '@/components/salon/BookingCalendar';

export default function SalonCalendarPage() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">ჯავშნები / კალენდარი</h1>
        <p className="text-muted-foreground">
          მართეთ ვიზიტები, სპეციალისტების გრაფიკი და ჯავშნები ერთ სივრცეში.
        </p>
      </div>
      
      <div className="relative">
        <BookingCalendar />
      </div>
    </div>
  );
}
