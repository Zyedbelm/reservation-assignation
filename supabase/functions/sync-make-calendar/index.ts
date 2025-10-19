import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const requestBody = await req.json().catch(() => ({}))
    
    const { 
      syncPeriodMonths = 3, 
      triggerSource = 'manual',
      syncStartTime,
      auditOnly = false,
      forceReconcile = false,
      calendarSource,
      enhanced_features,
      clean_duplicates = true
    } = requestBody
    
    const isAutoCron = requestBody.source === 'auto_cron' || requestBody.source === 'auto_cron_scheduler' || requestBody.trigger === 'auto_scheduler'
    
    // Calculer les dates par défaut au format ISO complet
    const today = new Date()
    const futureMonths = new Date()
    futureMonths.setMonth(today.getMonth() + syncPeriodMonths)
    
    // Si startDate/endDate sont fournis, les utiliser tels quels (déjà en ISO), sinon calculer automatiquement
    let startDate, endDate
    
    if (requestBody.startDate && requestBody.endDate) {
      // Dates personnalisées - s'assurer qu'elles sont en format ISO complet
      const startDateObj = new Date(requestBody.startDate)
      const endDateObj = new Date(requestBody.endDate)
      startDate = startDateObj.toISOString()
      endDate = endDateObj.toISOString()
    } else {
      // Dates automatiques basées sur la période - début à minuit aujourd'hui, fin à minuit dans X mois
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
      const endOfPeriod = new Date(futureMonths.getFullYear(), futureMonths.getMonth(), futureMonths.getDate(), 23, 59, 59, 999)
      startDate = startOfToday.toISOString()
      endDate = endOfPeriod.toISOString()
    }
    
    console.log(`🚀 [SYNC-CALENDAR] Démarrage ${isAutoCron ? 'automatique' : 'manuel'} de la synchronisation...`)
    console.log(`📅 [SYNC-CALENDAR] Plage de dates: ${startDate} à ${endDate}`)
    console.log(`🔍 [SYNC-CALENDAR] Mode: ${auditOnly ? 'AUDIT' : forceReconcile ? 'RECONCILIATION' : 'STANDARD'}`)
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Créer le log de synchronisation
    const { data: syncLog, error: logError } = await supabase
      .from('make_sync_logs')
      .insert({
        status: 'in_progress',
        sync_started_at: syncStartTime || new Date().toISOString(),
        calendar_source: calendarSource || 'all',
        webhook_payload: {
          trigger: isAutoCron ? 'auto_scheduler' : triggerSource,
          source: requestBody.source || 'sync-make-calendar',
          timestamp: syncStartTime || new Date().toISOString(),
          audit_only: auditOnly,
          force_reconcile: forceReconcile
        }
      })
      .select()
      .single()

    if (logError) {
      console.error('❌ [SYNC-CALENDAR] Erreur lors de la création du log:', logError)
    }

    const logId = syncLog?.id

    try {
      // Appeler Make.com webhook
      const makeWebhookUrl = Deno.env.get('MAKE_WEBHOOK_URL')
      if (!makeWebhookUrl) {
        throw new Error('MAKE_WEBHOOK_URL non configuré')
      }

      console.log('📡 [SYNC-CALENDAR] Appel du webhook Make.com...')
      
      const response = await fetch(makeWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Calendar-Source': calendarSource || 'VR' // Use specified source or default to VR
        },
        body: JSON.stringify({
          sync_type: 'manual_trigger',
          period_months: syncPeriodMonths,
          date_range: {
            start_date: startDate,
            end_date: endDate
          },
          is_full_snapshot: true,
          audit_only: auditOnly,
          force_reconcile: forceReconcile,
          trigger_source: triggerSource,
          enhanced_features: enhanced_features || {},
          sync_metadata: {
            clean_duplicates: clean_duplicates,
            trigger: isAutoCron ? 'auto_scheduler' : triggerSource,
            source: requestBody.source || 'sync-make-calendar'
          }
        })
      })

      const webhookData = await response.text()
      console.log('📨 [SYNC-CALENDAR] Réponse de Make.com:', webhookData)

      let eventsProcessed = 0
      let eventsCreated = 0
      let eventsUpdated = 0
      let reconciliationStats = {}

      // Essayer de parser la réponse pour extraire les statistiques
      try {
        const parsedData = JSON.parse(webhookData)
        if (parsedData.processing_stats) {
          eventsProcessed = parsedData.processing_stats.total || 0
          eventsCreated = parsedData.processing_stats.created || 0
          eventsUpdated = parsedData.processing_stats.updated || 0
        }
        if (parsedData.reconciliation_stats) {
          reconciliationStats = parsedData.reconciliation_stats
        }
      } catch (parseError) {
        console.log('⚠️ [SYNC-CALENDAR] Impossible de parser la réponse Make.com, utilisation des valeurs par défaut')
      }

      // Mettre à jour le log avec le succès
      if (logId) {
        const updateData: any = {
          status: 'completed',
          sync_completed_at: new Date().toISOString(),
          events_processed: eventsProcessed,
          events_created: eventsCreated,
          events_updated: eventsUpdated,
          webhook_payload: {
            trigger: isAutoCron ? 'auto_scheduler' : triggerSource,
            source: requestBody.source || 'sync-make-calendar',
            timestamp: syncStartTime || new Date().toISOString(),
            audit_only: auditOnly,
            force_reconcile: forceReconcile,
            webhook_response: webhookData,
            reconciliation_stats: reconciliationStats,
            date_range: {
              start: startDate,
              end: endDate
            }
          }
        };

        // Add reconciliation details if available
        if (reconciliationStats && typeof reconciliationStats === 'object') {
          if (reconciliationStats.total_missing !== undefined) {
            updateData.events_processed = (updateData.events_processed || 0) + (reconciliationStats.total_missing || 0);
          }
          if (reconciliationStats.deleted?.length) {
            updateData.events_deleted = reconciliationStats.deleted.length;
          }
          if (reconciliationStats.canceled?.length) {
            updateData.events_canceled = reconciliationStats.canceled.length;
          }
        }

        await supabase
          .from('make_sync_logs')
          .update(updateData)
          .eq('id', logId);
      }

      const modeText = auditOnly ? 'audit' : forceReconcile ? 'réconciliation' : 'synchronisation'
      console.log(`✅ [SYNC-CALENDAR] ${modeText} ${isAutoCron ? 'automatique' : 'manuelle'} terminée avec succès`)

      return new Response(
        JSON.stringify({
          success: true,
          message: `${modeText} ${isAutoCron ? 'automatique' : 'manuelle'} réussie`,
          eventsProcessed,
          eventsCreated,
          eventsUpdated,
          reconciliationStats,
          auditOnly,
          forceReconcile,
          isAutoCron,
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (syncError) {
      console.error(`❌ [SYNC-CALENDAR] Erreur lors de la synchronisation ${isAutoCron ? 'automatique' : 'manuelle'}:`, syncError)
      
      // Mettre à jour le log avec l'erreur
      if (logId) {
        await supabase
          .from('make_sync_logs')
          .update({
            status: 'failed',
            sync_completed_at: new Date().toISOString(),
            error_message: syncError instanceof Error ? syncError.message : 'Unknown sync error',
            webhook_payload: {
              trigger: isAutoCron ? 'auto_scheduler' : triggerSource,
              source: requestBody.source || 'sync-make-calendar',
              timestamp: syncStartTime || new Date().toISOString(),
              audit_only: auditOnly,
              force_reconcile: forceReconcile,
              error: syncError instanceof Error ? syncError.message : 'Unknown sync error'
            }
          })
          .eq('id', logId)
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: syncError instanceof Error ? syncError.message : 'Unknown sync error',
          auditOnly,
          forceReconcile,
          isAutoCron,
          timestamp: new Date().toISOString()
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      )
    }

  } catch (error) {
    console.error('💥 [SYNC-CALENDAR] Erreur inattendue:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})