"use client"

import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  ShoppingCart,
  Pill,
  Home,
  Sparkles,
  Users,
  Calculator,
  UserCog,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

const navItems = [
  { icon: LayoutDashboard, label: "მთავარი პანელი", href: "#", active: true },
  { icon: ShoppingCart, label: "POS / გაყიდვები", href: "#" },
  { icon: Pill, label: "აფთიაქი და ინვენტარი", href: "#" },
  { icon: Home, label: "უძრავი ქონება (MarteHome)", href: "#" },
  { icon: Sparkles, label: "სილამაზის კლინიკა", href: "#" },
  { icon: Users, label: "CRM და ლოიალობა", href: "#" },
  { icon: Calculator, label: "ბუღალტერია", href: "#" },
  { icon: UserCog, label: "ადამიანური რესურსები (HR)", href: "#" },
  { icon: Settings, label: "პარამეტრები", href: "#" },
]

export function DashboardSidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar transition-all duration-300 ease-in-out",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
        <Link href="#" className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/20">
            <div className="size-5 rotate-45 rounded-sm bg-primary shadow-[0_0_20px_var(--glow)]" />
          </div>
          {!collapsed && (
            <span className="text-xl font-bold tracking-tight text-foreground">
              MARTE
            </span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
          aria-label={collapsed ? "გვერდითა პანელის გაფართოება" : "გვერდითა პანელის შეკუმშვა"}
        >
          {collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <ChevronLeft className="size-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
              item.active
                ? "bg-primary/15 text-primary shadow-[0_0_20px_var(--glow)]"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            )}
          >
            <item.icon
              className={cn(
                "size-5 shrink-0 transition-colors",
                item.active
                  ? "text-primary"
                  : "text-muted-foreground group-hover:text-foreground"
              )}
            />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
