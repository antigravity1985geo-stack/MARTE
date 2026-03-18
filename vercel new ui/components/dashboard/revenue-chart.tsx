"use client"

import { cn } from "@/lib/utils"
import { useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

const data = [
  { month: "იან", revenue: 186000, expenses: 80000 },
  { month: "თებ", revenue: 205000, expenses: 90000 },
  { month: "მარ", revenue: 237000, expenses: 120000 },
  { month: "აპრ", revenue: 273000, expenses: 110000 },
  { month: "მაი", revenue: 209000, expenses: 95000 },
  { month: "ივნ", revenue: 314000, expenses: 130000 },
  { month: "ივლ", revenue: 298000, expenses: 125000 },
  { month: "აგვ", revenue: 342000, expenses: 140000 },
  { month: "სექ", revenue: 378000, expenses: 155000 },
  { month: "ოქტ", revenue: 405000, expenses: 165000 },
  { month: "ნოე", revenue: 389000, expenses: 150000 },
  { month: "დეკ", revenue: 456000, expenses: 180000 },
]

const filters = ["1კვ", "1თვ", "1წ"] as const

export function RevenueChart() {
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("1წ")

  return (
    <div className="rounded-xl border border-glass-border bg-glass p-6 backdrop-blur-md">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">შემოსავალი დროის მიხედვით</h3>
          <p className="text-sm text-muted-foreground">
            ყოველთვიური შემოსავლებისა და ხარჯების დეტალები
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary/50 p-1">
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200",
                activeFilter === filter
                  ? "bg-primary text-primary-foreground shadow-[0_0_15px_var(--glow)]"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.65 0.22 255)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="oklch(0.65 0.22 255)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.7 0.18 180)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="oklch(0.7 0.18 180)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.28 0.05 255)"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "oklch(0.65 0.02 250)", fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "oklch(0.65 0.02 250)", fontSize: 12 }}
              tickFormatter={(value) => `₾${value / 1000}ათ`}
              dx={-10}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "oklch(0.17 0.04 255)",
                border: "1px solid oklch(0.28 0.05 255)",
                borderRadius: "8px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
              }}
              labelStyle={{ color: "oklch(0.95 0.01 250)", fontWeight: 600 }}
              itemStyle={{ color: "oklch(0.75 0.02 250)" }}
              formatter={(value: number) => [`₾${value.toLocaleString()}`, ""]}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="oklch(0.65 0.22 255)"
              strokeWidth={2}
              fill="url(#revenueGradient)"
              name="შემოსავალი"
            />
            <Area
              type="monotone"
              dataKey="expenses"
              stroke="oklch(0.7 0.18 180)"
              strokeWidth={2}
              fill="url(#expensesGradient)"
              name="ხარჯები"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-full bg-primary" />
          <span className="text-sm text-muted-foreground">შემოსავალი</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3 rounded-full bg-chart-2" />
          <span className="text-sm text-muted-foreground">ხარჯები</span>
        </div>
      </div>
    </div>
  )
}
