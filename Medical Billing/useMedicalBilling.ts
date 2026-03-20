// hooks/useMedicalBilling.ts
import { useState, useEffect, useCallback } from 'react'
import { addMonths, addWeeks, addDays, format } from 'date-fns'
import { supabase }  from '@/lib/supabase'
import { useAuth }   from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'
import {
  MedicalInvoice, InvoiceStatus, InsuranceClaim, ClaimStatus,
  InstallmentPlan, InstallmentScheduleItem, InvoicePayment,
  InsuranceCompany, PatientInsurance,
  CreateInvoiceInput, InvoiceItemInput, PaymentMethod, Frequency,
} from '@/types/medicalBilling'
import toast from 'react-hot-toast'

// ─── Insurers list ────────────────────────────────────────────
export function useInsurers() {
  const { tenantId } = useTenant()
  const [insurers, setInsurers] = useState<InsuranceCompany[]>([])
  useEffect(() => {
    supabase.from('insurance_companies').select('*')
      .eq('tenant_id', tenantId).eq('is_active', true).order('name')
      .then(({ data }) => setInsurers(data ?? []))
  }, [tenantId])
  return { insurers }
}

// ─── Patient insurance policies ───────────────────────────────
export function usePatientInsurance(patientId: string | null) {
  const { tenantId } = useTenant()
  const [policies, setPolicies] = useState<PatientInsurance[]>([])
  useEffect(() => {
    if (!patientId) return
    supabase.from('patient_insurance')
      .select('*, insurer:insurance_companies(name,coverage_pct,claim_email)')
      .eq('tenant_id', tenantId).eq('patient_id', patientId).eq('is_active', true)
      .then(({ data }) => setPolicies(data ?? [] as PatientInsurance[]))
  }, [tenantId, patientId])
  return { policies, primary: policies.find(p => p.is_primary) ?? null }
}

// ─── Invoices list ────────────────────────────────────────────
export function useInvoices(opts?: {
  status?: InvoiceStatus | 'all'
  patientId?: string
  limit?: number
}) {
  const { tenantId } = useTenant()
  const [invoices, setInvoices] = useState<MedicalInvoice[]>([])
  const [loading,  setLoading]  = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('medical_invoices').select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(opts?.limit ?? 100)
    if (opts?.status && opts.status !== 'all') q = q.eq('status', opts.status)
    if (opts?.patientId) q = q.eq('patient_id', opts.patientId)
    const { data } = await q
    setInvoices(data ?? [] as MedicalInvoice[])
    setLoading(false)
  }, [tenantId, opts?.status, opts?.patientId, opts?.limit])

  useEffect(() => {
    load()
    const ch = supabase.channel('invoices_rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'medical_invoices', filter: `tenant_id=eq.${tenantId}` }, load)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [load, tenantId])

  return { invoices, loading, refetch: load }
}

// ─── Single invoice with full detail ─────────────────────────
export function useInvoice(id: string | null) {
  const [invoice, setInvoice] = useState<MedicalInvoice | null>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const [inv, items, payments, claim, plan] = await Promise.all([
      supabase.from('medical_invoices').select('*').eq('id', id).single(),
      supabase.from('invoice_items').select('*').eq('invoice_id', id).order('created_at'),
      supabase.from('invoice_payments').select('*').eq('invoice_id', id).order('paid_at'),
      supabase.from('insurance_claims').select('*, insurer:insurance_companies(name)').eq('invoice_id', id).maybeSingle(),
      supabase.from('installment_plans').select('*, schedule:installment_schedule(*)').eq('invoice_id', id).maybeSingle(),
    ])
    if (inv.data) {
      setInvoice({
        ...(inv.data as MedicalInvoice),
        items:       items.data ?? [],
        payments:    payments.data ?? [],
        claim:       claim.data ?? undefined,
        installment: plan.data ?? undefined,
      })
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])
  return { invoice, loading, refetch: load }
}

// ─── Create invoice ───────────────────────────────────────────
export function useCreateInvoice() {
  const { tenantId } = useTenant()
  const { user }     = useAuth()
  const [busy, setBusy] = useState(false)

  const create = useCallback(async (input: CreateInvoiceInput): Promise<MedicalInvoice | null> => {
    setBusy(true)
    try {
      // Compute totals
      const items = input.items.map(i => {
        const gross    = i.quantity * i.unit_price
        const discAmt  = gross * (i.discount_pct / 100)
        const taxable  = gross - discAmt
        const taxAmt   = taxable * (i.tax_pct / 100)
        return {
          ...i,
          discount_amount: discAmt,
          line_total:      taxable + taxAmt,
        }
      })
      const subtotal    = items.reduce((s, i) => s + i.quantity * i.unit_price, 0)
      const discountAmt = input.discount_amount +
                          items.reduce((s, i) => s + i.discount_amount, 0)
      const taxAmt      = items.reduce((s, i) => s + (i.line_total - (i.quantity * i.unit_price - i.discount_amount)), 0)
      const total       = subtotal - discountAmt + taxAmt

      // Insurance split
      const insuredTotal = items.filter(i => i.is_insured).reduce((s, i) => s + i.line_total, 0)
      const insuranceAmt = insuredTotal * (input.insurance_pct / 100)
      const copayAmt     = total - insuranceAmt

      // Create invoice
      const { data: inv, error: invErr } = await supabase
        .from('medical_invoices')
        .insert({
          tenant_id:        tenantId,
          invoice_number:   '',
          patient_id:       input.patient_id,
          patient_name:     input.patient_name,
          patient_phone:    input.patient_phone ?? null,
          appointment_id:   input.appointment_id ?? null,
          doctor_id:        input.doctor_id ?? null,
          doctor_name:      input.doctor_name ?? null,
          insurer_id:       input.insurer_id ?? null,
          policy_id:        input.policy_id ?? null,
          insurance_pct:    input.insurance_pct,
          insurance_amount: insuranceAmt,
          copay_amount:     copayAmt,
          subtotal, discount_amount: discountAmt, tax_amount: taxAmt, total,
          amount_paid: 0,
          issue_date:  format(new Date(), 'yyyy-MM-dd'),
          due_date:    input.due_date,
          status:      'draft',
          created_by:  user!.id,
        })
        .select().single()

      if (invErr) throw invErr

      // Insert items
      await supabase.from('invoice_items').insert(
        items.map(i => ({
          tenant_id:   tenantId,
          invoice_id:  (inv as MedicalInvoice).id,
          description: i.description,
          procedure_code: i.procedure_code || null,
          quantity:    i.quantity,
          unit_price:  i.unit_price,
          discount_pct: i.discount_pct,
          discount_amount: i.discount_amount,
          tax_pct:     i.tax_pct,
          line_total:  i.line_total,
          is_insured:  i.is_insured,
        }))
      )

      toast.success(`ინვოისი ${(inv as MedicalInvoice).invoice_number} შეიქმნა`)
      return inv as MedicalInvoice
    } catch (err: any) {
      toast.error(err.message)
      return null
    } finally {
      setBusy(false)
    }
  }, [tenantId, user])

  return { create, busy }
}

// ─── Record payment ───────────────────────────────────────────
export function useRecordPayment() {
  const { tenantId } = useTenant()
  const { user }     = useAuth()
  const [busy, setBusy] = useState(false)

  const record = useCallback(async (
    invoiceId: string,
    amount:    number,
    method:    PaymentMethod,
    reference?: string,
    notes?:    string,
    scheduleId?: string,
  ): Promise<boolean> => {
    setBusy(true)
    try {
      const { data: pay, error } = await supabase
        .from('invoice_payments')
        .insert({
          tenant_id: tenantId,
          invoice_id: invoiceId,
          amount, method,
          reference: reference ?? null,
          notes:     notes ?? null,
          recorded_by: user!.id,
        })
        .select().single()

      if (error) throw error

      // Update schedule item if installment
      if (scheduleId && pay) {
        await supabase.from('installment_schedule').update({
          paid_amount: amount,
          paid_at:     new Date().toISOString(),
          status:      'paid',
          payment_id:  (pay as InvoicePayment).id,
        }).eq('id', scheduleId)
      }

      toast.success(`₾${amount.toFixed(2)} ჩაწერილია`)
      return true
    } catch (err: any) {
      toast.error(err.message)
      return false
    } finally {
      setBusy(false)
    }
  }, [tenantId, user])

  return { record, busy }
}

// ─── Issue invoice (draft → issued) ──────────────────────────
export function useInvoiceActions() {
  const [busy, setBusy] = useState(false)

  const issue = useCallback(async (id: string): Promise<boolean> => {
    setBusy(true)
    const { error } = await supabase.from('medical_invoices')
      .update({ status: 'issued', updated_at: new Date().toISOString() }).eq('id', id)
    setBusy(false)
    if (error) { toast.error(error.message); return false }
    toast.success('ინვოისი გაცემულია')
    return true
  }, [])

  const cancel = useCallback(async (id: string): Promise<boolean> => {
    setBusy(true)
    const { error } = await supabase.from('medical_invoices')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id)
    setBusy(false)
    if (error) { toast.error(error.message); return false }
    toast.success('გაუქმდა')
    return true
  }, [])

  return { issue, cancel, busy }
}

// ─── Insurance claims ─────────────────────────────────────────
export function useInsuranceClaims(opts?: { status?: ClaimStatus | 'all' }) {
  const { tenantId } = useTenant()
  const [claims, setClaims] = useState<InsuranceClaim[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('insurance_claims')
      .select('*, insurer:insurance_companies(name), invoice:medical_invoices(invoice_number,patient_name,total)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
    if (opts?.status && opts.status !== 'all') q = q.eq('status', opts.status)
    const { data } = await q
    setClaims(data ?? [] as InsuranceClaim[])
    setLoading(false)
  }, [tenantId, opts?.status])

  useEffect(() => { load() }, [load])
  return { claims, loading, refetch: load }
}

export function useClaimActions() {
  const { tenantId } = useTenant()
  const { user }     = useAuth()
  const [busy, setBusy] = useState(false)

  const createClaim = useCallback(async (
    invoiceId:    string,
    insurerId:    string,
    policyId:     string | null,
    claimedAmount:number,
    diagCodes:    string[],
    procCodes:    string[],
    notes?:       string,
  ): Promise<InsuranceClaim | null> => {
    setBusy(true)
    const { data, error } = await supabase.from('insurance_claims')
      .insert({
        tenant_id: tenantId, invoice_id: invoiceId,
        insurer_id: insurerId, policy_id: policyId,
        claim_number: '', claimed_amount: claimedAmount,
        diagnosis_codes: diagCodes, procedure_codes: procCodes,
        notes: notes ?? null, status: 'draft',
        created_by: user!.id,
      })
      .select('*, insurer:insurance_companies(name)').single()
    setBusy(false)
    if (error) { toast.error(error.message); return null }
    toast.success(`Claim ${(data as InsuranceClaim).claim_number} შეიქმნა`)
    return data as InsuranceClaim
  }, [tenantId, user])

  const submitClaim = useCallback(async (id: string): Promise<boolean> => {
    setBusy(true)
    const { error } = await supabase.from('insurance_claims').update({
      status: 'submitted', submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    setBusy(false)
    if (error) { toast.error(error.message); return false }
    toast.success('Claim გაგზავნილია')
    return true
  }, [])

  const updateClaim = useCallback(async (
    id:     string,
    fields: Partial<InsuranceClaim>,
  ): Promise<boolean> => {
    setBusy(true)
    const { error } = await supabase.from('insurance_claims')
      .update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id)
    setBusy(false)
    if (error) { toast.error(error.message); return false }
    toast.success('განახლდა')
    return true
  }, [])

  return { createClaim, submitClaim, updateClaim, busy }
}

// ─── Installment plans ────────────────────────────────────────
export function useInstallmentPlan(invoiceId: string | null) {
  const [plan, setPlan] = useState<InstallmentPlan | null>(null)
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!invoiceId) return
    setLoading(true)
    supabase.from('installment_plans')
      .select('*, schedule:installment_schedule(*)')
      .eq('invoice_id', invoiceId).maybeSingle()
      .then(({ data }) => { setPlan(data as InstallmentPlan ?? null); setLoading(false) })
  }, [invoiceId])
  return { plan, loading }
}

export function useCreateInstallmentPlan() {
  const { tenantId } = useTenant()
  const { user }     = useAuth()
  const [busy, setBusy] = useState(false)

  const create = useCallback(async (
    invoiceId:    string,
    patientId:    string,
    totalAmount:  number,
    downPayment:  number,
    count:        number,
    frequency:    Frequency,
    firstDueDate: string,
    interestPct:  number,
  ): Promise<InstallmentPlan | null> => {
    setBusy(true)
    try {
      const financed  = totalAmount - downPayment
      const perInst   = parseFloat((financed / count).toFixed(2))

      const { data: plan, error } = await supabase
        .from('installment_plans')
        .insert({
          tenant_id: tenantId, invoice_id: invoiceId, patient_id: patientId,
          total_amount: totalAmount, down_payment: downPayment,
          financed_amount: financed, installment_count: count,
          installment_amount: perInst, frequency,
          first_due_date: firstDueDate, interest_pct: interestPct,
          status: 'active', created_by: user!.id,
        }).select().single()

      if (error) throw error

      // Generate schedule via RPC
      await supabase.rpc('create_installment_schedule', { p_plan_id: (plan as InstallmentPlan).id })

      // Record down payment if any
      if (downPayment > 0) {
        await supabase.from('invoice_payments').insert({
          tenant_id: tenantId, invoice_id: invoiceId,
          amount: downPayment, method: 'cash',
          notes: 'განვადების წინასწარი გადახდა', recorded_by: user!.id,
        })
      }

      toast.success('განვადების გეგმა შეიქმნა')
      return plan as InstallmentPlan
    } catch (err: any) {
      toast.error(err.message); return null
    } finally {
      setBusy(false)
    }
  }, [tenantId, user])

  return { create, busy }
}
