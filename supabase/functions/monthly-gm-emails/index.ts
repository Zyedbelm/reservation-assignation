import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
};

const WEBHOOK_URL = 'https://hook.eu2.make.com/mwu4iwa48t97nnoofdyfo57ntix2kpoh';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ status: 'ok', function: 'monthly-gm-emails' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('🚀 Starting monthly GM emails job...');
    const startTime = Date.now();

    // Parse request body to get trigger type
    let triggerType = 'cron';
    try {
      const body = await req.json();
      triggerType = body.trigger_type || 'manual';
    } catch {
      // Default to manual if no body
      triggerType = 'manual';
    }

    // Fetch all active game masters
    const { data: gameMasters, error: gmError } = await supabase
      .from('game_masters')
      .select('id, email, first_name, last_name, name')
      .eq('is_active', true)
      .not('email', 'is', null);

    if (gmError) {
      console.error('❌ Error fetching game masters:', gmError);
      throw gmError;
    }

    console.log(`✅ Found ${gameMasters?.length || 0} active GMs`);

    // Extract emails and filter out nulls, format as objects
    const gmEmails = gameMasters
      ?.filter(gm => gm.email !== null && gm.email.trim() !== '')
      .map(gm => ({ email: gm.email })) || [];

    // Get current month in YYYY-MM format
    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Prepare payload
    const payload = {
      type: 'monthly_gm_emails',
      month: monthYear,
      gm_emails: gmEmails,
      gm_emails_formatted: gmEmails.map((e: { email: string }, i: number) => `${i + 1} email : ${e.email}`),
      gm_count: gmEmails.length,
      generated_at: now.toISOString(),
      trigger_type: triggerType,
    };

    console.log('📧 Sending payload to webhook:', { 
      url: WEBHOOK_URL, 
      count: gmEmails.length,
      trigger: triggerType 
    });

    // Send to webhook
    let webhookSent = false;
    let errorMessage = null;

    try {
      const webhookResponse = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (webhookResponse.ok) {
        webhookSent = true;
        console.log('✅ Webhook sent successfully');
      } else {
        errorMessage = `Webhook returned status ${webhookResponse.status}`;
        console.error('⚠️ Webhook response not OK:', errorMessage);
      }
    } catch (webhookError: any) {
      errorMessage = webhookError.message || 'Unknown webhook error';
      console.error('❌ Error sending to webhook:', webhookError);
    }

    // Log execution
    const { error: logError } = await supabase
      .from('monthly_gm_emails_logs')
      .insert({
        executed_at: now.toISOString(),
        gm_count: gmEmails.length,
        webhook_sent: webhookSent,
        webhook_url: WEBHOOK_URL,
        trigger_type: triggerType,
        error_message: errorMessage,
      });

    if (logError) {
      console.error('⚠️ Error logging execution:', logError);
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Monthly GM emails job completed in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        gm_count: gmEmails.length,
        webhook_sent: webhookSent,
        duration_ms: duration,
        trigger_type: triggerType,
        error_message: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('❌ Fatal error in monthly-gm-emails:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
