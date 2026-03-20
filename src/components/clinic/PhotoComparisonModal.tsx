import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Maximize2, Columns, Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface Photo {
  url: string;
  date: string;
  doctor?: string;
  notes?: string;
}

interface PhotoComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  availablePhotos: Photo[];
  initialPhoto?: Photo;
}

export function PhotoComparisonModal({ isOpen, onClose, availablePhotos, initialPhoto }: PhotoComparisonModalProps) {
  const [photoA, setPhotoA] = useState<Photo | null>(initialPhoto || availablePhotos[0] || null);
  const [photoB, setPhotoB] = useState<Photo | null>(availablePhotos[1] || availablePhotos[0] || null);
  const [selectionMode, setSelectionMode] = useState<'A' | 'B' | null>(null);

  if (!isOpen) return null;

  const handleSelect = (photo: Photo) => {
    if (selectionMode === 'A') setPhotoA(photo);
    if (selectionMode === 'B') setPhotoB(photo);
    setSelectionMode(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md animate-in fade-in duration-300 px-4">
      <div className="w-full max-w-7xl h-[90vh] bg-background rounded-[2rem] overflow-hidden flex flex-col shadow-2xl border border-border/40">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-border/40 bg-muted/20">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-2xl">
              <Layers className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-wider">ფოტოების შედარება</h2>
              <p className="text-sm text-muted-foreground font-medium">შეადარეთ პაციენტის მდგომარეობა დროში</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="rounded-2xl hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={onClose}>
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          
          {/* Main Comparison Area */}
          <div className="flex-1 grid grid-cols-2 divide-x divide-border/40 bg-black/5 p-4 gap-4">
            
            {/* Photo A */}
            <div className="flex flex-col gap-4 relative">
              <div className="flex items-center justify-between px-2">
                <Badge variant="outline" className="bg-background/80 backdrop-blur-sm border-primary/20 text-primary font-bold px-3 py-1 uppercase tracking-tighter">სურათი A</Badge>
                <Button variant="secondary" size="sm" className="rounded-xl font-bold h-8" onClick={() => setSelectionMode('A')}>
                  შეცვლა
                </Button>
              </div>
              <div className="flex-1 relative rounded-[1.5rem] overflow-hidden shadow-inner group border-4 border-background">
                {photoA ? (
                  <>
                    <img src={photoA.url} className="w-full h-full object-contain bg-muted/10 transition-transform duration-700 group-hover:scale-105" alt="Before" />
                    <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                      <p className="text-white font-bold text-sm">{format(new Date(photoA.date), 'dd MMM yyyy HH:mm')}</p>
                      {photoA.doctor && <p className="text-white/70 text-xs font-medium mt-1">ექიმი: {photoA.doctor}</p>}
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground italic font-medium">არ არის არჩეული</div>
                )}
              </div>
            </div>

            {/* Photo B */}
            <div className="flex flex-col gap-4 relative pl-4">
              <div className="flex items-center justify-between px-2">
                <Badge variant="outline" className="bg-background/80 backdrop-blur-sm border-emerald-500/20 text-emerald-600 font-bold px-3 py-1 uppercase tracking-tighter">სურათი B</Badge>
                <Button variant="secondary" size="sm" className="rounded-xl font-bold h-8" onClick={() => setSelectionMode('B')}>
                  შეცვლა
                </Button>
              </div>
              <div className="flex-1 relative rounded-[1.5rem] overflow-hidden shadow-inner group border-4 border-background">
                {photoB ? (
                  <>
                    <img src={photoB.url} className="w-full h-full object-contain bg-muted/10 transition-transform duration-700 group-hover:scale-105" alt="After" />
                    <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-500">
                      <p className="text-white font-bold text-sm">{format(new Date(photoB.date), 'dd MMM yyyy HH:mm')}</p>
                      {photoB.doctor && <p className="text-white/70 text-xs font-medium mt-1">ექიმი: {photoB.doctor}</p>}
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground italic font-medium">არ არის არჩეული</div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar / Selection Panel (Toggleable) */}
          {selectionMode && (
            <div className="w-80 border-l border-border/40 bg-muted/10 flex flex-col animate-in slide-in-from-right duration-300">
              <div className="p-6 border-b border-border/40">
                <h3 className="font-bold flex items-center gap-2">
                  არჩიეთ {selectionMode} სურათი
                  <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={() => setSelectionMode(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {availablePhotos.map((photo, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "group cursor-pointer rounded-2xl overflow-hidden border-2 transition-all",
                      (selectionMode === 'A' ? photoA : photoB)?.url === photo.url 
                        ? "border-primary shadow-lg shadow-primary/10" 
                        : "border-transparent hover:border-muted-foreground/20"
                    )}
                    onClick={() => handleSelect(photo)}
                  >
                    <div className="aspect-square relative">
                      <img src={photo.url} className="w-full h-full object-cover" alt={`Selectable ${i}`} />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="p-3 bg-background group-hover:bg-muted/30 transition-colors">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-70">
                        {format(new Date(photo.date), 'dd.MM.yyyy')}
                      </p>
                      <p className="text-[10px] truncate text-muted-foreground mt-0.5">{photo.doctor || 'ექიმი'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="px-8 py-4 bg-muted/40 flex items-center justify-between border-t border-border/40">
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                <Columns className="w-3.5 h-3.5" /> Side-by-Side Mode
             </div>
             <div className="w-[1px] h-4 bg-border/60" />
             <div className="text-[11px] font-medium text-muted-foreground">
                მინიშნება: გამოიყენეთ ფერისფერი ღილაკები სურათების შესაცვლელად
             </div>
          </div>
          <div className="text-[10px] font-mono opacity-40">MARTE CLINICAL IMAGING v2.0</div>
        </div>
      </div>
    </div>
  );
}
