import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parse } from 'date-fns';
import { Select as CustomSelect } from '@/components/ui/select'; // using internal select or simply native for patients

export function ClinicAppointmentModal({ 
  onClose, 
  selectedTime, 
  selectedDoctor, 
  selectedDate,
  doctors,
  existingAppointment 
}: { 
  onClose: () => void;
  selectedTime?: string;
  selectedDoctor?: string;
  selectedDate: Date;
  doctors: any[];
  existingAppointment?: any;
}) {
  const queryClient = useQueryClient();
  const [patientId, setPatientId] = useState(existingAppointment?.patient_id || '');
  const [doctorId, setDoctorId] = useState(existingAppointment?.doctor_id || selectedDoctor || '');
  const [time, setTime] = useState(existingAppointment ? format(new Date(existingAppointment.start_time), 'HH:mm') : selectedTime || '09:00');
  const [duration, setDuration] = useState('30');
  const [reason, setReason] = useState(existingAppointment?.reason || '');
  const [notes, setNotes] = useState(existingAppointment?.notes || '');
  const [status, setStatus] = useState(existingAppointment?.status || 'scheduled');

  // Load patients for the dropdown
  const { data: patients = [], isLoading: isLoadingPatients } = useQuery({
    queryKey: ['clinic_patients_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('clinic_patients').select('id, first_name, last_name, personal_id').order('first_name');
      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    if (existingAppointment) {
      const start = new Date(existingAppointment.start_time);
      const end = new Date(existingAppointment.end_time);
      const diffMins = Math.round((end.getTime() - start.getTime()) / 60000);
      setDuration(diffMins.toString());
    }
  }, [existingAppointment]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const baseDateStr = format(selectedDate, 'yyyy-MM-dd');
      const startDateTimeStr = `${baseDateStr}T${time}:00`;
      const start_time = new Date(startDateTimeStr).toISOString();
      const end_time = new Date(new Date(startDateTimeStr).getTime() + parseInt(duration) * 60000).toISOString();

      const payload = {
        patient_id: patientId,
        doctor_id: doctorId,
        start_time,
        end_time,
        status,
        reason,
        notes
      };

      if (existingAppointment) {
        const { error } = await supabase.from('clinic_appointments').update(payload).eq('id', existingAppointment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('clinic_appointments').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic_appointments'] });
      toast.success(existingAppointment ? 'ჯავშანი განახლდა' : 'ჯავშანი დაემატა');
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.message);
    }
  });

  const handleSave = () => {
    if (!patientId || !doctorId || !time) {
      toast.error('შეავსეთ აუცილებელი ველები');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{existingAppointment ? 'ვიზიტის რედაქტირება' : 'ახალი ვიზიტი'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-1.5">
            <Label>პაციენტი <span className="text-destructive">*</span></Label>
            <Select value={patientId} onValueChange={setPatientId} disabled={isLoadingPatients}>
              <SelectTrigger>
                <SelectValue placeholder="აირჩიეთ პაციენტი" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.first_name} {p.last_name} {p.personal_id ? `(${p.personal_id})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>ექიმი <span className="text-destructive">*</span></Label>
            <Select value={doctorId} onValueChange={setDoctorId}>
              <SelectTrigger>
                <SelectValue placeholder="აირჩიეთ ექიმი" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.first_name} {d.last_name} ({d.specialization || 'ზოგადი პროფილი'})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>დრო <span className="text-destructive">*</span></Label>
              <Input type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>ხანგრძლივობა (წთ)</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 წუთი</SelectItem>
                  <SelectItem value="30">30 წუთი</SelectItem>
                  <SelectItem value="45">45 წუთი</SelectItem>
                  <SelectItem value="60">1 საათი</SelectItem>
                  <SelectItem value="90">1.5 საათი</SelectItem>
                  <SelectItem value="120">2 საათი</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>მიზეზი / ჩივილი</Label>
            <Input placeholder="მაგ: კონსულტაცია, კბილის ტკივილი..." value={reason} onChange={e => setReason(e.target.value)} />
          </div>

          {existingAppointment && (
            <div className="space-y-1.5 border-t pt-4 mt-2">
              <Label>სტატუსი</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">დაგეგმილი</SelectItem>
                  <SelectItem value="arrived">მოსული (ელოდება)</SelectItem>
                  <SelectItem value="in_consultation">კაბინეტშია</SelectItem>
                  <SelectItem value="completed">დასრულებული</SelectItem>
                  <SelectItem value="no_show">არ გამოცხადდა</SelectItem>
                  <SelectItem value="cancelled">გაუქმებული</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>გაუქმება</Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>{existingAppointment ? 'შენახვა' : 'დამატება'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
