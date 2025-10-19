
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
    console.log('Starting Google Calendar API diagnostic...');
    
    const checks: Record<string, any> = {};
    const recommendations: string[] = [];
    
    // 1. Vérifier la présence de la clé API (nouveau nom)
    const googleApiKey = Deno.env.get('API_GOOGLE_CALENDAR') || Deno.env.get('GOOGLE_API_KEY');
    checks.apiKey = {
      name: 'Clé API Google',
      status: googleApiKey ? 'success' : 'error',
      message: googleApiKey ? 'Clé API présente' : 'Clé API manquante'
    };
    
    if (!googleApiKey) {
      recommendations.push('Configurer la variable API_GOOGLE_CALENDAR dans les secrets Supabase');
      return new Response(
        JSON.stringify({
          success: false,
          status: 'error',
          error: 'Clé API Google manquante',
          checks,
          recommendations
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    console.log('Google API Key found, testing API access...');

    // 2. Tester l'accès à l'API Google Calendar
    const calendarId = 'virtualrealitycenter60@gmail.com';
    const testUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?maxResults=1&key=${googleApiKey}`;
    
    console.log('Testing calendar access for:', calendarId);
    
    const response = await fetch(testUrl);
    const responseData = await response.json();
    
    console.log('API Response status:', response.status);
    console.log('API Response:', responseData);
    
    if (response.ok) {
      checks.apiAccess = {
        name: 'Accès API Calendar',
        status: 'success',
        message: 'API accessible'
      };
      
      checks.calendarAccess = {
        name: 'Accès au calendrier',
        status: 'success',
        message: `Calendrier accessible (${responseData.items?.length || 0} événements trouvés)`
      };

      // 3. Vérifier les permissions sur le calendrier
      if (responseData.items) {
        checks.calendarPermissions = {
          name: 'Permissions calendrier',
          status: 'success',
          message: 'Lecture des événements autorisée'
        };
      }
    } else {
      checks.apiAccess = {
        name: 'Accès API Calendar',
        status: 'error',
        message: `Erreur HTTP ${response.status}`
      };
      
      // Analyser les erreurs spécifiques
      if (response.status === 403) {
        if (responseData.error?.message?.includes('blocked') || responseData.error?.message?.includes('API_KEY_SERVICE_BLOCKED')) {
          recommendations.push('Activer l\'API Google Calendar dans la console Google Cloud');
          recommendations.push('Aller sur https://console.cloud.google.com/apis/library/calendar-json.googleapis.com');
        } else if (responseData.error?.message?.includes('quota')) {
          recommendations.push('Vérifier les quotas de l\'API Google Calendar');
        } else {
          recommendations.push('Vérifier les permissions de la clé API');
          recommendations.push('S\'assurer que la clé API peut accéder à l\'API Calendar');
        }
      } else if (response.status === 401) {
        recommendations.push('Vérifier la validité de la clé API Google');
        recommendations.push('Regénérer la clé API si nécessaire');
      } else if (response.status === 404) {
        recommendations.push('Vérifier que l\'adresse email du calendrier est correcte');
        recommendations.push('S\'assurer que le calendrier est accessible publiquement ou avec cette clé API');
      } else if (response.status === 400) {
        recommendations.push('Vérifier le format de la requête API');
      }
    }

    // 4. Vérifier la configuration du calendrier
    const calendarConfigCheck = {
      name: 'Configuration calendrier',
      status: 'success',
      message: `Calendrier configuré: ${calendarId}`
    };
    checks.calendarConfig = calendarConfigCheck;

    // 5. Tester la récupération d'événements avec une plage de dates
    if (response.ok) {
      const now = new Date();
      const futureDate = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 jours
      const eventsUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?key=${googleApiKey}&timeMin=${now.toISOString()}&timeMax=${futureDate.toISOString()}&maxResults=10`;
      
      const eventsResponse = await fetch(eventsUrl);
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        checks.eventRetrieval = {
          name: 'Récupération d\'événements',
          status: 'success',
          message: `${eventsData.items?.length || 0} événements trouvés sur 7 jours`
        };
      } else {
        checks.eventRetrieval = {
          name: 'Récupération d\'événements',
          status: 'warning',
          message: 'Erreur lors de la récupération des événements avec plage de dates'
        };
      }
    }

    // 6. Déterminer le statut général
    const hasErrors = Object.values(checks).some((check: any) => check.status === 'error');
    const hasWarnings = Object.values(checks).some((check: any) => check.status === 'warning');
    
    const overallStatus = hasErrors ? 'error' : hasWarnings ? 'warning' : 'success';

    const result = {
      success: !hasErrors,
      status: overallStatus,
      checks,
      recommendations: recommendations.length > 0 ? recommendations : undefined,
      details: {
        calendarId,
        apiKeyFound: !!googleApiKey,
        apiResponse: responseData,
        timestamp: new Date().toISOString()
      }
    };

    console.log('Diagnostic completed:', result);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Diagnostic error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        recommendations: [
          'Vérifier la connectivité réseau',
          'Vérifier la configuration des secrets Supabase'
        ],
        details: {
          timestamp: new Date().toISOString()
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  }
})
