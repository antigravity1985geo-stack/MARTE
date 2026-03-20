// supabase/functions/rsge-split-invoice/index.ts
// Sends RS.GE fiscal invoice for a transaction that may have
// multiple payment methods (split payment).
// Deploy: supabase functions deploy rsge-split-invoice

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { transaction_id } = await req.json()
    if (!transaction_id) throw new Error('transaction_id required')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ── Fetch transaction with items + payments ───────────────
    const { data: tx, error: txErr } = await supabase
      .from('transactions')
      .select(`
        *,
        transaction_items (
          qty, unit_price, discount_amount, line_total, tax_rate,
          products ( name, barcode, rs_ge_product_code )
        ),
        transaction_payments ( method, amount, rsge_payment_type )
      `)
      .eq('id', transaction_id)
      .single()

    if (txErr || !tx) throw new Error('Transaction not found')

    // ── Fetch credentials ─────────────────────────────────────
    const { data: creds } = await supabase
      .from('rsge_credentials')
      .select('username, password, tin')
      .eq('tenant_id', tx.tenant_id)
      .single()

    if (!creds) throw new Error('RS.GE credentials not configured')

    // ── Build RS.GE payload ───────────────────────────────────
    // RS.GE supports mixed payment types per invoice.
    // paymentMethods array: [{type:'1',amount:X},{type:'2',amount:Y}]
    const paymentMethods = tx.transaction_payments.map((p: any) => ({
      paymentType:   p.rsge_payment_type ?? (p.method === 'cash' ? '1' : '2'),
      paymentAmount: Number(p.amount),
    }))

    const payload = {
      header: {
        invoiceType:  1,   // 1 = sale
        invoiceDate:  new Date(tx.created_at).toISOString().split('T')[0],
        buyerTin:     tx.client_tin ?? null,
        comment:      tx.receipt_number,
      },
      items: tx.transaction_items.map((item: any, i: number) => ({
        lineNo:      i + 1,
        productName: item.products?.name ?? '',
        productCode: item.products?.rs_ge_product_code ?? item.products?.barcode ?? '',
        unit:        'ც',
        quantity:    Number(item.qty),
        unitPrice:   Number(item.unit_price),
        discount:    Number(item.discount_amount ?? 0),
        total:       Number(item.line_total),
        vatCode:     'B',
      })),
      payments: paymentMethods,
      totals: {
        totalWithoutVat: Number(tx.subtotal) / 1.18,
        totalVat:        Number(tx.tax_total),
        total:           Number(tx.total),
      },
    }

    // ── Send to RS.GE ─────────────────────────────────────────
    const res = await fetch('https://api.rs.ge/invoice/save', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Basic ' + btoa(`${creds.username}:${creds.password}`),
        'X-TIN': creds.tin,
      },
      body: JSON.stringify(payload),
    })

    const rsgeData = await res.json()
    if (!res.ok || !rsgeData?.id) {
      throw new Error(rsgeData?.message ?? `RS.GE HTTP ${res.status}`)
    }

    const docId = String(rsgeData.id)

    // ── Persist result ────────────────────────────────────────
    await Promise.all([
      supabase.from('transactions').update({
        rsge_status:      'sent',
        rsge_document_id: docId,
      }).eq('id', transaction_id),

      supabase.from('rsge_audit_logs').insert({
        tenant_id:      tx.tenant_id,
        document_type:  'invoice',
        reference_id:   transaction_id,
        reference_type: 'transaction',
        request_body:   payload,
        response_body:  rsgeData,
        status:         'success',
        rsge_doc_id:    docId,
      }),
    ])

    return new Response(
      JSON.stringify({ success: true, document_id: docId }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  }
})
