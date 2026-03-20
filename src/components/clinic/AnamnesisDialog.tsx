import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ClipboardList, Save, HeartPulse, ShieldAlert, Activity, Coffee, Stethoscope } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AnamnesisData {
  chronic_diseases: string;
  allergies: string;
  previous_surgeries: string;
  ongoing_medications: string;
  lifestyle: string;
  family_history: string;
}

interface AnamnesisDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AnamnesisData) => void;
  initialData?: AnamnesisData;
}

export function AnamnesisDialog({ isOpen, onClose, onSave, initialData }: AnamnesisDialogProps) {
  const [data, setData] = useState<AnamnesisData>(initialData || {
    chronic_diseases: '',
    allergies: '',
    previous_surgeries: '',
    ongoing_medications: '',
    lifestyle: '',
    family_history: ''
  });

  const handleSave = () => {
    onSave(data);
    onClose();
  };

  const sections = [
    { id: 'chronic_diseases', label: 'ქრონიკული დაავადებები', icon: HeartPulse, color: 'text-red-500', bg: 'bg-red-50' },
    { id: 'allergies', label: 'ალერგიები', icon: ShieldAlert, color: 'text-amber-500', bg: 'bg-amber-50' },
    { id: 'previous_surgeries', label: 'გადატანილი ოპერაციები', icon: Stethoscope, color: 'text-blue-500', bg: 'bg-blue-50' },
    { id: 'ongoing_medications', label: 'მუდმივი მედიკამენტები', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { id: 'lifestyle', label: 'ცხოვრების წესი (მავნე ჩვევები)', icon: Coffee, color: 'text-purple-500', bg: 'bg-purple-50' },
    { id: 'family_history', label: 'ოჯახური ანამნეზი', icon: ClipboardList, color: 'text-muted-foreground', bg: 'bg-muted/50' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl">
        <DialogHeader className="px-10 py-8 bg-primary/5 border-b border-border/40">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-primary/10 rounded-2xl flex items-center justify-center">
              <ClipboardList className="w-8 h-8 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-black uppercase tracking-widest">სამედიცინო ანამნეზი</DialogTitle>
              <p className="text-sm text-muted-foreground font-semibold flex items-center gap-2">
                 <Badge variant="secondary" className="rounded-lg h-5 text-[10px] uppercase font-black">სტრუქტურირებული პროფილი</Badge>
                 პაციენტის კლინიკური მონაცემების მართვა
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-10 bg-background/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {sections.map((section) => (
              <div key={section.id} className="space-y-3 group">
                <div className="flex items-center gap-3 ml-1">
                  <div className={`p-2 rounded-xl ${section.bg} ${section.color} transition-transform group-hover:scale-110 duration-300`}>
                    <section.icon className="w-4 h-4" />
                  </div>
                  <Label className="text-xs uppercase font-black tracking-widest opacity-60">{section.label}</Label>
                </div>
                <textarea 
                  value={(data as any)[section.id]}
                  onChange={(e) => setData({ ...data, [section.id]: e.target.value })}
                  placeholder={`შეიყვანეთ ინფორმაცია...`}
                  className="w-full min-h-[120px] p-5 rounded-[1.5rem] bg-background border border-border/50 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all text-sm font-medium resize-none shadow-sm hover:shadow-md"
                />
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="px-10 py-8 bg-muted/20 border-t border-border/40 gap-4">
          <Button variant="ghost" className="rounded-2xl h-14 px-8 font-bold text-muted-foreground hover:bg-muted/50" onClick={onClose}>
            გაუქმება
          </Button>
          <Button className="rounded-2xl h-14 px-10 font-black gap-3 shadow-xl shadow-primary/20 bg-primary hover:brightness-110 text-white" onClick={handleSave}>
            <Save className="w-5 h-5" /> მონაცემების შენახვა
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
