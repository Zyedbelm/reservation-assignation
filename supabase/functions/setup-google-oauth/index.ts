
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Récupérer les secrets OAuth Google depuis les variables d'environnement
    const googleClientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')
    const googleClientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')
    
    console.log('Checking Google OAuth configuration...')
    
    const config = {
      clientId: googleClientId || null,
      clientSecret: googleClientSecret || null,
      hasClientId: !!googleClientId,
      hasClientSecret: !!googleClientSecret,
      redirectUri: 'https://dnxyidnkmtrmkxucqrry.supabase.co/auth/v1/callback'
    }
    
    if (!googleClientId || !googleClientSecret) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Google OAuth credentials not configured',
          message: 'Veuillez configurer GOOGLE_OAUTH_CLIENT_ID et GOOGLE_OAUTH_CLIENT_SECRET dans les secrets Supabase',
          config: {
            hasClientId: config.hasClientId,
            hasClientSecret: config.hasClientSecret,
            redirectUri: config.redirectUri
          },
          instructions: {
            message: 'Please set GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET in Supabase secrets',
            redirectUri: config.redirectUri
          }
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    console.log('Google OAuth credentials found')
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Google OAuth configuré avec succès',
        config: {
          hasClientId: config.hasClientId,
          hasClientSecret: config.hasClientSecret,
          redirectUri: config.redirectUri,
          clientIdPreview: googleClientId.substring(0, 20) + '...'
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Setup error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erreur lors de la vérification de la configuration OAuth',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  }
})
