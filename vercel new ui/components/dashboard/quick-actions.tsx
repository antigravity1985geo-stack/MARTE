"use client"

import { cn } from "@/lib/utils"
import { ShoppingCart, CalendarPlus, Building, UserPlus, ChevronRight } from "lucide-react"

const actions = [
  {
    label: "ახალი POS გაყიდვა",
    description: "შექმენით ახალი სალარო ტრანზაქცია",
    icon: ShoppingCart,
    color: "bg-primary/20 text-primary group-hover:bg-primary group-hover:text-primary-foreground",
  },
  {
    label: "ვიზიტის დაჯავშნა",
    description: "დანიშნეთ ახალი კლინიკური ვიზიტი",
    icon: CalendarPlus,
    color: "bg-success/20 text-success group-hover:bg-success group-hover:text-foreground",
  },
  {
    label: "ქონების დამატება",
    description: "დაამატეთ ახალი უძრავი ქონების განცხადება",
    icon: Building,
    color: "bg-warning/20 text-warning group-hover:bg-warning group-hover:text-foreground",
  },
  {
    label: "პაციენტის რეგისტრაცია",
    description: "დარეგისტრირეთ ახალი პაციენტი სისტემაში",
    icon: UserPlus,
    color: "bg-chart-2/20 text-chart-2 group-hover:bg-chart-2 group-hover:text-foreground",
  },
]

export function QuickActions() {
  return (
    <div className="rounded-xl border border-glass-border bg-glass p-6 backdrop-blur-md h-full">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-foreground">სწრაფი მოქმედებები</h3>
        <p className="text-sm text-muted-foreground">
          ხშირად გამოყენებული ოპერაციები
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {actions.map((action) => (
          <button
            key={action.label}
            className="group flex items-center gap-4 rounded-lg border border-border bg-secondary/30 p-4 text-left transition-all duration-300 hover:border-primary/30 hover:bg-secondary/50 hover:shadow-[0_0_20px_var(--glow)]"
          >
            <div
              className={cn(
                "flex size-11 shrink-0 items-center justify-center rounded-lg transition-all duration-300",
                action.color
              )}
            >
              <action.icon className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">{action.label}</p>
              <p className="text-sm text-muted-foreground truncate">
                {action.description}
              </p>
            </div>
            <ChevronRight className="size-5 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-primary" />
          </button>
        ))}
      </div>
    </div>
  )
}
