"use client"

import { cn } from "@/lib/utils"
import { DollarSign, Building2, AlertTriangle, Handshake, TrendingUp, TrendingDown } from "lucide-react"

const kpiData = [
  {
    label: "მთლიანი შემოსავალი",
    value: "₾2,847,392",
    change: "+15.3%",
    trend: "up" as const,
    icon: DollarSign,
    iconBg: "bg-primary/20",
    iconColor: "text-primary",
  },
  {
    label: "აქტიური კლინიკები",
    value: "847",
    change: "+8.2%",
    trend: "up" as const,
    icon: Building2,
    iconBg: "bg-success/20",
    iconColor: "text-success",
  },
  {
    label: "ინვენტარის გაფრთხილებები",
    value: "23",
    change: "-12.5%",
    trend: "down" as const,
    icon: AlertTriangle,
    iconBg: "bg-warning/20",
    iconColor: "text-warning",
  },
  {
    label: "აქტიური გარიგებები",
    value: "1,284",
    change: "+22.1%",
    trend: "up" as const,
    icon: Handshake,
    iconBg: "bg-chart-2/20",
    iconColor: "text-chart-2",
  },
]

export function KPICards() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpiData.map((kpi) => (
        <div
          key={kpi.label}
          className="group relative overflow-hidden rounded-xl border border-glass-border bg-glass p-5 backdrop-blur-md transition-all duration-300 hover:border-primary/30 hover:shadow-[0_0_30px_var(--glow)]"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                {kpi.label}
              </p>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                {kpi.value}
              </p>
            </div>
            <div
              className={cn(
                "flex size-11 items-center justify-center rounded-lg transition-transform duration-300 group-hover:scale-110",
                kpi.iconBg
              )}
            >
              <kpi.icon className={cn("size-5", kpi.iconColor)} />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1">
            {kpi.trend === "up" ? (
              <TrendingUp className="size-4 text-success" />
            ) : (
              <TrendingDown className="size-4 text-destructive" />
            )}
            <span
              className={cn(
                "text-sm font-medium",
                kpi.trend === "up" ? "text-success" : "text-destructive"
              )}
            >
              {kpi.change}
            </span>
            <span className="text-sm text-muted-foreground">წინა თვესთან</span>
          </div>
          
          {/* Subtle glow effect */}
          <div className="pointer-events-none absolute -right-8 -top-8 size-24 rounded-full bg-primary/5 blur-2xl transition-all duration-500 group-hover:bg-primary/10" />
        </div>
      ))}
    </div>
  )
}
