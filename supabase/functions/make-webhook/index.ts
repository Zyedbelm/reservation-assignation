
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { processWebhookPayload, processEventChanges } from './webhookProcessor.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 =================================')
    console.log('🚀 MAKE.COM WEBHOOK RECEIVER v3.0')
    console.log('🚀 WITH EMAIL NOTIFICATIONS')
    console.log('🚀 =================================')
    
    const rawBody = await req.text();
    const { payload, supabaseClient, makeSnapshotHeader, calendarSource } = await processWebhookPayload(rawBody, req.headers);
    
    // Pass snapshot header info to payload for deletion logic
    if (makeSnapshotHeader) {
      (payload as any)._makeSnapshotHeader = true;
    }

    // PHASE 1.3: Enhanced error handling and logging for event processing
    console.log(`📊 Processing event changes...`);
    let processingResult;
    try {
      processingResult = await processEventChanges(payload, supabaseClient, calendarSource);
    } catch (processError) {
      console.error('💥 CRITICAL ERROR during event processing:', processError);
      console.error('Stack trace:', processError instanceof Error ? processError.stack : 'No stack trace');
      console.error('Payload preview:', JSON.stringify({
        events_count: payload.events?.length || 0,
        has_metadata: !!payload.sync_metadata,
        metadata_preview: payload.sync_metadata ? {
          total_events: payload.sync_metadata.total_events,
          is_full_snapshot: payload.sync_metadata.is_full_snapshot,
          has_date_range: !!payload.sync_metadata.date_range
        } : null
      }, null, 2));
      
      // Log the error to database BEFORE re-throwing
      try {
        await supabaseClient
          .from('make_sync_logs')
          .insert([{
            status: 'error',
            error_message: processError instanceof Error ? processError.message : String(processError),
            events_processed: payload.events?.length || 0,
            events_created: 0,
            events_updated: 0,
            calendar_source: calendarSource,
            sync_completed_at: new Date().toISOString(),
            webhook_payload: {
              events_count: payload.events?.length || 0,
              error_details: {
                message: processError instanceof Error ? processError.message : String(processError),
                stack: processError instanceof Error ? processError.stack : 'No stack trace'
              }
            }
          }]);
        console.log('✅ Error logged to database');
      } catch (logError) {
        console.error('❌ Failed to log error to database:', logError);
      }
      
      // Re-throw to trigger 500 response
      throw processError;
    }
    
    console.log(`📊 PROCESSING STATS:`);
    console.log(`📈 Events processed: ${payload.events?.length || 0}`);
    console.log(`🆕 Events created: ${processingResult.eventsCreated}`);
    console.log(`📝 Events updated: ${processingResult.eventsUpdated}`);
    console.log(`🔄 Events deleted: ${processingResult.eventsDeleted || 0}`);
    console.log(`❌ Event errors: ${processingResult.eventErrors}`);
    console.log(`📧 Notification emails sent: ${processingResult.emailsSent || 0}`);
    if (processingResult.errors?.length > 0) {
      console.log(`🔍 Error details:`, JSON.stringify(processingResult.errors, null, 2));
    }
    const totalChanges = processingResult.eventsCreated + processingResult.eventsUpdated + (processingResult.eventsDeleted || 0);

    // Log sync results with proper event counting
    const { error: logError } = await supabaseClient
      .from('make_sync_logs')
      .insert([{
        status: 'completed',
        events_processed: payload.events.length,
        events_created: processingResult.eventsCreated,
        events_updated: processingResult.eventsUpdated,
        calendar_source: calendarSource,
        is_full_snapshot: payload.sync_metadata?.is_full_snapshot || makeSnapshotHeader || false,
        date_range: payload.sync_metadata?.date_range || null,
        sync_completed_at: new Date().toISOString(),
        webhook_payload: {
          events_count: payload.events.length,
          metadata: payload.sync_metadata,
          trigger: (payload.sync_metadata as any)?.trigger || 'manual', // Extract trigger from metadata
          processing_stats: {
            events_processed: payload.events?.length || 0,
            events_created: processingResult.eventsCreated,
            events_updated: processingResult.eventsUpdated,
            events_deleted: processingResult.eventsDeleted || 0,
            event_errors: processingResult.eventErrors,
            emails_sent: processingResult.emailsSent || 0,
            errors: processingResult.errors || []
          },
          calendar_source: calendarSource
        }
      }]);

    if (logError) {
      console.error('❌ Error logging sync:', logError);
    } else {
      console.log('✅ Sync log with email stats saved successfully');
    }

    // Trigger conditional assignment if there were changes
    if (totalChanges > 0) {
      console.log('\n🤖 Conditional assignment: Changes detected - triggering auto-assignment...');
      try {
        const { data: assignmentData, error: assignmentError } = await supabaseClient.functions.invoke('auto-assign-gms');
        
        if (assignmentError) {
          console.error('❌ Error triggering conditional auto-assignment:', assignmentError);
        } else {
          console.log('✅ Conditional auto-assignment triggered successfully:', assignmentData);
        }
      } catch (assignmentErr) {
        console.error('💥 Error calling conditional auto-assign function:', assignmentErr);
      }
    }

    // Trigger duplicate cleanup based on clean_duplicates parameter or if changes were detected
    const cleanDuplicates = (payload.sync_metadata as any)?.clean_duplicates !== false; // Default to true
    const shouldCleanDuplicates = cleanDuplicates || totalChanges > 0;
    
    if (shouldCleanDuplicates) {
      const reason = totalChanges > 0 ? 'changes detected' : 'requested via clean_duplicates parameter';
      console.log(`\n🧹 Auto cleanup: ${reason} - triggering duplicate cleanup...`);
      try {
        const { data: cleanupData, error: cleanupError } = await supabaseClient.functions.invoke('admin-clean-duplicates');
        
        if (cleanupError) {
          console.error('❌ Error triggering duplicate cleanup:', cleanupError);
        } else {
          console.log('✅ Duplicate cleanup triggered successfully:', cleanupData);
        }
      } catch (cleanupErr) {
        console.error('💥 Error calling duplicate cleanup function:', cleanupErr);
      }
    } else {
      console.log('🚫 No duplicate cleanup needed: No changes detected and cleanup not requested');
    }

    console.log('🎉 WEBHOOK WITH EMAIL NOTIFICATIONS COMPLETED SUCCESSFULLY')

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sync with notifications completed: ${totalChanges}/${payload.events.length + (processingResult.eventsDeleted || 0)} changes processed`,
        stats: {
          total_received: payload.events.length,
          processed: totalChanges,
          ...processingResult,
          notification_coverage: processingResult.emailsSent > 0 ? `${processingResult.emailsSent} notifications sent` : 'No notifications needed'
        },
        sync_metadata: payload.sync_metadata
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('💥 WEBHOOK WITH EMAIL NOTIFICATIONS ERROR:', error)

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        error_type: error instanceof Error ? error.name : 'UnknownError',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
