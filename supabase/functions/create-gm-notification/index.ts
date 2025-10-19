
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationRequest {
  gmId: string;
  notificationType: 'assignment' | 'modified' | 'cancelled' | 'unassigned';
  eventId?: string;
  title: string;
  message: string;
  eventData?: any;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const requestData: NotificationRequest = await req.json()
    const { gmId, notificationType, eventId, title, message, eventData } = requestData

    if (!gmId || !notificationType || !title || !message) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: gmId, notificationType, title, message' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log(`📝 [CREATE-GM-NOTIFICATION] Creating notification: ${notificationType} for GM ${gmId}`)
    console.log(`📝 [CREATE-GM-NOTIFICATION] Event ID: ${eventId}`)
    console.log(`📝 [CREATE-GM-NOTIFICATION] Title: ${title}`)
    console.log(`📝 [CREATE-GM-NOTIFICATION] Message length: ${message?.length || 0} characters`)

    const { data, error } = await supabaseClient
      .from('gm_notifications')
      .insert([{
        gm_id: gmId,
        notification_type: notificationType,
        event_id: eventId || null,
        title,
        message,
        event_data: eventData || null,
        is_read: false,
        email_sent: false
      }])
      .select()
      .single()

    if (error) {
      console.error('❌ [CREATE-GM-NOTIFICATION] Error creating notification:', error)
      throw error
    }

    console.log('✅ [CREATE-GM-NOTIFICATION] Notification created successfully with ID:', data.id)
    console.log('✅ [CREATE-GM-NOTIFICATION] Notification data:', JSON.stringify(data, null, 2))

    return new Response(
      JSON.stringify({ success: true, notification: data }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error: any) {
    console.error('💥 Error in create-gm-notification:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
}

serve(handler)
