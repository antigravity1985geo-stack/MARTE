import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Check, Info, History } from "lucide-react";

interface ToothProps {
  number: number;
  status?: 'planned' | 'completed' | 'none';
  treatments?: any[];
  onClick?: (number: number) => void;
  onQuickAction?: (number: number, action: string) => void;
}

const getToothPath = (number: number) => {
  const n = number % 10;
  // Molars (6, 7, 8)
  if (n >= 6) {
    return "M4 12C4 7 8 4 17 4C26 4 30 7 30 12C30 18 28 22 26 30C25 35 22 38 17 38C12 38 9 35 8 30C6 22 4 18 4 12Z";
  }
  // Premolars (4, 5)
  if (n === 4 || n === 5) {
    return "M6 12C6 8 10 5 17 5C24 5 28 8 28 12C28 18 26 22 24 30C23 34 21 37 17 37C13 37 11 34 10 30C8 22 6 18 6 12Z";
  }
  // Canines (3)
  if (n === 3) {
    return "M8 12C8 9 12 3 17 3C22 3 26 9 26 12C26 18 24 22 22 30C21 34 19 36 17 36C15 36 13 34 12 30C10 22 8 18 8 12Z";
  }
  // Incisors (1, 2)
  return "M10 10C10 8 12 6 17 6C22 6 24 8 24 10C24 18 22 22 20 30C19 34 18 35 17 35C16 35 15 34 14 30C12 22 10 18 10 10Z";
};

const Tooth = ({ number, status = 'none', treatments = [], onClick, onQuickAction }: ToothProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const getFillColor = () => {
    if (status === 'completed') return 'fill-emerald-500/90 stroke-emerald-600';
    if (status === 'planned') return 'fill-amber-500/90 stroke-amber-600';
    return 'fill-slate-100 stroke-slate-300 dark:fill-slate-800 dark:stroke-slate-700';
  };

  const quickActions = [
    { label: 'კონსულტაცია', color: 'bg-blue-500' },
    { label: 'წმენდა', color: 'bg-teal-500' },
    { label: 'დაპლომბვა', color: 'bg-amber-500' },
    { label: 'ექსტრაქცია', color: 'bg-red-500' },
    { label: 'ლაბ. შეკვეთა', color: 'bg-purple-500' },
  ];

  return (
    <div className="relative group/tooth">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <div 
                  onClick={() => onClick?.(number)}
                  className={cn(
                    "cursor-pointer flex flex-col items-center gap-1 transition-all duration-300 transform hover:scale-125 active:scale-95 z-0 hover:z-50",
                    isOpen && "scale-125 z-50"
                  )}
                >
                  <svg width="40" height="48" viewBox="0 0 34 42" className="drop-shadow-md">
                    <defs>
                      <filter id={`shadow-${number}`} x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur in="SourceAlpha" stdDeviation="1" />
                        <feOffset dx="0" dy="1" result="offsetblur" />
                        <feComponentTransfer>
                          <feFuncA type="linear" slope="0.2" />
                        </feComponentTransfer>
                        <feMerge>
                          <feMergeNode />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>
                    <path
                      d={getToothPath(number)}
                      className={cn("transition-all duration-500 ease-out", getFillColor())}
                      strokeWidth="1.5"
                      filter={`url(#shadow-${number})`}
                    />
                    <text 
                      x="17" 
                      y="22" 
                      textAnchor="middle" 
                      className="fill-slate-600 dark:fill-slate-300 text-[9px] font-black pointer-events-none select-none"
                    >
                      {number}
                    </text>
                  </svg>
                  {status !== 'none' && (
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full absolute -top-1",
                      status === 'completed' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                    )} />
                  )}
                </div>
              </PopoverTrigger>
            </TooltipTrigger>
            {!isOpen && (
              <TooltipContent className="p-3 w-64 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-white/20 shadow-2xl rounded-2xl">
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                    <span className="font-black text-sm">კბილი #{number}</span>
                    {status !== 'none' && (
                      <Badge className={cn(
                        "text-[9px] px-2 h-4 border-none",
                        status === 'completed' ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                      )}>
                        {status === 'completed' ? 'დასრულდა' : 'დაგეგმილი'}
                      </Badge>
                    )}
                  </div>
                  {treatments.length > 0 ? (
                    <div className="space-y-2 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                      {treatments.map((t, i) => (
                        <div key={i} className="text-[10px] flex flex-col bg-slate-100/50 dark:bg-slate-800/50 p-2 rounded-xl">
                          <div className="flex justify-between font-bold">
                            <span className="truncate">{t.name}</span>
                            <span className="text-primary font-black ml-2 whitespace-nowrap">₾{t.cost}</span>
                          </div>
                          <span className="text-muted-foreground mt-0.5 opacity-70">
                            {new Date(t.created_at).toLocaleDateString('ka-GE')}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-2 text-center space-y-2">
                       <Info className="h-5 w-5 mx-auto text-slate-300" />
                       <p className="text-[10px] text-muted-foreground italic">ჩანაწერები არ არის</p>
                    </div>
                  )}
                  <div className="pt-1 flex items-center justify-center gap-1.5 text-[9px] text-primary font-bold opacity-60">
                    <Plus className="h-3 w-3" /> დააჭირეთ სწრაფი ქმედებებისთვის
                  </div>
                </div>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        <PopoverContent className="w-48 p-2 rounded-2xl border-white/20 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-2xl animate-in zoom-in-95 duration-200">
           <div className="space-y-1">
             <div className="px-2 py-1.5 mb-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">სწრაფი ქმედება</span>
             </div>
             {quickActions.map((action, i) => (
               <Button 
                 key={i} 
                 variant="ghost" 
                 className="w-full justify-start gap-2 h-9 text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
                 onClick={() => {
                   onQuickAction?.(number, action.label);
                   setIsOpen(false);
                 }}
               >
                 <div className={cn("w-2 h-2 rounded-full", action.color)} />
                 <span className="font-semibold">{action.label}</span>
               </Button>
             ))}
             <Button 
               variant="default" 
               className="w-full mt-2 gap-2 h-9 text-[11px] rounded-xl font-black bg-primary text-white hover:brightness-110 shadow-lg shadow-primary/20"
               onClick={() => {
                 onClick?.(number);
                 setIsOpen(false);
               }}
             >
               <Plus className="h-4 w-4" /> სრული დაგეგმვა
             </Button>
           </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export function DentalChart({ treatments = [], onToothClick, onQuickAction }: { 
  treatments?: any[], 
  onToothClick?: (num: number) => void,
  onQuickAction?: (num: number, action: string) => void
}) {
  const quadrants = {
    ur: [18, 17, 16, 15, 14, 13, 12, 11],
    ul: [21, 22, 23, 24, 25, 26, 27, 28],
    lr: [48, 47, 46, 45, 44, 43, 42, 41],
    ll: [31, 32, 33, 34, 35, 36, 37, 38]
  };

  const getToothData = (num: number) => {
    const toothTreatments = treatments.filter(t => t.tooth_number?.toString() === num.toString());
    const hasCompleted = toothTreatments.some(t => t.status === 'completed');
    const hasPlanned = toothTreatments.some(t => t.status === 'planned');
    
    return {
      status: hasCompleted ? 'completed' : hasPlanned ? 'planned' : 'none',
      treatments: toothTreatments
    };
  };

  return (
    <div className="relative p-10 bg-slate-50/30 dark:bg-slate-900/30 rounded-[3rem] border border-white/40 dark:border-slate-800 shadow-inner overflow-hidden group/chart">
      {/* Background Polish */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 transition-colors duration-1000 group-hover/chart:bg-primary/10" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-[80px] -ml-24 -mb-24" />

      <div className="max-w-4xl mx-auto space-y-16 relative z-10">
        {/* Upper Jaw */}
        <div className="flex flex-col items-center gap-6">
          <div className="flex items-center gap-3">
             <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-slate-300 dark:to-slate-700" />
             <Badge variant="outline" className="text-[10px] bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm px-4 py-1.5 border-none shadow-sm uppercase tracking-[0.2em] font-black text-muted-foreground/60">ზედა ყბა • Upper Jaw</Badge>
             <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-slate-300 dark:to-slate-700" />
          </div>
          <div className="flex justify-center flex-wrap gap-2 sm:gap-4 lg:gap-6">
            <div className="flex gap-1.5 sm:gap-2 items-end">
              {quadrants.ur.map(num => (
                <Tooth key={num} number={num} {...getToothData(num) as any} onClick={onToothClick} onQuickAction={onQuickAction} />
              ))}
            </div>
            <div className="w-[2px] bg-gradient-to-b from-transparent via-slate-300/50 to-transparent self-stretch mx-2" />
            <div className="flex gap-1.5 sm:gap-2 items-end">
              {quadrants.ul.map(num => (
                <Tooth key={num} number={num} {...getToothData(num) as any} onClick={onToothClick} onQuickAction={onQuickAction} />
              ))}
            </div>
          </div>
        </div>

        {/* Lower Jaw */}
        <div className="flex flex-col items-center gap-6">
          <div className="flex justify-center flex-wrap gap-2 sm:gap-4 lg:gap-6">
            <div className="flex gap-1.5 sm:gap-2 items-start">
              {quadrants.lr.map(num => (
                <Tooth key={num} number={num} {...getToothData(num) as any} onClick={onToothClick} onQuickAction={onQuickAction} />
              ))}
            </div>
            <div className="w-[2px] bg-gradient-to-b from-transparent via-slate-300/50 to-transparent self-stretch mx-2" />
            <div className="flex gap-1.5 sm:gap-2 items-start">
              {quadrants.ll.map(num => (
                <Tooth key={num} number={num} {...getToothData(num) as any} onClick={onToothClick} onQuickAction={onQuickAction} />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
             <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-slate-300 dark:to-slate-700" />
             <Badge variant="outline" className="text-[10px] bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm px-4 py-1.5 border-none shadow-sm uppercase tracking-[0.2em] font-black text-muted-foreground/60">ქვედა ყბა • Lower Jaw</Badge>
             <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-slate-300 dark:to-slate-700" />
          </div>
        </div>
      </div>

      {/* Legend & Summary */}
      <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800/50 flex flex-col md:flex-row items-center justify-between gap-6 px-4">
        <div className="flex flex-wrap justify-center gap-8">
          <div className="flex items-center gap-3 group/leg cursor-help">
            <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)] animate-pulse" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">დასრულებული</span>
              <span className="text-[9px] text-muted-foreground">ჯანმრთელი / ნამკურნალები</span>
            </div>
          </div>
          <div className="flex items-center gap-3 group/leg cursor-help">
            <div className="w-4 h-4 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">დაგეგმილი</span>
              <span className="text-[9px] text-muted-foreground">საჭიროებს ჩარევას</span>
            </div>
          </div>
          <div className="flex items-center gap-3 group/leg cursor-help opacity-60">
            <div className="w-4 h-4 rounded-lg bg-slate-200 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-700" />
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">ინტაქტური</span>
              <span className="text-[9px] text-muted-foreground">მანიპულაციის გარეშე</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white/50 dark:bg-slate-800/50 p-2 pl-4 pr-6 rounded-2xl border border-white/40 shadow-sm">
           <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <History className="h-5 w-5" />
           </div>
           <div>
              <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase leading-none mb-1">ჯამური ისტორია</p>
              <p className="text-[10px] text-muted-foreground">სულ {treatments.length} ჩანაწერი</p>
           </div>
        </div>
      </div>
    </div>
  );
}
