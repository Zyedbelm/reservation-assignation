import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

// Weekly unassigned events function - updated 2025-09-22

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🚀 Starting weekly unassigned events check...')

    // Get current date and calculate date ranges
    const now = new Date()
    // Ensure we use the current date in UTC to avoid timezone issues
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayString = today.toISOString().split('T')[0]
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + 30)
    const endDateString = endDate.toISOString().split('T')[0]

    console.log('📅 Date range:', {
      today: todayString,
      endDate: endDateString,
      duration: '30 days from today',
      currentDateTime: now.toISOString()
    })

    // Fetch unassigned events for the next 30 days (excluding past events)
    const { data: unassignedEvents, error: eventsError } = await supabase
      .from('activities')
      .select('id, title, date, start_time, end_time, description, status')
      .gte('date', todayString)
      .lte('date', endDateString)
      .or('assigned_gm_id.is.null,is_assigned.eq.false')
      .eq('status', 'pending')
      .order('date', { ascending: true })

    if (eventsError) {
      console.error('❌ Error fetching events:', eventsError)
      throw eventsError
    }

    console.log(`📊 Found ${unassignedEvents?.length || 0} unassigned events in the next 30 days`)

    // Filter out any events with past dates (additional safety check)
    const futureEvents = unassignedEvents?.filter(event => {
      const eventDate = new Date(event.date)
      return eventDate >= today
    }) || []

    console.log(`📊 After filtering past events: ${futureEvents.length} events remaining`)

    // Fetch all active GMs with their names and emails
    const { data: activeGMs, error: gmsError } = await supabase
      .from('game_masters')
      .select('id, name, email, first_name, last_name')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (gmsError) {
      console.error('❌ Error fetching active GMs:', gmsError)
      throw gmsError
    }

    // Format GM names consistently
    const formatGMName = (gm: any): string => {
      // Priority 1: First and Last name
      if (gm.first_name && gm.last_name) {
        return `${gm.first_name} ${gm.last_name}`
      }
      
      // If we have only first name or last name
      if (gm.first_name) {
        return gm.first_name
      }
      
      if (gm.last_name) {
        return gm.last_name
      }
      
      // Priority 2: Email prefix
      if (gm.email) {
        const emailPrefix = gm.email.split('@')[0]
        if (emailPrefix) {
          return emailPrefix
        }
      }
      
      // Fallback: name field
      return gm.name || 'GM inconnu'
    }

    const formattedGMs = activeGMs?.map(gm => ({
      id: gm.id,
      name: formatGMName(gm),
      email: gm.email
    })) || []

    console.log(`👥 Found ${formattedGMs.length} active GMs`)

    // Categorize events by time periods
    const next7DaysEvents = futureEvents.filter(event => {
      const eventDate = new Date(event.date)
      const daysDiff = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return daysDiff <= 7
    })
    
    const next30DaysEvents = futureEvents.filter(event => {
      const eventDate = new Date(event.date)
      const daysDiff = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      return daysDiff > 7 && daysDiff <= 30
    })

    // Find urgent events (less than 7 days away)
    const urgentEvents = next7DaysEvents

    // Prepare events data with days until event
    const eventsWithDaysUntil = futureEvents.map(event => {
      const eventDate = new Date(event.date)
      const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      return {
        id: event.id,
        title: event.title,
        date: event.date,
        start_time: event.start_time,
        end_time: event.end_time,
        description: event.description,
        days_until_event: daysUntil,
        is_urgent: daysUntil <= 7
      }
    })

    // Get webhook configuration
    const { data: webhookConfig, error: configError } = await supabase
      .from('api_configurations')
      .select('config')
      .eq('name', 'Événements Non Assignés Hebdomadaires')
      .eq('type', 'webhook')
      .eq('is_active', true)
      .single()

    if (configError) {
      console.log('⚠️ No webhook configured for weekly unassigned events')
    }

    const webhookUrl = webhookConfig?.config?.url
    let webhookSuccess = false

    if (webhookUrl && eventsWithDaysUntil.length > 0) {
      console.log('📤 Sending webhook to:', webhookUrl)

      const webhookData = {
        type: 'weekly_unassigned_events',
        week_start: now.toISOString().split('T')[0],
        unassigned_events: eventsWithDaysUntil,
        active_gms: formattedGMs,
        summary: {
          next_7_days_events: next7DaysEvents.length,
          next_30_days_events: next30DaysEvents.length,
          total_unassigned: eventsWithDaysUntil.length,
          urgent_events: urgentEvents.length,
          active_gms_count: formattedGMs.length,
          generated_at: now.toISOString()
        }
      }

      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookData)
        })

        if (response.ok) {
          console.log('✅ Webhook sent successfully')
          webhookSuccess = true
        } else {
          console.error('❌ Webhook failed with status:', response.status)
        }
      } catch (webhookError) {
        console.error('❌ Error sending webhook:', webhookError)
      }
    }

    // Log the execution
    const { error: logError } = await supabase
      .from('weekly_unassigned_logs')
      .insert([{
        executed_at: now.toISOString(),
        unassigned_count: eventsWithDaysUntil.length,
        urgent_count: urgentEvents.length,
        webhook_sent: webhookSuccess,
        webhook_url: webhookUrl || null,
        summary: {
          next_7_days: next7DaysEvents.length,
          next_30_days: next30DaysEvents.length,
          total: eventsWithDaysUntil.length,
          urgent: urgentEvents.length
        }
      }])

    if (logError) {
      console.error('❌ Error logging execution:', logError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total_unassigned: eventsWithDaysUntil.length,
          next_7_days: next7DaysEvents.length,
          next_30_days: next30DaysEvents.length,
          urgent: urgentEvents.length,
          webhook_sent: webhookSuccess
        },
        events: eventsWithDaysUntil
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('❌ Function error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})