import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  prefix?: string;
  suffix?: string;
  color?: 'primary' | 'destructive' | 'success' | 'warning' | 'info' | 'accent';
  change?: number;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  prefix = '',
  suffix = '',
  color = 'primary',
  change,
  className
}) => {
  const formattedValue = typeof value === 'number' ? 
    new Intl.NumberFormat('ka-GE', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value) : 
    value;

  const colorStyles = {
    primary: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    destructive: 'text-red-400 bg-red-500/10 border-red-500/20',
    success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    info: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    accent: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  };

  return (
    <Card className={cn("overflow-hidden border-border bg-card hover:bg-accent/5 transition-all duration-300 group shadow-sm", className)}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className={cn("p-2 rounded-lg transition-colors", colorStyles[color])}>
            {Icon && <Icon className="h-5 w-5" />}
          </div>
          {change !== undefined && (
            <div className={cn(
              "text-xs font-bold px-2 py-1 rounded-full",
              change >= 0 ? "text-emerald-500 bg-emerald-500/10" : "text-red-500 bg-red-500/10"
            )}>
              {change >= 0 ? '+' : ''}{change.toFixed(1)}%
            </div>
          )}
        </div>
        
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-foreground tracking-tight">
              {prefix}{formattedValue}{suffix}
            </span>
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
