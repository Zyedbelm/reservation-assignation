
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
import { format, parseISO } from 'https://esm.sh/date-fns@3.6.0'
import { formatInTimeZone } from 'https://esm.sh/date-fns-tz@3.0.0'

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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Log sync start
    const { data: syncLog } = await supabaseClient
      .from('sync_logs')
      .insert({
        sync_type: 'manual',
        status: 'in_progress'
      })
      .select()
      .single()

    console.log('Starting Google Calendar sync...')

    // Configuration for Google Calendar API - utiliser le bon nom de secret
    const GOOGLE_CALENDAR_ID = 'virtualrealitycenter60@gmail.com'
    const GOOGLE_API_KEY = Deno.env.get('API_GOOGLE_CALENDAR') || Deno.env.get('GOOGLE_API_KEY')

    console.log('API Key found:', GOOGLE_API_KEY ? 'Yes' : 'No')
    console.log('Calendar ID:', GOOGLE_CALENDAR_ID)

    if (!GOOGLE_API_KEY) {
      const errorMessage = 'Google API Key not configured'
      console.error(errorMessage)
      
      // Update sync log with error
      if (syncLog) {
        await supabaseClient
          .from('sync_logs')
          .update({
            status: 'failed',
            error_message: errorMessage,
            sync_completed_at: new Date().toISOString()
          })
          .eq('id', syncLog.id)
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Clé API Google manquante. Configurez API_GOOGLE_CALENDAR dans les secrets Supabase.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        },
      )
    }

    // Fetch events from Google Calendar for the next 30 days
    const now = new Date()
    const futureDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000))
    
    const calendarUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events?key=${GOOGLE_API_KEY}&timeMin=${now.toISOString()}&timeMax=${futureDate.toISOString()}&singleEvents=true&orderBy=startTime`

    console.log('Fetching calendar events from:', GOOGLE_CALENDAR_ID)
    console.log('API URL:', calendarUrl.replace(GOOGLE_API_KEY, '[HIDDEN]'))
    
    const calendarResponse = await fetch(calendarUrl)
    
    if (!calendarResponse.ok) {
      const errorText = await calendarResponse.text()
      console.error('Google Calendar API error:', calendarResponse.status, errorText)
      
      let errorMessage = `Google Calendar API error: ${calendarResponse.status}`
      let userFriendlyMessage = 'Erreur API Google Calendar'

      // Analyze specific errors
      if (calendarResponse.status === 403) {
        try {
          const errorData = JSON.parse(errorText)
          if (errorData.error?.message?.includes('blocked') || errorData.error?.message?.includes('API_KEY_SERVICE_BLOCKED')) {
            userFriendlyMessage = 'L\'API Google Calendar n\'est pas activée. Activez-la dans la console Google Cloud.'
          } else if (errorData.error?.message?.includes('quota')) {
            userFriendlyMessage = 'Quota API dépassé. Vérifiez les limites dans la console Google Cloud.'
          } else {
            userFriendlyMessage = 'Permissions insuffisantes. Vérifiez la configuration de la clé API.'
          }
        } catch {
          userFriendlyMessage = 'Erreur d\'autorisation API. Vérifiez votre clé API et les permissions.'
        }
      } else if (calendarResponse.status === 401) {
        userFriendlyMessage = 'Clé API invalide. Vérifiez votre clé API Google.'
      } else if (calendarResponse.status === 404) {
        userFriendlyMessage = 'Calendrier introuvable. Vérifiez l\'ID du calendrier.'
      } else if (calendarResponse.status === 400) {
        userFriendlyMessage = 'Requête invalide. Vérifiez la configuration du calendrier.'
      }

      // Update sync log with error
      if (syncLog) {
        await supabaseClient
          .from('sync_logs')
          .update({
            status: 'failed',
            error_message: errorMessage,
            sync_completed_at: new Date().toISOString()
          })
          .eq('id', syncLog.id)
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: userFriendlyMessage,
          technical_details: errorText,
          status_code: calendarResponse.status
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200, // Return 200 to avoid fetch errors in frontend
        },
      )
    }

    const calendarData = await calendarResponse.json()
    const events = calendarData.items || []

    console.log(`Found ${events.length} events in Google Calendar`)

    let eventsProcessed = 0
    let eventsCreated = 0
    let eventsUpdated = 0

    // Process each event
    for (const event of events) {
      if (!event.start?.dateTime || !event.end?.dateTime) {
        console.log('Skipping event without proper time:', event.summary)
        continue
      }

      // Parse Google Calendar datetime with proper timezone handling
      const startDateTime = parseISO(event.start.dateTime)
      const endDateTime = parseISO(event.end.dateTime)
      const duration = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60) // minutes
      
      // Convert to Europe/Zurich timezone (Swiss timezone with proper DST handling)
      const swissTimezone = 'Europe/Zurich'
      const localStartDate = formatInTimeZone(startDateTime, swissTimezone, 'yyyy-MM-dd')
      const localStartTime = formatInTimeZone(startDateTime, swissTimezone, 'HH:mm:ss')
      const localEndTime = formatInTimeZone(endDateTime, swissTimezone, 'HH:mm:ss')

      // Determine activity type based on event title/description
      let activityType = 'gaming'
      const title = event.summary?.toLowerCase() || ''
      if (title.includes('formation') || title.includes('training')) {
        activityType = 'formation'
      } else if (title.includes('maintenance') || title.includes('nettoyage')) {
        activityType = 'maintenance'
      } else if (title.includes('admin') || title.includes('administratif')) {
        activityType = 'admin'
      }

      console.log(`Processing event: ${event.summary} - ${startDateTime.toISOString()}`)

      // Check if activity already exists
      const { data: existingActivity } = await supabaseClient
        .from('activities')
        .select('*')
        .eq('google_event_id', event.id)
        .maybeSingle()

      const activityData = {
        title: event.summary || 'Événement Google Calendar',
        description: event.description || '',
        date: localStartDate,
        start_time: localStartTime,
        end_time: localEndTime,
        duration: Math.round(duration),
        activity_type: activityType,
        google_event_id: event.id,
        status: 'pending'
      }

      if (existingActivity) {
        // Update existing activity
        const { error } = await supabaseClient
          .from('activities')
          .update(activityData)
          .eq('id', existingActivity.id)
        
        if (error) {
          console.error('Error updating activity:', error)
        } else {
          console.log('Updated existing activity:', existingActivity.id)
          eventsUpdated++
        }
      } else {
        // Create new activity
        const { error } = await supabaseClient
          .from('activities')
          .insert([activityData])
        
        if (error) {
          console.error('Error creating activity:', error)
        } else {
          console.log('Created new activity for event:', event.summary)
          eventsCreated++
        }
      }

      eventsProcessed++
    }

    // Update sync log
    if (syncLog) {
      await supabaseClient
        .from('sync_logs')
        .update({
          status: 'success',
          events_processed: eventsProcessed,
          events_created: eventsCreated,
          events_updated: eventsUpdated,
          sync_completed_at: new Date().toISOString()
        })
        .eq('id', syncLog.id)
    }

    console.log(`Sync completed: ${eventsProcessed} events processed, ${eventsCreated} created, ${eventsUpdated} updated`)

    return new Response(
      JSON.stringify({
        success: true,
        eventsProcessed,
        eventsCreated,
        eventsUpdated,
        message: 'Calendar sync completed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Sync error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Erreur interne du serveur',
        technical_details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  }
})
