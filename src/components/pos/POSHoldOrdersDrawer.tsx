import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Play, Trash2 } from 'lucide-react';
import type { CartItem } from './POSCart';

export interface HoldOrder {
  id: string;
  name: string;
  timestamp: number;
  cart: CartItem[];
  finalTotal: number;
}

interface POSHoldOrdersDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  holdOrders: HoldOrder[];
  onRecall: (order: HoldOrder) => void;
  onDelete: (id: string) => void;
}

export function POSHoldOrdersDrawer({ open, onOpenChange, holdOrders, onRecall, onDelete }: POSHoldOrdersDrawerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>შეჩერებული შეკვეთები</DialogTitle>
          <DialogDescription>შეგიძლიათ გააგრძელოთ მუშაობა ან წაშალოთ შეკვეთა</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] mt-4">
          {holdOrders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">შეჩერებული შეკვეთები არ მოიძებნა</p>
          ) : (
            <div className="space-y-3">
              {holdOrders.map(order => (
                <div key={order.id} className="p-3 border rounded-xl flex items-center justify-between bg-muted/20">
                  <div>
                    <p className="font-bold flex items-center gap-2 text-primary">
                      {order.name} <span className="text-xs font-normal text-muted-foreground px-1.5 py-0.5 bg-background rounded border">{order.cart.length} ერთ.</span>
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {new Date(order.timestamp).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-sm font-semibold">₾{order.finalTotal.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex bg-background border rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                    <Button variant="ghost" className="rounded-none h-10 px-3 hover:bg-primary/10 hover:text-primary" onClick={() => onRecall(order)}>
                      <Play className="w-4 h-4 mr-1.5" /> აღდგენა
                    </Button>
                    <div className="w-px bg-border" />
                    <Button variant="ghost" className="rounded-none h-10 px-3 text-destructive hover:bg-destructive/10" onClick={() => onDelete(order.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export function HoldOrderSaveDialog({ 
  open, 
  onOpenChange, 
  onSave
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState('');

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim());
    setName('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>შეკვეთის შეჩერება</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <Input 
            placeholder="მაგ: მაგიდა 5, ანა..." 
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>გაუქმება</Button>
          <Button onClick={handleSave} disabled={!name.trim()}>დამახსოვრება</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
