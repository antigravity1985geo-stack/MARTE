import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { AppointmentModal } from './AppointmentModal';
import { format, addDays, subDays } from 'date-fns';
import { ka } from 'date-fns/locale';

interface Appointment {
  id: string;
  client_name: string;
  service_name: string;
  specialist_id: string;
  start_time: string; // ISO date string
  duration_minutes: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
}

interface Specialist {
  id: string;
  name: string;
}

interface SalonService {
  id: string;
  name: string;
  duration_minutes: number;
}

interface Shift {
  id: string;
  specialist_id: string;
  start_time: string;
  end_time: string;
  is_day_off: boolean;
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfDay, endOfDay } from 'date-fns';

const START_HOUR = 9; // 09:00
const END_HOUR = 21; // 21:00
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

export default function BookingCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ time?: string, specialist?: string } | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  const { data: specialists = [] } = useQuery({
    queryKey: ['salon_specialists'],
    queryFn: async () => {
      const { data, error } = await supabase.from('salon_specialists').select('*').eq('is_active', true);
      if (error) throw error;
      return data as Specialist[];
    }
  });

  const { data: services = [] } = useQuery({
    queryKey: ['salon_services'],
    queryFn: async () => {
      const { data, error } = await supabase.from('salon_services').select('*').eq('is_active', true);
      if (error) throw error;
      return data as SalonService[];
    }
  });

  const { data: shifts = [] } = useQuery({
    queryKey: ['specialist_shifts', format(currentDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('specialist_shifts')
        .select('*')
        .eq('shift_date', format(currentDate, 'yyyy-MM-dd'));
      if (error) throw error;
      return data as Shift[];
    }
  });

  const activeSpecialists = specialists.filter(spec => {
    // If no shift is explicitly set, let's show them by default 
    // to avoid an empty calendar if the user forgets to schedule shifts.
    // If a shift IS set and it's a day off, hide them.
    const shift = shifts.find(s => s.specialist_id === spec.id);
    if (shift && shift.is_day_off) return false;
    // We could filter strictly: if (!shift) return false; but default true is safer for UX initially.
    return true; 
  });

  const { data: appointments = [], refetch } = useQuery({
    queryKey: ['salon_appointments', format(currentDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salon_appointments')
        .select('*')
        .gte('start_time', startOfDay(currentDate).toISOString())
        .lte('start_time', endOfDay(currentDate).toISOString())
        .neq('status', 'cancelled');
        
      if (error) throw error;
      return data as Appointment[];
    }
  });

  const handleSlotClick = (hour: number, specialistId: string) => {
    setSelectedSlot({ time: `${hour.toString().padStart(2, '0')}:00`, specialist: specialistId });
    setEditingAppointment(null);
    setIsModalOpen(true);
  };

  const handleNewBooking = () => {
    setSelectedSlot(null);
    setEditingAppointment(null);
    setIsModalOpen(true);
  };

  const handleAppointmentClick = (e: React.MouseEvent, apt: Appointment) => {
    e.stopPropagation();
    setEditingAppointment(apt);
    setIsModalOpen(true);
  };

  return (
    <Card className="border-border/50 shadow-sm relative overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(subDays(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 min-w-[200px] justify-center text-primary">
            <CalendarIcon className="h-5 w-5" />
            <h2 className="text-xl font-semibold capitalize tracking-tight">
              {format(currentDate, 'dd MMMM, yyyy', { locale: ka })}
            </h2>
          </div>
          <Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={handleNewBooking} className="gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          ახალი ჯავშანი
        </Button>
      </CardHeader>
      
      <CardContent className="p-0 overflow-x-auto scrollbar-thin">
        <div className="min-w-[800px] bg-background">
          {/* Header */}
          <div className="flex border-b bg-muted/30 sticky top-0 z-10 backdrop-blur-sm">
            <div className="w-20 lg:w-24 flex-shrink-0 border-r border-border/50 p-4 text-center font-medium text-muted-foreground/70 text-sm">
              დრო
            </div>
            {activeSpecialists.length === 0 ? (
              <div className="flex-1 p-4 text-center text-sm text-muted-foreground">ამ დღეს აქტიური სპეციალისტები არ არიან</div>
            ) : (
              activeSpecialists.map(spec => {
                const shift = shifts.find(s => s.specialist_id === spec.id);
                return (
                  <div key={spec.id} className="flex-1 border-r border-border/50 p-4 text-center font-semibold text-foreground flex flex-col items-center justify-center">
                    <span>{spec.name}</span>
                    {shift && (
                      <span className="text-xs text-muted-foreground mt-1 font-normal">
                        {shift.start_time.substring(0,5)} - {shift.end_time.substring(0,5)}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
          
          {/* Grid */}
          <div className="relative">
            {HOURS.map(hour => (
              <div key={hour} className="flex border-b border-border/50 h-[80px] group relative">
                <div className="w-20 lg:w-24 flex-shrink-0 border-r border-border/50 p-2 flex items-start justify-center text-sm font-medium text-muted-foreground/70 bg-muted/5">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                {activeSpecialists.map(spec => {
                  const shift = shifts.find(s => s.specialist_id === spec.id);
                  let isOutsideShift = false;
                  if (shift) {
                    const startH = parseInt(shift.start_time.split(':')[0]);
                    const endH = parseInt(shift.end_time.split(':')[0]);
                    if (hour < startH || hour >= endH) {
                      isOutsideShift = true;
                    }
                  }

                  return (
                    <div 
                      key={`${spec.id}-${hour}`} 
                      className={`flex-1 border-r border-border/50 last:border-0 hover:bg-primary/5 transition-colors cursor-pointer relative ${isOutsideShift ? 'bg-muted/30' : ''}`}
                      onClick={() => handleSlotClick(hour, spec.id)}
                    >
                      {/* Half-hour divider line */}
                      <div className="absolute top-[50%] left-0 right-0 border-t border-dashed border-border/30 w-full pointer-events-none" />
                    </div>
                  );
                })}
              </div>
            ))}
            
            {/* Appointments Overlay */}
            {appointments.map(apt => {
              const specIndex = activeSpecialists.findIndex(s => s.id === apt.specialist_id);
              if (specIndex === -1) return null; // Only show if specialist is active today
              
              const startDate = new Date(apt.start_time);
              const h = startDate.getHours();
              const m = startDate.getMinutes();
              
              const topMinutes = ((h - START_HOUR) * 60) + m;
              const topPosition = (topMinutes / 60) * 80; // 80px per hour
              const height = (apt.duration_minutes / 60) * 80;
              
              if (h < START_HOUR || h >= END_HOUR) return null;
              
              return (
                <div 
                  key={apt.id}
                  className="absolute rounded-lg p-2.5 text-xs shadow-sm overflow-hidden border border-white/20 transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer flex flex-col justify-between"
                  style={{
                    top: `${topPosition + 2}px`, // +2 for padding
                    height: `${height - 4}px`, // -4 for padding/gap
                    left: `calc(5rem + ${specIndex} * ((100% - 5rem) / ${activeSpecialists.length}) + 6px)`,
                    width: `calc(((100% - 5rem) / ${activeSpecialists.length}) - 12px)`,
                    background: apt.status === 'completed' 
                      ? 'linear-gradient(135deg, hsl(var(--success)), hsl(var(--success) / 0.85))'
                      : 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))',
                    color: 'white',
                    opacity: apt.status === 'no_show' ? 0.6 : 1
                  }}
                  onClick={(e) => handleAppointmentClick(e, apt)}
                >
                  <div>
                    <div className="font-bold text-[13px] leading-tight mb-1">{apt.client_name}</div>
                    <div className="opacity-90 leading-tight">{apt.service_name}</div>
                  </div>
                  <div className="opacity-75 font-mono text-[10px] mt-1">
                    {format(startDate, 'HH:mm')} ({apt.duration_minutes}წთ)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>

      {isModalOpen && (
        <AppointmentModal 
          onClose={() => {
            setIsModalOpen(false);
            setEditingAppointment(null);
            refetch();
          }} 
          selectedTime={selectedSlot?.time}
          selectedSpecialist={selectedSlot?.specialist}
          selectedDate={currentDate}
          specialists={specialists}
          services={services}
          existingAppointment={editingAppointment}
        />
      )}
    </Card>
  );
}
