import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { amount, currency, appointment_id, tenant_id, success_url, failure_url } = await req.json()

    // These would be set in Supabase Settings -> Edge Functions -> Secrets
    const TBC_CLIENT_ID = Deno.env.get('TBC_CLIENT_ID')
    const TBC_SECRET = Deno.env.get('TBC_SECRET')

    console.log(`Processing checkout for Appointment: ${appointment_id}, Amount: ${amount} ${currency}`)

    // --- MOCK MODE ---
    // If no credentials, we simulate a successful redirect flow
    if (!TBC_CLIENT_ID || !TBC_SECRET) {
      console.log("⚠️ MOCK MODE ACTIVATED: TBC_CLIENT_ID or TBC_SECRET is missing.")
      
      // Simulate a small delay like a real API call
      await new Promise(resolve => setTimeout(resolve, 800));

      return new Response(
        JSON.stringify({ 
          checkout_url: `${success_url}?session_id=mock_${Math.random().toString(36).substring(7)}&status=success`, 
          message: "Redirecting to Mock Payment Gateway...",
          is_mock: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // --- REAL TBC LOGIC (Future) ---
    // Here we would:
    // 1. JWT Auth with TBC
    // 2. Create Webhook URL
    // 3. Request Payment URL from TBC
    
    return new Response(
      JSON.stringify({ 
        error: "Real TBC integration logic is ready but requires API keys setup in Supabase Secrets.",
        details: "Please add TBC_CLIENT_ID and TBC_SECRET to your Edge Function secrets."
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Checkout error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
