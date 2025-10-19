
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const startTime = Date.now()
  
  try {
    const requestBody = await req.json().catch(() => ({}))
    const isAutoCron = requestBody.trigger === 'auto_cron' || requestBody.source === 'auto_cron'
    
    console.log(`🤖 [AUTO-ASSIGN] Démarrage ${isAutoCron ? 'automatique' : 'manuel'} de l'auto-assignation...`)
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Récupérer les événements non assignés et futurs
    const today = new Date().toISOString().split('T')[0]
    const { data: unassignedEvents, error: eventsError } = await supabase
      .from('activities')
      .select('*')
      .is('assigned_gm_id', null)
      .eq('status', 'pending')
      .gte('date', today)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })

    if (eventsError) {
      throw new Error(`Erreur lors de la récupération des événements: ${eventsError.message}`)
    }

    const eventsToProcess = unassignedEvents || []
    console.log(`📊 [AUTO-ASSIGN] ${eventsToProcess.length} événements non assignés trouvés`)

    if (eventsToProcess.length === 0) {
      console.log(`✅ [AUTO-ASSIGN] Aucun événement à assigner`)
      
      // Enregistrer le log même si aucun événement à traiter
      const { error: logError } = await supabase
        .from('auto_assignment_logs')
        .insert({
          trigger_type: isAutoCron ? 'auto' : 'manual',
          assignments_made: 0,
          events_processed: 0,
          success: true,
          execution_duration: Date.now() - startTime,
          triggered_at: new Date().toISOString(),
          details: {
            eventsAnalyzed: 0,
            eventDetails: [],
            categoryCounts: {
              noAvailability: 0,
              noGameMapping: 0,
              noCompetency: 0,
              timeSlotConflict: 0,
              scheduleConflict: 0,
              assigned: 0,
              assignmentError: 0
            }
          }
        })

      if (logError) {
        console.error('❌ [AUTO-ASSIGN] Erreur lors de l\'enregistrement du log:', logError)
      }

      return new Response(
        JSON.stringify({
          success: true,
          assignments: 0,
          eventsProcessed: 0,
          executionDuration: Date.now() - startTime,
          isAutoCron,
          message: 'Aucun événement à assigner',
          timestamp: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Récupérer les données nécessaires pour l'assignation intelligente
    const { data: gameMasters, error: gmError } = await supabase
      .from('game_masters')
      .select('*')
      .eq('is_active', true)
      .eq('is_available', true)

    const { data: availabilities, error: availError } = await supabase
      .from('gm_availabilities')
      .select('*')
      .gte('date', today)

    const { data: competencies, error: compError } = await supabase
      .from('gm_game_competencies')
      .select('*')

    const { data: mappings, error: mappingError } = await supabase
      .from('event_game_mappings')
      .select(`
        event_name_pattern,
        game_id,
        games (name, average_duration)
      `)
      .eq('is_active', true)

    if (gmError || availError || compError || mappingError) {
      throw new Error(`Erreur lors de la récupération des données: ${gmError?.message || availError?.message || compError?.message || mappingError?.message}`)
    }

    console.log(`👥 [AUTO-ASSIGN] ${gameMasters?.length || 0} GM(s) actifs disponibles`)
    console.log(`📅 [AUTO-ASSIGN] ${availabilities?.length || 0} disponibilités trouvées`)
    console.log(`🎯 [AUTO-ASSIGN] ${competencies?.length || 0} compétences trouvées`)

    let assignmentsMade = 0
    const processedEvents = []
    
    // Diagnostic details for transparency
    const diagnosticDetails: {
      eventsAnalyzed: number;
      eventDetails: Array<{
        eventId: any;
        title: any;
        date: any;
        startTime: any;
        endTime: any;
        skipReason: string | null;
        eligibleGMs: any[];
        availableGMs: number;
        gameMapping: any;
        assigned: boolean;
        assignedTo: any;
      }>;
      categoryCounts: {
        noAvailability: number;
        noGameMapping: number;
        noCompetency: number;
        timeSlotConflict: number;
        scheduleConflict: number;
        assigned: number;
        assignmentError: number;
      }
    } = {
      eventsAnalyzed: eventsToProcess.length,
      eventDetails: [],
      categoryCounts: {
        noAvailability: 0,
        noGameMapping: 0,
        noCompetency: 0,
        timeSlotConflict: 0,
        scheduleConflict: 0,
        assigned: 0,
        assignmentError: 0
      }
    }

    // Traiter chaque événement avec la logique d'assignation intelligente
    for (const event of eventsToProcess) {
      try {
        console.log(`\n🎯 [AUTO-ASSIGN] Traitement événement: "${event.title}" le ${event.date} à ${event.start_time}`)

        // Logique d'assignation simplifiée mais intelligente
        const eventAvailabilities = availabilities?.filter(av => av.date === event.date) || []
        const eligibleGMs = []
        const eventDiagnostic = {
          eventId: event.id,
          title: event.title,
          date: event.date,
          startTime: event.start_time,
          endTime: event.end_time,
          skipReason: null as string | null,
          eligibleGMs: [] as any[],
          availableGMs: 0,
          gameMapping: null as any,
          assigned: false,
          assignedTo: null as any
        }

        // First check: Game mapping
        const eventGame = findGameForEvent(event, mappings)
        if (!eventGame) {
          eventDiagnostic.skipReason = 'Aucun mapping de jeu trouvé'
          diagnosticDetails.categoryCounts.noGameMapping++
          console.log(`❌ [AUTO-ASSIGN] Aucun jeu identifié pour "${event.title}"`)
          diagnosticDetails.eventDetails.push(eventDiagnostic)
          processedEvents.push({ ...event, assigned: false, reason: 'Aucun mapping de jeu' })
          continue
        }
        
        eventDiagnostic.gameMapping = {
          gameId: eventGame.game_id,
          gameName: eventGame.game_name,
          pattern: (eventGame as any).event_name_pattern || 'Unknown pattern'
        }

        for (const gm of gameMasters || []) {
          const gmAvailability = eventAvailabilities.find(av => av.gm_id === gm.id)
          
          if (!gmAvailability) {
            console.log(`❌ [AUTO-ASSIGN] ${gm.name} - Pas de disponibilité déclarée pour le ${event.date}`)
            continue
          }
          
          eventDiagnostic.availableGMs++

          // Vérifier la compatibilité des créneaux
          const isCompatible = checkTimeSlotCompatibility(
            gmAvailability.time_slots,
            event.start_time,
            event.end_time
          )

          if (!isCompatible) {
            console.log(`❌ [AUTO-ASSIGN] ${gm.name} - Créneaux horaires incompatibles`)
            continue
          }

          // Vérifier les conflits d'assignation existants
          const { data: conflicts } = await supabase
            .from('activities')
            .select('*')
            .eq('assigned_gm_id', gm.id)
            .eq('date', event.date)
            .neq('status', 'cancelled')

          let hasConflict = false
          if (conflicts && conflicts.length > 0) {
            for (const conflict of conflicts) {
              if (timePeriodsOverlap(
                event.start_time, event.end_time,
                conflict.start_time, conflict.end_time
              )) {
                console.log(`❌ [AUTO-ASSIGN] ${gm.name} - Conflit avec événement existant à ${conflict.start_time}`)
                hasConflict = true
                break
              }
            }
          }

          if (hasConflict) continue

          // Vérifier les compétences pour le jeu spécifique
          const gmCompetency = competencies?.find(comp => 
            comp.gm_id === gm.id && comp.game_id === eventGame.game_id
          )
          
          // CRITIQUE: Rejeter explicitement si aucune compétence déclarée
          if (!gmCompetency || !gmCompetency.competency_level || gmCompetency.competency_level <= 0) {
            console.log(`❌ [AUTO-ASSIGN] ${gm.name} - Aucune compétence déclarée pour "${eventGame.game_name}" (niveau: ${gmCompetency?.competency_level || 0})`)
            continue
          }
          
          const competencyLevel = gmCompetency.competency_level
          
          eligibleGMs.push({
            gm,
            weight: competencyLevel,
            competencyLevel
          })
          
          eventDiagnostic.eligibleGMs.push({
            gmId: gm.id,
            gmName: gm.name,
            competencyLevel,
            weight: competencyLevel
          })

          console.log(`✅ [AUTO-ASSIGN] ${gm.name} - Éligible (poids: ${competencyLevel})`)
        }

        if (eligibleGMs.length === 0) {
          // Determine the specific reason for no eligible GMs
          if (eventDiagnostic.availableGMs === 0) {
            eventDiagnostic.skipReason = 'Aucune disponibilité déclarée'
            diagnosticDetails.categoryCounts.noAvailability++
          } else {
            eventDiagnostic.skipReason = 'Aucune compétence ou conflit d\'horaire'
            diagnosticDetails.categoryCounts.noCompetency++
          }
          
          console.log(`❌ [AUTO-ASSIGN] Aucun GM éligible pour "${event.title}"`)
          diagnosticDetails.eventDetails.push(eventDiagnostic)
          processedEvents.push({ ...event, assigned: false, reason: 'Aucun GM éligible' })
          continue
        }

        // Sélection aléatoire pondérée
        const selectedGM = selectGMByWeight(eligibleGMs)
        
        // Assigner l'événement
        const { error: assignError } = await supabase
          .from('activities')
          .update({
            assigned_gm_id: selectedGM.gm.id,
            is_assigned: true,
            assignment_date: new Date().toISOString(),
            assignment_score: selectedGM.weight / eligibleGMs.length,
            status: 'assigned'
          })
          .eq('id', event.id)

        if (assignError) {
          console.error(`❌ [AUTO-ASSIGN] Erreur lors de l'assignation de l'événement ${event.id}:`, assignError)
          eventDiagnostic.skipReason = `Erreur d'assignation: ${assignError.message}`
          diagnosticDetails.categoryCounts.assignmentError++
          diagnosticDetails.eventDetails.push(eventDiagnostic)
          processedEvents.push({ ...event, assigned: false, reason: assignError.message })
          continue
        }

        // Créer l'enregistrement d'assignation
        await supabase
          .from('event_assignments')
          .insert({
            activity_id: event.id,
            gm_id: selectedGM.gm.id,
            assignment_score: selectedGM.weight,
            status: 'assigned'
          })

        assignmentsMade++
        
        // Update diagnostic
        eventDiagnostic.assigned = true
        eventDiagnostic.assignedTo = {
          gmId: selectedGM.gm.id,
          gmName: selectedGM.gm.name,
          competencyLevel: selectedGM.competencyLevel
        }
        diagnosticDetails.categoryCounts.assigned++
        diagnosticDetails.eventDetails.push(eventDiagnostic)
        
        processedEvents.push({ 
          ...event, 
          assigned: true, 
          assignedTo: selectedGM.gm.name,
          competencyLevel: selectedGM.competencyLevel
        })
        
        console.log(`✅ [AUTO-ASSIGN] Événement "${event.title}" assigné à ${selectedGM.gm.name} (niveau: ${selectedGM.competencyLevel})`)

        // CRITIQUE V2: Créer la notification d'assignation automatique avec email
        try {
          console.log(`📧 [AUTO-ASSIGN] Création notification + email pour GM ${selectedGM.gm.name} (${selectedGM.gm.id})`)
          
          const notificationTitle = `🤖 Nouvel événement assigné automatiquement : ${event.title}`
          const notificationMessage = `Vous avez été automatiquement assigné(e) à l'événement "${event.title}" le ${event.date} à ${event.start_time}. Cette assignation a été effectuée par le système d'auto-assignation.`
          
          // Données complètes pour le service unifié
          const notificationData = {
            gmId: selectedGM.gm.id,
            gmEmail: selectedGM.gm.email,
            gmName: selectedGM.gm.name,
            notificationType: 'assignment' as const,
            eventId: event.id,
            title: notificationTitle,
            message: notificationMessage,
            eventData: {
              ...event,
              reason: 'auto_assignment',
              competencyLevel: selectedGM.competencyLevel,
              autoAssigned: true
            }
          }

          // Utiliser le service unifié V2 avec fallbacks intégrés
          const { data: unifiedResult, error: unifiedError } = await supabase.functions.invoke('create-unified-notification', {
            body: notificationData
          })

          if (unifiedError) {
            console.error(`❌ [AUTO-ASSIGN] Erreur service unifié:`, unifiedError)
            
            // Triple fallback: notification directe + tentative email
            console.log(`🔄 [AUTO-ASSIGN] Triple fallback - notification directe...`)
            const { error: directNotifError } = await supabase
              .from('gm_notifications')
              .insert({
                gm_id: selectedGM.gm.id,
                event_id: event.id,
                notification_type: 'assignment',
                title: notificationTitle,
                message: notificationMessage,
                event_data: notificationData.eventData,
                is_read: false,
                email_sent: false
              })

            if (directNotifError) {
              console.error(`❌ [AUTO-ASSIGN] Erreur triple fallback pour GM ${selectedGM.gm.id}:`, directNotifError)
            } else {
              console.log(`✅ [AUTO-ASSIGN] Notification créée en triple fallback pour ${selectedGM.gm.name}`)
              
              // Tentative d'envoi d'email même en fallback
              if (selectedGM.gm.email) {
                try {
                  await supabase.functions.invoke('send-assignment-notification', {
                    body: {
                      gmEmail: selectedGM.gm.email,
                      gmName: selectedGM.gm.name,
                      eventTitle: event.title,
                      eventDate: event.date,
                      eventTime: `${event.start_time} - ${event.end_time}`,
                      eventDescription: 'Assignation automatique par le système',
                      assignmentType: 'new'
                    }
                  })
                  console.log(`📧 [AUTO-ASSIGN] Email fallback envoyé à ${selectedGM.gm.name}`)
                } catch (emailFallbackError) {
                  console.warn(`⚠️ [AUTO-ASSIGN] Email fallback échoué:`, emailFallbackError)
                }
              }
            }
          } else {
            console.log(`✅ [AUTO-ASSIGN] Notification + email créés via service unifié pour ${selectedGM.gm.name}`)
            console.log(`📊 [AUTO-ASSIGN] Résultat unifié:`, unifiedResult)
          }
        } catch (notificationError) {
          console.error(`❌ [AUTO-ASSIGN] Exception lors de la création de notification:`, notificationError)
        }

      } catch (eventError) {
        console.error(`❌ [AUTO-ASSIGN] Erreur lors du traitement de l'événement ${event.id}:`, eventError)
        const errorMsg = eventError instanceof Error ? eventError.message : String(eventError)
        const errorDiagnostic = {
          eventId: event.id,
          title: event.title,
          date: event.date,
          startTime: event.start_time,
          endTime: event.end_time,
          skipReason: `Erreur de traitement: ${errorMsg}`,
          eligibleGMs: [] as any[],
          availableGMs: 0,
          gameMapping: null as any,
          assigned: false,
          assignedTo: null as any
        }
        diagnosticDetails.categoryCounts.assignmentError++
        diagnosticDetails.eventDetails.push(errorDiagnostic)
        processedEvents.push({ ...event, assigned: false, reason: errorMsg })
        continue
      }
    }

    const executionDuration = Date.now() - startTime

    // Enregistrer le log d'auto-assignation avec détails diagnostiques
    const { error: logError } = await supabase
      .from('auto_assignment_logs')
      .insert({
        trigger_type: isAutoCron ? 'auto' : 'manual',
        assignments_made: assignmentsMade,
        events_processed: eventsToProcess.length,
        success: true,
        execution_duration: executionDuration,
        triggered_at: new Date().toISOString(),
        details: diagnosticDetails
      })

    if (logError) {
      console.error('❌ [AUTO-ASSIGN] Erreur lors de l\'enregistrement du log:', logError)
    }

    console.log(`\n🎉 [AUTO-ASSIGN] Auto-assignation ${isAutoCron ? 'automatique' : 'manuelle'} terminée:`)
    console.log(`📊 [AUTO-ASSIGN] ${assignmentsMade}/${eventsToProcess.length} assignations réussies`)
    console.log(`⏱️ [AUTO-ASSIGN] Durée d'exécution: ${executionDuration}ms`)

    return new Response(
      JSON.stringify({
        success: true,
        assignments: assignmentsMade,
        eventsProcessed: eventsToProcess.length,
        executionDuration,
        isAutoCron,
        processedEvents,
        message: `${assignmentsMade} assignation(s) effectuée(s) sur ${eventsToProcess.length} événement(s)`,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const executionDuration = Date.now() - startTime
    console.error('💥 [AUTO-ASSIGN] Erreur inattendue:', error)

    // Enregistrer le log d'erreur
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      await supabase
        .from('auto_assignment_logs')
        .insert({
          trigger_type: 'auto',
          assignments_made: 0,
          events_processed: 0,
          success: false,
          error_message: error instanceof Error ? error.message : String(error),
          execution_duration: executionDuration,
          triggered_at: new Date().toISOString(),
          details: {
            eventsAnalyzed: 0,
            eventDetails: [],
            categoryCounts: {
              noAvailability: 0,
              noGameMapping: 0,
              noCompetency: 0,
              timeSlotConflict: 0,
              scheduleConflict: 0,
              assigned: 0,
              assignmentError: 0
            },
            error: error instanceof Error ? error.message : String(error)
          }
        })
    } catch (logError) {
      console.error('❌ [AUTO-ASSIGN] Erreur lors de l\'enregistrement du log d\'erreur:', logError)
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionDuration,
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

// Fonctions utilitaires
function checkTimeSlotCompatibility(availableSlots: string[], eventStart: string, eventEnd: string): boolean {
  if (!availableSlots || availableSlots.length === 0) return false
  
  if (availableSlots.includes('indisponible-toute-la-journee')) return false
  if (availableSlots.includes('toute-la-journee')) return true

  const eventStartMin = timeToMinutes(eventStart)
  const eventEndMin = timeToMinutes(eventEnd)

  for (const slot of availableSlots) {
    if (slot.includes('-')) {
      try {
        const [slotStart, slotEnd] = slot.split('-')
        const slotStartMin = timeToMinutes(slotStart)
        const slotEndMin = timeToMinutes(slotEnd)
        
        if (slotStartMin <= eventStartMin && slotEndMin >= eventEndMin) {
          return true
        }
      } catch (error) {
        continue
      }
    }
  }
  
  return false
}

function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + minutes
}

function timePeriodsOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const start1Min = timeToMinutes(start1)
  const end1Min = timeToMinutes(end1)
  const start2Min = timeToMinutes(start2)
  const end2Min = timeToMinutes(end2)
  
  return start1Min < end2Min && end1Min > start2Min
}

function selectGMByWeight(eligibleGMs: Array<{gm: any, weight: number, competencyLevel: number}>): any {
  if (eligibleGMs.length === 1) return eligibleGMs[0]
  
  const totalWeight = eligibleGMs.reduce((sum, gm) => sum + gm.weight, 0)
  const random = Math.random() * totalWeight
  
  let cumulativeWeight = 0
  for (const candidate of eligibleGMs) {
    cumulativeWeight += candidate.weight
    if (random <= cumulativeWeight) {
      return candidate
    }
  }
  
  return eligibleGMs[eligibleGMs.length - 1]
}

function findGameForEvent(event: any, mappings: any[]) {
  if (!mappings || !event.title) return null

  for (const mapping of mappings) {
    if (!mapping.event_name_pattern || !mapping.games) continue

    // Vérifier si le titre de l'événement correspond au pattern
    const pattern = mapping.event_name_pattern.toLowerCase()
    const eventTitle = event.title.toLowerCase()

    if (eventTitle.includes(pattern) || pattern.includes(eventTitle)) {
      return {
        game_id: mapping.game_id,
        game_name: mapping.games.name
      }
    }
  }

  return null
}
