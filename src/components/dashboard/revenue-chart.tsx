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

const defaultChartData = [
  { day: "ორშაბათი", revenue: 4000, profit: 2400 },
  { day: "სამშაბათი", revenue: 3000, profit: 1398 },
  { day: "ოთხშაბათი", revenue: 2000, profit: 9800 },
  { day: "ხუთშაბათი", revenue: 2780, profit: 3908 },
  { day: "პარასკევი", revenue: 1890, profit: 4800 },
  { day: "შაბათი", revenue: 2390, profit: 3800 },
  { day: "კვირა", revenue: 3490, profit: 4300 },
]

const filters = ["1კვ", "1თვ", "1წ"] as const

export function RevenueChart({ data }: { data?: any[] }) {
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]>("1წ")
  const displayData = data && data.length > 0 ? data : defaultChartData;

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
          <AreaChart
            accessibilityLayer
            data={displayData}
            margin={{
              top: 10,
              right: 10,
              left: 12,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expensesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="oklch(0.28 0.05 255)"
              vertical={false}
            />
            <XAxis
              dataKey="day"
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
          <div className="size-3 rounded-full bg-info" />
          <span className="text-sm text-muted-foreground">ხარჯები</span>
        </div>
      </div>
    </div>
  )
}
