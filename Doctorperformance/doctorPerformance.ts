// types/doctorPerformance.ts

export type DateRange = '7d' | '30d' | '90d' | '6m' | '1y'

export interface Doctor {
  id:         string
  full_name:  string
  email?:     string
  avatar_url?: string | null
  specialty?: string
}

// From doctor_daily_stats view
export interface DoctorDailyStat {
  day:                 string
  doctor_id:           string
  doctor_name:         string
  total_appointments:  number
  completed:           number
  no_shows:            number
  cancellations:       number
  avg_duration_min:    number
  unique_patients:     number
}

// From doctor_revenue_stats view
export interface DoctorRevenueStat {
  month:          string
  doctor_id:      string
  doctor_name:    string
  invoices:       number
  gross_revenue:  number
  total_discounts:number
  net_revenue:    number
  tax_collected:  number
  avg_invoice:    number
}

// From get_doctor_retention RPC
export interface DoctorRetention {
  doctor_id:          string
  doctor_name:        string
  total_patients:     number
  returning_patients: number
  new_patients:       number
  retention_rate:     number
}

// From chair_utilization view
export interface ChairUtilization {
  day:              string
  chair_id:         string
  chair_name:       string
  room:             string | null
  appointments:     number
  booked_minutes:   number
  utilization_pct:  number
}

// From get_doctor_procedures RPC
export interface DoctorProcedure {
  doctor_id:      string
  doctor_name:    string
  procedure_name: string
  count:          number
  total_revenue:  number
}

// ─── Aggregated card data (computed client-side) ──────────────

export interface DoctorSummaryCard {
  doctor_id:          string
  doctor_name:        string
  // Revenue
  total_revenue:      number
  avg_invoice:        number
  revenue_trend:      number    // % change vs prev period
  // Appointments
  total_appointments: number
  completion_rate:    number    // completed / total %
  no_show_rate:       number
  avg_duration_min:   number
  // Patients
  unique_patients:    number
  retention_rate:     number
  // Productivity
  procedures_per_day: number
  revenue_per_hour:   number
}
