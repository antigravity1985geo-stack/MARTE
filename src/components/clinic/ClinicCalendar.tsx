import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { format, addDays, subDays, startOfDay, endOfDay } from 'date-fns';
import { ka } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ClinicAppointmentModal } from './ClinicAppointmentModal';

const START_HOUR = 9; // 09:00
const END_HOUR = 21; // 21:00
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => i + START_HOUR);

export function ClinicCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ time?: string, doctor?: string } | null>(null);
  const [editingAppointment, setEditingAppointment] = useState<any | null>(null);

  const { data: doctors = [], isLoading: isLoadingDoctors } = useQuery({
    queryKey: ['clinic_doctors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('is_doctor', true)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  const { data: appointments = [], refetch } = useQuery({
    queryKey: ['clinic_appointments', format(currentDate, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clinic_appointments')
        .select(`
          *,
          clinic_patients (first_name, last_name, personal_id)
        `)
        .gte('start_time', startOfDay(currentDate).toISOString())
        .lte('start_time', endOfDay(currentDate).toISOString())
        .neq('status', 'cancelled');
        
      if (error) throw error;
      return data;
    }
  });

  const handleSlotClick = (hour: number, doctorId: string) => {
    setSelectedSlot({ time: `${hour.toString().padStart(2, '0')}:00`, doctor: doctorId });
    setEditingAppointment(null);
    setIsModalOpen(true);
  };

  const handleNewBooking = () => {
    setSelectedSlot(null);
    setEditingAppointment(null);
    setIsModalOpen(true);
  };

  const handleAppointmentClick = (e: React.MouseEvent, apt: any) => {
    e.stopPropagation();
    setEditingAppointment(apt);
    setIsModalOpen(true);
  };

  const statusColors: Record<string, { bg: string, border: string, shadow: string }> = {
    scheduled: { 
      bg: 'linear-gradient(135deg, hsl(var(--primary) / 0.9), hsl(var(--primary) / 0.7))', 
      border: 'hsl(var(--primary))',
      shadow: 'hsl(var(--primary) / 0.3)'
    },
    arrived: { 
      bg: 'linear-gradient(135deg, hsl(35 90% 50% / 0.9), hsl(35 90% 50% / 0.7))', 
      border: 'hsl(35 90% 50%)',
      shadow: 'hsl(35 90% 50% / 0.3)'
    },
    in_consultation: { 
      bg: 'linear-gradient(135deg, hsl(280 80% 60% / 0.9), hsl(280 80% 60% / 0.7))', 
      border: 'hsl(280 80% 60%)',
      shadow: 'hsl(280 80% 60% / 0.3)'
    },
    completed: { 
      bg: 'linear-gradient(135deg, hsl(var(--success) / 0.9), hsl(var(--success) / 0.7))', 
      border: 'hsl(var(--success))',
      shadow: 'hsl(var(--success) / 0.3)'
    },
    no_show: { 
      bg: 'linear-gradient(135deg, hsl(var(--destructive) / 0.8), hsl(var(--destructive) / 0.5))', 
      border: 'hsl(var(--destructive))',
      shadow: 'hsl(var(--destructive) / 0.2)'
    }
  };

  return (
    <Card className="glass-card border-border/10 shadow-2xl relative overflow-hidden rounded-[2rem]">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 pt-6 px-8 border-b border-white/5 gap-6 bg-background/40 backdrop-blur-md relative z-20">
        <div className="flex items-center gap-2 glass-pill p-1.5 px-3">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background/80" onClick={() => setCurrentDate(subDays(currentDate, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 min-w-[200px] justify-center text-primary px-4">
            <CalendarIcon className="h-4 w-4 opacity-70" />
            <h2 className="text-lg font-bold capitalize tracking-tight">
              {format(currentDate, 'dd MMMM, yyyy', { locale: ka })}
            </h2>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-background/80" onClick={() => setCurrentDate(addDays(currentDate, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={handleNewBooking} className="gap-2 shadow-glow hover-lift rounded-full px-6 font-semibold bg-primary hover:bg-primary/90">
          <Plus className="h-4 w-4" />
          ახალი ვიზიტი
        </Button>
      </CardHeader>
      
      <CardContent className="p-0 overflow-x-auto scrollbar-thin relative z-10">
        <div className="min-w-[800px] bg-background/30 bg-dot-pattern">
          {/* Header */}
          <div className="flex border-b border-border/20 sticky top-0 z-30 bg-background/80 backdrop-blur-xl shadow-sm">
            <div className="w-20 lg:w-24 flex-shrink-0 border-r border-border/50 p-4 text-center font-medium text-muted-foreground/70 text-sm">
              დრო
            </div>
            {isLoadingDoctors ? (
              <div className="flex-1 p-4 text-center text-sm text-muted-foreground">ექიმები იტვირთება...</div>
            ) : doctors.length === 0 ? (
              <div className="flex-1 p-4 text-center text-sm text-muted-foreground">ექიმები არ მოიძებნა. (დაამატეთ ექიმები სისტემაში)</div>
            ) : (
              doctors.map(doc => (
                <div key={doc.id} className="flex-1 border-r border-border/50 p-4 text-center font-semibold text-foreground flex flex-col items-center justify-center">
                  <span className="text-md font-bold text-primary">{doc.full_name}</span>
                  <span className="text-xs text-muted-foreground mt-1 font-medium bg-muted px-2 py-0.5 rounded-full">
                    {doc.specialization || 'ზოგადი'}
                  </span>
                </div>
              ))
            )}
          </div>
          
          {/* Grid */}
          <div className="relative isolate">
            {HOURS.map(hour => (
              <div key={hour} className="flex border-b border-border/10 h-[100px] group relative">
                <div className="w-20 lg:w-24 flex-shrink-0 border-r border-border/10 p-2 flex items-start justify-center text-xs font-semibold text-muted-foreground/50 bg-background/40 backdrop-blur-sm">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                {doctors.map(doc => (
                  <div 
                    key={`${doc.id}-${hour}`} 
                    className="flex-1 border-r border-border/50 last:border-0 hover:bg-primary/5 transition-colors duration-300 cursor-pointer relative"
                    onClick={() => handleSlotClick(hour, doc.id)}
                  >
                    {/* Hover highlight overlay */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
                    
                    {/* Half-hour divider lines (Dotted for subtle look) */}
                    <div className="absolute top-[25%] left-0 right-0 border-t border-dotted border-border/20 w-full pointer-events-none" />
                    <div className="absolute top-[50%] left-0 right-0 border-t border-dotted border-border/30 w-full pointer-events-none" />
                    <div className="absolute top-[75%] left-0 right-0 border-t border-dotted border-border/20 w-full pointer-events-none" />
                  </div>
                ))}
              </div>
            ))}
            
            {/* Appointments Overlay */}
            {appointments.map(apt => {
              const specIndex = doctors.findIndex((d: any) => d.id === apt.doctor_id);
              if (specIndex === -1) return null; // If doctor was deleted/inactive
              
              const startDate = new Date(apt.start_time);
              const endDate = new Date(apt.end_time);
              
              const h = startDate.getHours();
              const m = startDate.getMinutes();
              const diffMins = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
              
              const topMinutes = ((h - START_HOUR) * 60) + m;
              const topPosition = (topMinutes / 60) * 100; // 100px per hour
              const height = (diffMins / 60) * 100;
              
              if (h < START_HOUR || h >= END_HOUR) return null;
              
              const patientName = apt.clinic_patients ? `${apt.clinic_patients.first_name} ${apt.clinic_patients.last_name}` : 'უცნობი პაციენტი';

              const styleData = statusColors[apt.status] || statusColors.scheduled;

              return (
                <div 
                  key={apt.id}
                  className="absolute p-3 text-xs appointment-card flex flex-col justify-between"
                  style={{
                    top: `${topPosition + 2}px`, // +2 for padding
                    height: `${height - 4}px`, // -4 for padding/gap
                    left: `calc(5rem + ${specIndex} * ((100% - 5rem) / ${doctors.length}) + 6px)`,
                    width: `calc(((100% - 5rem) / ${doctors.length}) - 12px)`,
                    background: styleData.bg,
                    borderLeft: `4px solid ${styleData.border}`,
                    boxShadow: `0 4px 14px 0 ${styleData.shadow}`,
                    borderRadius: '12px',
                    color: 'white',
                    opacity: apt.status === 'no_show' ? 0.6 : 1
                  }}
                  onClick={(e) => handleAppointmentClick(e, apt)}
                  title={`სტატუსი: ${apt.status}\nმიზეზი: ${apt.reason || '-'}`}
                >
                  <div className="flex flex-col gap-0.5 z-10">
                    <div className="font-bold text-[13px] leading-tight truncate tracking-wide drop-shadow-sm">{patientName}</div>
                    <div className="opacity-90 leading-tight italic truncate text-[11px] font-medium mix-blend-overlay">{apt.reason || 'კონსულტაცია'}</div>
                  </div>
                  <div className="opacity-80 font-mono text-[10px] mt-1 font-bold tracking-wider flex items-center justify-between bg-black/10 w-max px-2 py-0.5 rounded-md backdrop-blur-sm z-10">
                    <span>{format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>

      {isModalOpen && (
        <ClinicAppointmentModal 
          onClose={() => {
            setIsModalOpen(false);
            setEditingAppointment(null);
            refetch();
          }} 
          selectedTime={selectedSlot?.time}
          selectedDoctor={selectedSlot?.doctor}
          selectedDate={currentDate}
          doctors={doctors}
          existingAppointment={editingAppointment}
        />
      )}
    </Card>
  );
}
