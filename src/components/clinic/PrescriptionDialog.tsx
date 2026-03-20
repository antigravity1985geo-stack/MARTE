import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Pill, Printer, Save, Clock, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface PrescriptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (medications: Medication[], notes: string) => void;
  initialMedications?: Medication[];
  initialNotes?: string;
}

export function PrescriptionDialog({ isOpen, onClose, onSave, initialMedications = [], initialNotes = '' }: PrescriptionDialogProps) {
  const [medications, setMedications] = useState<Medication[]>(
    initialMedications.length > 0 ? initialMedications : [{ name: '', dosage: '', frequency: '', duration: '', instructions: '' }]
  );
  const [notes, setNotes] = useState(initialNotes);

  const addMedication = () => {
    setMedications([...medications, { name: '', dosage: '', frequency: '', duration: '', instructions: '' }]);
  };

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const updateMedication = (index: number, field: keyof Medication, value: string) => {
    const newMeds = [...medications];
    newMeds[index] = { ...newMeds[index], [field]: value };
    setMedications(newMeds);
  };

  const handleSave = () => {
    onSave(medications.filter(m => m.name), notes);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[85vh] flex flex-col p-0 overflow-hidden rounded-[2rem] border-none shadow-2xl">
        <DialogHeader className="px-8 py-6 bg-primary/5 border-b border-border/40">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Pill className="w-6 h-6 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-wider">ახალი რეცეპტი</DialogTitle>
              <p className="text-sm text-muted-foreground font-medium">დანიშნულების ფორმირება</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-8 gap-8">
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="h-6 px-3 bg-muted/30 border-primary/20 text-primary font-bold uppercase tracking-tighter">
                მედიკამენტები
              </Badge>
              <span className="text-xs text-muted-foreground font-medium">({medications.length})</span>
            </div>
            <Button variant="secondary" size="sm" className="gap-2 rounded-xl h-8 font-bold text-xs" onClick={addMedication}>
              <Plus className="w-3.5 h-3.5" /> დამატება
            </Button>
          </div>

          <ScrollArea className="flex-1 pr-4 -mr-4">
            <div className="space-y-4">
              {medications.map((med, index) => (
                <div key={index} className="group relative p-6 bg-muted/20 rounded-[1.5rem] border border-transparent hover:border-primary/20 transition-all hover:bg-muted/30">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">პრეპარატი</Label>
                      <Input 
                        placeholder="მაგ: ამოქსიცილინი" 
                        value={med.name} 
                        onChange={(e) => updateMedication(index, 'name', e.target.value)}
                        className="rounded-xl border-muted-foreground/20 focus:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">დოზირება</Label>
                      <Input 
                        placeholder="მაგ: 500მგ" 
                        value={med.dosage} 
                        onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                        className="rounded-xl border-muted-foreground/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">სიხშირე</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input 
                          placeholder="მაგ: დღეში 2-ჯერ" 
                          value={med.frequency} 
                          onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                          className="pl-10 rounded-xl border-muted-foreground/20"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">ხანგრძლივობა</Label>
                      <Input 
                        placeholder="მაგ: 7 დღე" 
                        value={med.duration} 
                        onChange={(e) => updateMedication(index, 'duration', e.target.value)}
                        className="rounded-xl border-muted-foreground/20"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">მიღების წესი</Label>
                      <div className="relative">
                        <Info className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <textarea 
                          placeholder="მაგ: ჭამის შემდეგ..." 
                          value={med.instructions} 
                          onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                          className="w-full min-h-[80px] pl-10 pr-4 py-3 rounded-xl bg-background border border-muted-foreground/20 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none"
                        />
                      </div>
                    </div>
                  </div>
                  {medications.length > 1 && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute -right-2 -top-2 h-8 w-8 rounded-full bg-background shadow-md border text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeMedication(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="space-y-3">
             <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground ml-1">დამატებითი შენიშვნა</Label>
             <textarea 
               placeholder="კომენტარი..." 
               value={notes} 
               onChange={(e) => setNotes(e.target.value)}
               className="w-full min-h-[100px] px-4 py-3 rounded-2xl bg-muted/10 border border-muted-foreground/10 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm resize-none font-medium"
             />
          </div>
        </div>

        <DialogFooter className="px-8 py-6 bg-muted/30 border-t border-border/40 gap-3">
          <Button variant="outline" className="rounded-2xl h-12 px-6 font-bold" onClick={onClose}>
            გაუქმება
          </Button>
          <Button className="rounded-2xl h-12 px-8 font-black gap-2 shadow-lg shadow-primary/20" onClick={handleSave}>
            <Save className="w-4 h-4" /> შენახვა
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
