import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Specialist {
  id: string;
  name: string;
}

interface SalonService {
  id: string;
  name: string;
  duration_minutes: number;
}

interface Appointment {
  id: string;
  client_name: string;
  client_id?: string;
  service_name: string;
  specialist_id: string;
  start_time: string;
  duration_minutes: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
}

interface AppointmentModalProps {
  onClose: () => void;
  selectedTime?: string;
  selectedSpecialist?: string;
  selectedDate: Date;
  specialists: Specialist[];
  services: SalonService[];
  existingAppointment?: Appointment | null;
}

export function AppointmentModal({ 
  onClose, 
  selectedTime = "12:00", 
  selectedSpecialist, 
  selectedDate, 
  specialists, 
  services,
  existingAppointment
}: AppointmentModalProps) {
  const [clientName, setClientName] = useState(existingAppointment?.client_name || '');
  const [serviceName, setServiceName] = useState(existingAppointment?.service_name || '');
  const [specialistId, setSpecialistId] = useState(existingAppointment?.specialist_id || selectedSpecialist || '');
  
  // Format existing time or use selectedTime
  const defaultTime = existingAppointment 
    ? new Date(existingAppointment.start_time).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' })
    : selectedTime;
    
  const [time, setTime] = useState(defaultTime);
  const [duration, setDuration] = useState(existingAppointment?.duration_minutes || 60);
  const [status, setStatus] = useState<Appointment['status']>(existingAppointment?.status || 'scheduled');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clients').select('id, name, loyalty_tier');
      if (error) throw error;
      return data || [];
    }
  });

  const matchedClient = clients.find(c => c.name.toLowerCase() === clientName.trim().toLowerCase());

  const saveMutation = useMutation({
    mutationFn: async () => {
      const [hours, minutes] = time.split(':').map(Number);
      const startTimeDate = new Date(selectedDate);
      startTimeDate.setHours(hours, minutes, 0, 0);

      const payload = {
        client_name: clientName,
        client_id: matchedClient ? matchedClient.id : null,
        service_name: serviceName,
        specialist_id: specialistId,
        start_time: startTimeDate.toISOString(),
        duration_minutes: duration,
        status: status
      };

      if (existingAppointment) {
        const { error } = await supabase
          .from('salon_appointments')
          .update(payload)
          .eq('id', existingAppointment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('salon_appointments')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(existingAppointment ? 'ჯავშანი განახლდა' : 'ჯავშანი წარმატებით დაემატა');
      onClose();
    },
    onError: (error) => {
      toast.error('შეცდომა შენახვისას: ' + error.message);
      setIsSubmitting(false);
    }
  });

  const handleServiceChange = (serviceId: string) => {
    const service = services.find(s => s.id === serviceId);
    if (service) {
      setServiceName(service.name);
      setDuration(service.duration_minutes);
    }
  };

  const handleSave = async () => {
    if (!clientName || !serviceName || !specialistId) {
      toast.error('გთხოვთ შეავსოთ ყველა აუცილებელი ველი');
      return;
    }
    setIsSubmitting(true);
    saveMutation.mutate();
  };
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{existingAppointment ? 'ჯავშნის რედაქტირება' : 'ახალი ჯავშანი'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="client">კლიენტის სახელი / ტელეფონი *</Label>
            <Input 
              id="client" 
              list="client-suggestions"
              placeholder="მაგ. ანა კიკნაძე" 
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
            <datalist id="client-suggestions">
              {clients.map(c => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
            {matchedClient && matchedClient.loyalty_tier && (
              <p className="text-xs text-muted-foreground">
                ლოიალობა: <span className="font-semibold text-primary capitalize">{matchedClient.loyalty_tier}</span> 
                {matchedClient.loyalty_tier.toLowerCase() === 'gold' && ' (-20%)'}
                {matchedClient.loyalty_tier.toLowerCase() === 'silver' && ' (-10%)'}
                {matchedClient.loyalty_tier.toLowerCase() === 'bronze' && ' (-5%)'}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="service">მომსახურება *</Label>
            <Select value={services.find(s => s.name === serviceName)?.id || ''} onValueChange={handleServiceChange}>
              <SelectTrigger>
                <SelectValue placeholder="აირჩიეთ სერვისი" />
              </SelectTrigger>
              <SelectContent>
                {services.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name} ({s.duration_minutes}წთ)</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="time">დრო</Label>
              <Input 
                id="time" 
                type="time" 
                value={time} 
                onChange={(e) => setTime(e.target.value)} 
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="duration">ხანგრძლივობა (წთ)</Label>
              <Input 
                id="duration" 
                type="number" 
                value={duration} 
                onChange={(e) => setDuration(Number(e.target.value))} 
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="specialist">სპეციალისტი *</Label>
            <Select value={specialistId} onValueChange={setSpecialistId}>
              <SelectTrigger>
                <SelectValue placeholder="აირჩიეთ სპეციალისტი" />
              </SelectTrigger>
              <SelectContent>
                {specialists.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {existingAppointment && (
            <div className="grid gap-2">
              <Label htmlFor="status" className="font-semibold text-primary">სტატუსი *</Label>
              <Select value={status} onValueChange={(val: any) => setStatus(val)}>
                <SelectTrigger className="border-primary/50 bg-primary/5">
                  <SelectValue placeholder="სტატუსი" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">⏱️ დაგეგმილი</SelectItem>
                  <SelectItem value="completed">✅ დასრულებული (ჩამოწერა + ბონუსი)</SelectItem>
                  <SelectItem value="cancelled">❌ გაუქმებული</SelectItem>
                  <SelectItem value="no_show">👻 არ გამოცხადდა</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>გაუქმება</Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? "ინახება..." : "შენახვა"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
