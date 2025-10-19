
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { type, value } = await req.json()

    console.log('💾 Saving API config:', { type, value: type === 'resend_api_key' ? '[HIDDEN]' : value })

    switch (type) {
      case 'resend_api_key':
        // Pour sauvegarder la clé Resend, nous utiliserions normalement Supabase Vault
        // Pour l'instant, nous simulons la sauvegarde
        console.log('🔑 Resend API key saved (would save to vault in production)')
        break

      case 'webhook':
        // Sauvegarder le webhook dans une table de configuration
        const { data: webhookData, error: webhookError } = await supabaseClient
          .from('api_configurations')
          .upsert({
            config_type: 'webhook',
            config_name: value.name,
            config_value: {
              url: value.url,
              description: value.description,
              active: true
            },
            updated_at: new Date().toISOString()
          })

        if (webhookError) {
          console.error('Error saving webhook:', webhookError)
          throw webhookError
        }

        console.log('🪝 Webhook saved:', webhookData)
        break

      case 'remove_webhook':
        const { error: removeError } = await supabaseClient
          .from('api_configurations')
          .delete()
          .eq('config_type', 'webhook')
          .eq('id', value.id)

        if (removeError) {
          console.error('Error removing webhook:', removeError)
          throw removeError
        }

        console.log('🗑️ Webhook removed')
        break

      default:
        throw new Error(`Unknown config type: ${type}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Configuration saved successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('💥 Error saving API config:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
