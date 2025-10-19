
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔄 Creating retroactive notification for assigned event...')

    // Chercher l'événement "Saga le Serviteur de la Rédemption [8]" assigné à Zyed
    const { data: assignedEvent, error: eventError } = await supabaseClient
      .from('activities')
      .select(`
        *,
        game_masters:assigned_gm_id(id, name, email)
      `)
      .eq('title', 'Saga le Serviteur de la Rédemption [8]')
      .eq('date', '2024-09-15')
      .eq('is_assigned', true)
      .single()

    if (eventError || !assignedEvent) {
      console.error('❌ Event not found:', eventError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Event not found or not assigned' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    const gm = assignedEvent.game_masters
    if (!gm) {
      console.error('❌ GM data not found for assigned event')
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'GM data not found' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404,
        }
      )
    }

    console.log(`📝 Creating retroactive notification for GM: ${gm.name}`)

    // Créer la notification rétroactive
    const eventDate = new Date(assignedEvent.date).toLocaleDateString('fr-FR')
    const eventTime = assignedEvent.start_time ? assignedEvent.start_time.substring(0, 5) : ''
    
    const title = `Événement assigné : ${assignedEvent.title}`
    const message = `Vous avez été assigné(e) à l'événement "${assignedEvent.title}" le ${eventDate} à ${eventTime}. (Notification créée rétroactivement)`

    const { data: notification, error: notificationError } = await supabaseClient
      .from('gm_notifications')
      .insert([{
        gm_id: gm.id,
        notification_type: 'assignment',
        event_id: assignedEvent.id,
        title,
        message,
        event_data: {
          ...assignedEvent,
          date: assignedEvent.date,
          start_time: assignedEvent.start_time,
          end_time: assignedEvent.end_time,
          title: assignedEvent.title,
          description: assignedEvent.description
        },
        is_read: false,
        email_sent: false,
        created_at: assignedEvent.assignment_date || new Date().toISOString() // Utiliser la date d'assignation originale
      }])
      .select()
      .single()

    if (notificationError) {
      console.error('❌ Error creating retroactive notification:', notificationError)
      throw notificationError
    }

    console.log('✅ Retroactive notification created successfully:', notification.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        notification,
        event: assignedEvent,
        gm: gm
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('💥 Error in create-retroactive-notification:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
