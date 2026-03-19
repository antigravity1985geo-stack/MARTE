// supabase/functions/rsge-credit-note/index.ts
// Deploy: supabase functions deploy rsge-credit-note

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { return_id } = await req.json()
    if (!return_id) throw new Error('return_id required')

    // ── Supabase admin client ─────────────────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // ── Fetch return with items ────────────────────────────────
    const { data: ret, error: retErr } = await supabase
      .from('returns')
      .select(`
        *,
        original_tx:transactions(
          receipt_number, client_tin,
          rsge_document_id
        ),
        return_items(
          returned_qty, unit_price, discount_amount, line_total,
          products(name, barcode, rs_ge_product_code)
        )
      `)
      .eq('id', return_id)
      .single()

    if (retErr || !ret) throw new Error('Return not found')
    if (ret.rsge_status === 'sent') {
      return new Response(
        JSON.stringify({ success: true, document_id: ret.rsge_document_id }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Fetch RS.GE credentials for tenant ────────────────────
    const { data: creds, error: credErr } = await supabase
      .from('rsge_credentials')
      .select('username, password, tin')
      .eq('tenant_id', ret.tenant_id)
      .single()

    if (credErr || !creds) throw new Error('RS.GE credentials not configured')

    // ── Build RS.GE Credit Note payload ───────────────────────
    // RS.GE API v1 — "invoice" type "2" = return/credit
    const payload = {
      header: {
        invoiceType:    2,                              // 2 = return invoice
        invoiceDate:    new Date().toISOString().split('T')[0],
        comment:        `დაბრუნება #${ret.return_number}`,
        dealReference:  ret.original_tx?.rsge_document_id ?? null,
        buyerTin:       ret.original_tx?.client_tin ?? null,
      },
      items: ret.return_items.map((item: any, idx: number) => ({
        lineNo:       idx + 1,
        productName:  item.products?.name ?? '',
        productCode:  item.products?.rs_ge_product_code ?? item.products?.barcode ?? '',
        unit:         'ც',
        quantity:     Number(item.returned_qty),
        unitPrice:    Number(item.unit_price),
        discount:     Number(item.discount_amount ?? 0),
        total:        Number(item.line_total),
        vatCode:      'B',   // standard 18% VAT — adjust per product
      })),
      totals: {
        totalWithoutVat: Number(ret.refund_amount) / 1.18,
        totalVat:        Number(ret.refund_amount) - Number(ret.refund_amount) / 1.18,
        total:           Number(ret.refund_amount),
      },
    }

    // ── Call RS.GE API ────────────────────────────────────────
    const rsgeRes = await fetch('https://api.rs.ge/invoice/save', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Basic ' + btoa(`${creds.username}:${creds.password}`),
        'X-TIN':         creds.tin,
      },
      body: JSON.stringify(payload),
    })

    const rsgeData = await rsgeRes.json()

    if (!rsgeRes.ok || !rsgeData?.id) {
      throw new Error(rsgeData?.message ?? `RS.GE HTTP ${rsgeRes.status}`)
    }

    // ── Log to rsge_audit_logs ────────────────────────────────
    await supabase.from('rsge_audit_logs').insert({
      tenant_id:      ret.tenant_id,
      document_type:  'credit_note',
      reference_id:   return_id,
      reference_type: 'return',
      request_body:   payload,
      response_body:  rsgeData,
      status:         'success',
      rsge_doc_id:    String(rsgeData.id),
    })

    return new Response(
      JSON.stringify({ success: true, document_id: String(rsgeData.id) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('[rsge-credit-note]', err)
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
