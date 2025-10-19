
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔄 [AUTO-SYNC-SCHEDULER] Démarrage de la synchronisation automatique...')
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Appeler la fonction sync-make-calendar
    const { data, error } = await supabase.functions.invoke('sync-make-calendar', {
      body: { 
        source: 'auto_cron_scheduler',
        trigger: 'auto_scheduler',
        timestamp: new Date().toISOString(),
        clean_duplicates: true
      }
    })

    if (error) {
      console.error('❌ [AUTO-SYNC-SCHEDULER] Erreur lors de l\'appel à sync-make-calendar:', error)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: error.message,
          timestamp: new Date().toISOString()
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }

    console.log('✅ [AUTO-SYNC-SCHEDULER] Synchronisation automatique terminée avec succès')
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data,
        message: 'Synchronisation automatique déclenchée avec succès',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('💥 [AUTO-SYNC-SCHEDULER] Erreur inattendue:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
