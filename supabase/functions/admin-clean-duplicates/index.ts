import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🧹 Starting CROSS-SOURCE duplicate cleanup process...')

    // Step 1: Find all events with make_event_id (across all sources)
    const { data: duplicateGroups, error: queryError } = await supabase
      .from('activities')
      .select('*')
      .not('make_event_id', 'is', null)
      .order('created_at', { ascending: true })

    if (queryError) {
      console.error('❌ Error querying activities:', queryError)
      throw queryError
    }

    console.log(`📊 Found ${duplicateGroups?.length || 0} total events to analyze`)

    // Group events by normalized ID ONLY (ignoring calendar_source for cross-source detection)
    const groupedEvents = new Map<string, any[]>()
    
    for (const event of duplicateGroups || []) {
      const normalizedId = event.make_event_id?.replace(/@google\.com$/, '') || ''
      // KEY CHANGE: Group by normalized ID only, not by source
      const key = normalizedId
      
      if (!groupedEvents.has(key)) {
        groupedEvents.set(key, [])
      }
      groupedEvents.get(key)!.push(event)
    }

    console.log(`📊 Found ${groupedEvents.size} unique event groups (cross-source)`)

    let totalDuplicatesFound = 0
    let totalDuplicatesDeleted = 0
    let assignmentsMigrated = 0
    const cleanupResults: any[] = []

    // Step 2: Process each group to clean duplicates
    for (const [key, events] of groupedEvents.entries()) {
      if (events.length <= 1) continue // No duplicates

      totalDuplicatesFound += events.length - 1
      console.log(`🔍 Processing group ${key} with ${events.length} duplicates`)

      // Step 3: Determine canonical event with CROSS-SOURCE priority
      const sortedEvents = events.sort((a, b) => {
        // Priority 1: assigned events first
        if (a.is_assigned && !b.is_assigned) return -1
        if (!a.is_assigned && b.is_assigned) return 1
        
        // Priority 2: known calendar_source (EL/VR) over 'unknown'
        const aKnown = a.calendar_source !== 'unknown'
        const bKnown = b.calendar_source !== 'unknown'
        if (aKnown && !bKnown) return -1
        if (!aKnown && bKnown) return 1
        
        // Priority 3: most recent creation date
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })

      const canonicalEvent = sortedEvents[0]
      const duplicatesToDelete = sortedEvents.slice(1)

      console.log(`✅ Canonical event: ${canonicalEvent.id} (assigned: ${canonicalEvent.is_assigned})`)
      console.log(`🗑️ Duplicates to delete: ${duplicatesToDelete.map(e => e.id).join(', ')}`)

      // Step 4: Migrate any event_assignments from duplicates to canonical
      let currentGroupAssignmentsMigrated = 0
      for (const duplicate of duplicatesToDelete) {
        const { data: assignments, error: assignmentQueryError } = await supabase
          .from('event_assignments')
          .select('*')
          .eq('activity_id', duplicate.id)

        if (assignmentQueryError) {
          console.error(`❌ Error querying assignments for ${duplicate.id}:`, assignmentQueryError)
          continue
        }

        if (assignments && assignments.length > 0) {
          console.log(`🔄 Migrating ${assignments.length} assignments from ${duplicate.id} to ${canonicalEvent.id}`)
          
          // Update assignments to point to canonical event
          const { error: updateError } = await supabase
            .from('event_assignments')
            .update({ activity_id: canonicalEvent.id })
            .eq('activity_id', duplicate.id)

          if (updateError) {
            console.error(`❌ Error migrating assignments:`, updateError)
          } else {
            assignmentsMigrated += assignments.length
            currentGroupAssignmentsMigrated += assignments.length
            console.log(`✅ Successfully migrated ${assignments.length} assignments`)
          }
        }
      }

      // Step 5: Delete duplicate events
      const duplicateIds = duplicatesToDelete.map(e => e.id)
      const { error: deleteError } = await supabase
        .from('activities')
        .delete()
        .in('id', duplicateIds)

      if (deleteError) {
        console.error(`❌ Error deleting duplicates:`, deleteError)
        cleanupResults.push({
          key,
          canonicalId: canonicalEvent.id,
          duplicatesFound: duplicatesToDelete.length,
          duplicatesDeleted: 0,
          error: deleteError.message
        })
      } else {
        totalDuplicatesDeleted += duplicatesToDelete.length
        console.log(`✅ Successfully deleted ${duplicatesToDelete.length} duplicates`)
        cleanupResults.push({
          key,
          canonicalId: canonicalEvent.id,
          duplicatesFound: duplicatesToDelete.length,
          duplicatesDeleted: duplicatesToDelete.length,
          assignmentsMigrated: currentGroupAssignmentsMigrated
        })
      }
    }

    console.log(`🎉 Cleanup completed!`)
    console.log(`📊 Total duplicates found: ${totalDuplicatesFound}`)
    console.log(`🗑️ Total duplicates deleted: ${totalDuplicatesDeleted}`)
    console.log(`🔄 Total assignments migrated: ${assignmentsMigrated}`)

    return new Response(JSON.stringify({
      success: true,
      summary: {
        totalEventsAnalyzed: duplicateGroups?.length || 0,
        uniqueEventGroups: groupedEvents.size,
        totalDuplicatesFound,
        totalDuplicatesDeleted,
        assignmentsMigrated
      },
      details: cleanupResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

    } catch (error) {
      console.error('Error cleaning duplicates:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }
})