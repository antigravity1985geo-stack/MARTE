"use client"

import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { KPICards } from "@/components/dashboard/kpi-cards"
import { RevenueChart } from "@/components/dashboard/revenue-chart"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { ActivityTable } from "@/components/dashboard/activity-table"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Menu } from "lucide-react"

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="fixed left-4 top-4 z-50 flex size-10 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground lg:hidden"
        aria-label="მენიუს გადართვა"
      >
        <Menu className="size-5" />
      </button>

      {/* Sidebar - Hidden on mobile by default */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden",
          mobileMenuOpen ? "block" : "hidden"
        )}
        onClick={() => setMobileMenuOpen(false)}
      />
      <div
        className={cn(
          "lg:block",
          mobileMenuOpen ? "block" : "hidden"
        )}
      >
        <DashboardSidebar />
      </div>

      {/* Main Content */}
      <div className="lg:pl-64 transition-all duration-300">
        <DashboardHeader />

        <main className="p-6">
          {/* KPI Cards */}
          <section className="mb-6">
            <KPICards />
          </section>

          {/* Charts and Quick Actions */}
          <section className="mb-6 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <RevenueChart />
            </div>
            <div className="lg:col-span-1">
              <QuickActions />
            </div>
          </section>

          {/* Activity Table */}
          <section>
            <ActivityTable />
          </section>
        </main>
      </div>
    </div>
  )
}
