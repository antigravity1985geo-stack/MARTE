import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const callerClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: 'არ ხართ ავტორიზებული' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin role
    const { data: roleData } = await createClient(supabaseUrl, supabaseServiceKey)
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'მხოლოდ ადმინს შეუძლია მოწვევა' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { email, fullName, role } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: 'ელ-ფოსტა სავალდებულოა' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const assignRole = role || 'cashier';

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName || '' },
      redirectTo: `${req.headers.get('origin') || 'https://localhost:3000'}/auth`,
    });

    if (error) {
      console.error('Invite error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Assign the selected role (override default trigger if needed)
    if (data.user?.id && assignRole !== 'cashier') {
      // Delete the default cashier role assigned by trigger, then insert the correct one
      await adminClient.from('user_roles').delete().eq('user_id', data.user.id);
      await adminClient.from('user_roles').insert({ user_id: data.user.id, role: assignRole });
    }

    return new Response(JSON.stringify({ success: true, userId: data.user?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('invite-user error:', err);
    return new Response(JSON.stringify({ error: err.message || 'სერვერის შეცდომა' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
