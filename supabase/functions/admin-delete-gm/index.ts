import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log(`🚀 [ADMIN-DELETE-GM] ${req.method} request received from ${req.headers.get('origin') || 'unknown'}`)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ [ADMIN-DELETE-GM] CORS preflight request handled')
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint
  if (req.method === 'GET') {
    console.log('✅ [ADMIN-DELETE-GM] Health check request')
    return new Response(JSON.stringify({ status: 'ok', service: 'admin-delete-gm' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify the user is an admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if user is admin
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { gmId } = await req.json()

    if (!gmId) {
      return new Response(
        JSON.stringify({ error: 'GM ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Starting advanced deletion for GM: ${gmId}`)

    // Check dependencies first
    const dependencies = {
      notifications: 0,
      documents: 0,
      competencies: 0,
      availabilities: 0,
      activities: 0,
      profiles: 0
    }

    // Count dependencies
    const { data: notifications } = await supabaseClient
      .from('gm_notifications')
      .select('id', { count: 'exact' })
      .eq('gm_id', gmId)
    dependencies.notifications = notifications?.length || 0

    const { data: documents } = await supabaseClient
      .from('gm_documents')
      .select('id', { count: 'exact' })
      .eq('gm_id', gmId)
    dependencies.documents = documents?.length || 0

    const { data: competencies } = await supabaseClient
      .from('gm_game_competencies')
      .select('id', { count: 'exact' })
      .eq('gm_id', gmId)
    dependencies.competencies = competencies?.length || 0

    const { data: availabilities } = await supabaseClient
      .from('gm_availabilities')
      .select('id', { count: 'exact' })
      .eq('gm_id', gmId)
    dependencies.availabilities = availabilities?.length || 0

    const { data: activities } = await supabaseClient
      .from('activities')
      .select('id', { count: 'exact' })
      .eq('assigned_gm_id', gmId)
    dependencies.activities = activities?.length || 0

    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('id', { count: 'exact' })
      .eq('gm_id', gmId)
    dependencies.profiles = profiles?.length || 0

    console.log('Dependencies found:', dependencies)

    // If there are still activities assigned, prevent deletion
    if (dependencies.activities > 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Cannot delete GM with assigned activities',
          dependencies
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Start deletion process
    let deletedItems = {
      notifications: 0,
      documents: 0,
      competencies: 0,
      availabilities: 0,
      profiles_unlinked: 0
    }

    // Delete notifications
    if (dependencies.notifications > 0) {
      const { error: notifError } = await supabaseClient
        .from('gm_notifications')
        .delete()
        .eq('gm_id', gmId)
      
      if (notifError) throw notifError
      deletedItems.notifications = dependencies.notifications
      console.log(`Deleted ${dependencies.notifications} notifications`)
    }

    // Delete documents (note: files in storage would need separate cleanup)
    if (dependencies.documents > 0) {
      const { error: docError } = await supabaseClient
        .from('gm_documents')
        .delete()
        .eq('gm_id', gmId)
      
      if (docError) throw docError
      deletedItems.documents = dependencies.documents
      console.log(`Deleted ${dependencies.documents} documents`)
    }

    // Delete competencies
    if (dependencies.competencies > 0) {
      const { error: compError } = await supabaseClient
        .from('gm_game_competencies')
        .delete()
        .eq('gm_id', gmId)
      
      if (compError) throw compError
      deletedItems.competencies = dependencies.competencies
      console.log(`Deleted ${dependencies.competencies} competencies`)
    }

    // Delete availabilities
    if (dependencies.availabilities > 0) {
      const { error: availError } = await supabaseClient
        .from('gm_availabilities')
        .delete()
        .eq('gm_id', gmId)
      
      if (availError) throw availError
      deletedItems.availabilities = dependencies.availabilities
      console.log(`Deleted ${dependencies.availabilities} availabilities`)
    }

    // Unlink profiles (set gm_id to null and disable auto-recreation)
    if (dependencies.profiles > 0) {
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({ 
          gm_id: null,
          gm_auto_create_disabled: true 
        })
        .eq('gm_id', gmId)
      
      if (profileError) throw profileError
      deletedItems.profiles_unlinked = dependencies.profiles
      console.log(`Unlinked ${dependencies.profiles} profiles and disabled auto-recreation`)
    }

    // Finally, delete the GM
    const { error: gmError } = await supabaseClient
      .from('game_masters')
      .delete()
      .eq('id', gmId)

    if (gmError) throw gmError

    console.log(`Successfully deleted GM: ${gmId}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'GM deleted successfully',
        deletedItems
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in admin-delete-gm:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An error occurred during deletion'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})