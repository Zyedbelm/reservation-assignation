import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'
import { 
  cleanJsonString, 
  processEventData, 
  hasEventChanged, 
  unassignGMFromActivity,
  normalizeMakeEventId
} from './eventProcessingUtils.ts'

interface MakeEvent {
  event_id: string;
  title: string;
  description?: string;
  start_datetime: string;
  end_datetime: string;
  duration_minutes: number | string;
  location?: string;
  activity_type?: string;
  calendar_source?: string;
  last_modified?: string;
}

interface WebhookPayload {
  events: MakeEvent[];
  sync_metadata?: {
    total_events?: number;
    sync_type?: string;
    force_reconcile?: boolean;
    is_full_snapshot?: boolean;
    audit_only?: boolean;
    date_range?: {
      start_date: string;
      end_date: string;
    };
  };
}

// Normalize Google Calendar event IDs by removing common suffixes
const normalizeEventId = (eventId: string): string => {
  if (!eventId) return eventId;
  return eventId.replace(/@google\.com$/, '').trim();
};

// PHASE 1.1: Sanitize and validate metadata to prevent empty string errors
const sanitizeMetadata = (metadata: any, calendarSource?: string) => {
  console.log('🧹 Sanitizing metadata...');
  console.log(`📊 Received calendar_source parameter: ${calendarSource}`);
  
  const sanitized = {
    total_events: metadata?.total_events || 0,
    sync_timestamp: metadata?.sync_timestamp || new Date().toISOString(),
    calendar_source: metadata?.calendar_source || calendarSource || 'unknown',
    is_full_snapshot: metadata?.is_full_snapshot || false,
    force_reconcile: metadata?.force_reconcile || false,
    audit_only: metadata?.audit_only || false,
    sync_type: metadata?.sync_type || 'unknown',
    date_range: null as any
  };
  
  // Validate date_range: accept both formats { start_date, end_date } and { start, end }
  const dr = metadata?.date_range;
  const startVal = dr?.start_date || dr?.start;
  const endVal = dr?.end_date || dr?.end;
  
  if (startVal && endVal && startVal !== '' && endVal !== '') {
    // Additional validation: check if dates are valid
    const startDate = new Date(startVal);
    const endDate = new Date(endVal);
    
    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      sanitized.date_range = {
        start_date: startVal,
        end_date: endVal
      };
      console.log('✅ Valid date range detected (normalized):', sanitized.date_range);
    } else {
      console.log('⚠️ Invalid date values in date_range, setting to null');
    }
  } else {
    console.log('⚠️ Missing or empty date_range in metadata, setting to null');
  }
  
  console.log('✅ Metadata sanitized successfully');
  return sanitized;
};

// Phase 3: Parser JSON en mode permissif avec fallback
const parseJsonPermissive = (jsonString: string): WebhookPayload => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('⚠️ Standard JSON parse failed, trying permissive mode...');
    console.error('Parse error:', error);
    
    // Tentative 1: Trouver la dernière accolade valide et tronquer
    const lastValidBrace = jsonString.lastIndexOf('}');
    if (lastValidBrace > 0) {
      try {
        // Essayer de compléter le JSON en ajoutant les fermetures manquantes
        let truncated = jsonString.substring(0, lastValidBrace + 1);
        
        // Compter les [ et ] pour fermer le tableau events si nécessaire
        const openBrackets = (truncated.match(/\[/g) || []).length;
        const closeBrackets = (truncated.match(/\]/g) || []).length;
        if (openBrackets > closeBrackets) {
          truncated += ']';
        }
        
        // Compter les { et } pour fermer l'objet principal si nécessaire
        const openBraces = (truncated.match(/\{/g) || []).length;
        const closeBraces = (truncated.match(/\}/g) || []).length;
        if (openBraces > closeBraces) {
          truncated += '}';
        }
        
        console.log(`🔧 Attempting truncated parse at position ${lastValidBrace}`);
        return JSON.parse(truncated);
      } catch (truncateError) {
        console.warn('⚠️ Truncated parse failed:', truncateError);
      }
    }
    
    // Tentative 2: Parser manuellement les événements complets
    try {
      console.log('🔧 Attempting manual event extraction...');
      const eventMatches = jsonString.match(/\{\s*"event_id"\s*:.*?\}\s*(?=,|\])/gs);
      if (eventMatches && eventMatches.length > 0) {
        const events = eventMatches.map(match => {
          try {
            return JSON.parse(match);
          } catch {
            return null;
          }
        }).filter(e => e !== null);
        
        console.log(`✅ Manually extracted ${events.length} valid events`);
        
        // Essayer d'extraire les metadata
        let metadata = {};
        const metadataMatch = jsonString.match(/"sync_metadata"\s*:\s*(\{[^}]+\})/);
        if (metadataMatch) {
          try {
            metadata = JSON.parse(metadataMatch[1]);
          } catch {
            console.warn('⚠️ Could not parse metadata');
          }
        }
        
        return {
          events,
          sync_metadata: metadata as any
        };
      }
    } catch (manualError) {
      console.error('❌ Manual extraction failed:', manualError);
    }
    
    throw error;
  }
};

export const processWebhookPayload = async (rawBody: string, headers?: Headers) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  console.log('✅ Supabase client initialized')
  
  console.log(`📥 Raw body length: ${rawBody.length} characters`);
  
  const cleanedBody = cleanJsonString(rawBody);
  
  let payload: WebhookPayload;
  try {
    // Utiliser le parser permissif avec fallback
    payload = parseJsonPermissive(cleanedBody);
    console.log('✅ JSON parsing successful');
  } catch (parseError) {
    console.error('❌ JSON parse error after all attempts:', parseError);
    console.log('📄 Cleaned body preview:', cleanedBody.substring(0, 500));
    console.log('📄 Cleaned body end:', cleanedBody.substring(cleanedBody.length - 500));
    throw new Error(`JSON parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
  }

  // Extract calendar source from metadata or headers
  const calendarSource = (payload.sync_metadata as any)?.calendar_source ||
                        (payload.sync_metadata as any)?.calendar_id ||
                        headers?.get('X-Calendar-Source') ||
                        headers?.get('X-Calendar-Id') || 
                        'unknown';

  // PHASE 1.1: Sanitize metadata before using it
  if (payload.sync_metadata) {
    payload.sync_metadata = sanitizeMetadata(payload.sync_metadata, calendarSource);
  }
  
  // PHASE 5: Log validation warning for unknown calendar_source
  if (calendarSource === 'unknown') {
    console.warn('⚠️⚠️⚠️ WARNING: calendar_source is UNKNOWN! This may create duplicates!');
  }
  console.log(`✅ Final calendar_source validated: ${calendarSource}`);

  console.log(`📥 Received ${payload.events?.length || 0} events from Make.com`)
  console.log(`📊 Calendar source: ${calendarSource}`)
  console.log(`📊 Metadata: ${payload.sync_metadata?.total_events || 0} total events available`)
  console.log(`📊 Sync mode: ${(payload.sync_metadata as any)?.mode || 'unknown'}`)
  console.log(`📊 Is full snapshot: ${payload.sync_metadata?.is_full_snapshot || false}`)
  console.log(`📊 Force reconcile: ${payload.sync_metadata?.force_reconcile || false}`)
  console.log(`📊 Date range valid: ${payload.sync_metadata?.date_range !== null}`)

  // Check for Make.com snapshot header
  const makeSnapshotHeader = headers?.get('X-Make-Snapshot') === 'true';
  if (makeSnapshotHeader) {
    console.log('📊 X-Make-Snapshot header detected');
  }

  if (!payload.events || !Array.isArray(payload.events)) {
    console.log('⚠️ No events array found in payload')
    throw new Error('No events found in payload');
  }

  return { payload, supabaseClient, makeSnapshotHeader, calendarSource };
};

export async function processEventChanges(payload: WebhookPayload, supabaseClient: any, calendarSource = 'unknown') {
  const events = payload.events || [];
  const isFullSnapshot = payload.sync_metadata?.is_full_snapshot || false;
  const forceReconcile = payload.sync_metadata?.force_reconcile || false;
  const auditOnly = payload.sync_metadata?.audit_only || false;
  const syncType = payload.sync_metadata?.sync_type || 'unknown';
  
  // Try to get date_range from sync_metadata first, then fallback to top-level payload
  let dateRange = payload.sync_metadata?.date_range;
  
  // Fallback: check if date_range exists at top level (in case of format mismatch)
  if (!dateRange && (payload as any).date_range) {
    const topDr = (payload as any).date_range;
    const startVal = topDr.start_date || topDr.start;
    const endVal = topDr.end_date || topDr.end;
    if (startVal && endVal) {
      dateRange = { start_date: startVal, end_date: endVal };
      console.log('ℹ️ Fallback: using top-level date_range:', dateRange);
    }
  }

  console.log(`🔄 Processing ${events.length} events from Make.com in ${auditOnly ? 'AUDIT' : forceReconcile ? 'RECONCILE' : isFullSnapshot ? 'FULL SNAPSHOT' : 'INCREMENTAL'} mode...`);
  console.log(`📊 Metadata: ${payload.sync_metadata?.total_events || 0} total events available`);
  console.log(`🔍 [AUDIT-MODE] audit_only: ${auditOnly}, force_reconcile: ${forceReconcile}, is_full_snapshot: ${isFullSnapshot}`);
  
  // Initialize counters
  let eventsCreated = 0;
  let eventsUpdated = 0;
  let eventsDeleted = 0;
  let eventsSkipped = 0;
  let eventErrors = 0;
  let eventsUnassigned = 0;
  let emailsSent = 0;
  const errors: any[] = [];

  // STRICT ID-BASED RECONCILIATION
  async function processReceivedEventsStrict(receivedEvents: MakeEvent[], supabaseClient: any, calendarSource: string): Promise<{ eventsCreated: number; eventsUpdated: number; eventErrors: number; errors: any[]; emailsSent: number }> {
    let eventsCreated = 0;
    let eventsUpdated = 0;
    let eventErrors = 0;
    let emailsSent = 0;
    const errors: any[] = [];

    console.log(`🔄 Processing ${receivedEvents.length} events from Make.com in STRICT mode...`);

    for (let index = 0; index < receivedEvents.length; index++) {
      const event = receivedEvents[index];
      
      try {
        const processedEvent = await processEventData(event, index, supabaseClient);
        
        // Force le calendar_source depuis les métadonnées
        processedEvent.calendar_source = calendarSource;
        
        // 🔍 RECHERCHE MULTI-VARIANTES pour éviter les doublons
        // Créer toutes les variantes possibles de l'ID pour la recherche
        const rawId = event.event_id || processedEvent.make_event_id;
        const normalizedFromRaw = normalizeMakeEventId(rawId);
        const normalizedFromProcessed = normalizeMakeEventId(processedEvent.make_event_id);
        
        // Tableau de tous les IDs candidats (dédupliqués)
        const candidateIds = Array.from(new Set([
          processedEvent.make_event_id,
          rawId,
          normalizedFromRaw,
          normalizedFromProcessed,
          `${normalizedFromRaw}@google.com`,
          `${normalizedFromProcessed}@google.com`
        ]));
        
        console.log(`🔍 Searching for existing event with ${candidateIds.length} candidate IDs`);
        
        // Rechercher l'événement existant par ID (dans la source courante)
        let { data: existingEvents } = await supabaseClient
          .from('activities')
          .select('*')
          .in('make_event_id', candidateIds)
          .eq('calendar_source', calendarSource)
          .order('created_at', { ascending: false });
        
        // 🔄 FALLBACK 1: Recherche par empreinte temporelle (dans la source courante)
        if (!existingEvents || existingEvents.length === 0) {
          console.log(`🔍 No event found by ID in current source, trying temporal signature fallback...`);
          const { data: fallbackEvents } = await supabaseClient
            .from('activities')
            .select('*')
            .eq('date', processedEvent.date)
            .eq('start_time', processedEvent.start_time)
            .eq('end_time', processedEvent.end_time)
            .eq('title', processedEvent.title)
            .eq('calendar_source', calendarSource)
            .limit(5); // Get multiple to filter by event_id
          
          if (fallbackEvents && fallbackEvents.length > 0) {
            // 🔍 VALIDATION: Le fallback temporel ne doit pas fusionner des événements avec des IDs différents
            const validMatch = fallbackEvents.find((e: any) => {
              // Accepter si: même make_event_id, OU event_id null/vide, OU calendar_source=unknown
              const sameId = candidateIds.includes(e.make_event_id);
              const isUnknown = e.calendar_source === 'unknown';
              const hasNoId = !e.make_event_id || e.make_event_id === '';
              return sameId || isUnknown || hasNoId;
            });
            
            if (validMatch) {
              console.log(`✅ Found valid temporal match (same ID or unknown/null), will update`);
              existingEvents = [validMatch];
            } else {
              console.log(`⚠️ Ignoring temporal match(es): different event_id(s) found`);
              fallbackEvents.forEach((e: any) => {
                console.log(`   - Found: ${e.make_event_id} vs Incoming: ${processedEvent.make_event_id}`);
              });
            }
          }
        }
        
        // 🔄 FALLBACK 2: RECHERCHE CROSS-SOURCE (pour détecter les doublons 'unknown' ou inter-sources)
        if (!existingEvents || existingEvents.length === 0) {
          console.log(`🔍 No event found in current source (${calendarSource}), trying CROSS-SOURCE search...`);
          
          // Recherche par ID sans filtrer calendar_source
          const { data: crossSourceEvents } = await supabaseClient
            .from('activities')
            .select('*')
            .in('make_event_id', candidateIds)
            .order('created_at', { ascending: false });
          
          if (crossSourceEvents && crossSourceEvents.length > 0) {
            console.log(`⚠️ Found ${crossSourceEvents.length} cross-source event(s) for ID ${processedEvent.make_event_id}`);
            
            // Chercher un événement 'unknown' à réassigner
            const unknownEvent = crossSourceEvents.find((e: any) => e.calendar_source === 'unknown');
            
            if (unknownEvent) {
              console.log(`🔄 Found 'unknown' event ${unknownEvent.id}, reassigning to source '${calendarSource}'`);
              
              // Mettre à jour le calendar_source de l'événement 'unknown'
              const { error: updateSourceError } = await supabaseClient
                .from('activities')
                .update({ calendar_source: calendarSource })
                .eq('id', unknownEvent.id);
              
              if (updateSourceError) {
                console.error(`❌ Error updating calendar_source:`, updateSourceError);
              } else {
                console.log(`✅ Successfully reassigned 'unknown' event to '${calendarSource}'`);
                existingEvents = [{ ...unknownEvent, calendar_source: calendarSource }];
              }
            } else {
              // Aucun événement 'unknown', mais on a trouvé des événements d'autres sources
              // Dans ce cas, on utilise l'événement trouvé pour éviter la duplication cross-source
              console.log(`⚠️ Found event(s) in other source(s): ${crossSourceEvents.map((e: any) => e.calendar_source).join(', ')}`);
              console.log(`🔧 Using most appropriate existing event to avoid cross-source duplicate`);
              existingEvents = crossSourceEvents;
            }
          } else {
            // Fallback temporel cross-source en dernier recours
            console.log(`🔍 No cross-source ID match, trying cross-source temporal signature...`);
            const { data: crossSourceTemporal } = await supabaseClient
              .from('activities')
              .select('*')
              .eq('date', processedEvent.date)
              .eq('start_time', processedEvent.start_time)
              .eq('end_time', processedEvent.end_time)
              .eq('title', processedEvent.title)
              .limit(10);
            
            if (crossSourceTemporal && crossSourceTemporal.length > 0) {
              console.log(`⚠️ Found ${crossSourceTemporal.length} cross-source temporal match(es)`);
              
              // 🔍 VALIDATION: Filtrer pour ne garder que les événements valides pour ce fallback
              const validMatches = crossSourceTemporal.filter((e: any) => {
                const sameId = candidateIds.includes(e.make_event_id);
                const isUnknown = e.calendar_source === 'unknown';
                const hasNoId = !e.make_event_id || e.make_event_id === '';
                return sameId || isUnknown || hasNoId;
              });
              
              if (validMatches.length > 0) {
                // Priorité aux événements 'unknown' pour réassignation
                const unknownTemporal = validMatches.find((e: any) => e.calendar_source === 'unknown');
                
                if (unknownTemporal) {
                  console.log(`🔄 Reassigning 'unknown' temporal match to '${calendarSource}'`);
                  const { error: updateSourceError } = await supabaseClient
                    .from('activities')
                    .update({ calendar_source: calendarSource })
                    .eq('id', unknownTemporal.id);
                  
                  if (!updateSourceError) {
                    existingEvents = [{ ...unknownTemporal, calendar_source: calendarSource }];
                  }
                } else {
                  existingEvents = validMatches;
                }
              } else {
                console.log(`⚠️ Ignoring all temporal matches: different event_id(s)`);
                crossSourceTemporal.forEach((e: any) => {
                  console.log(`   - Found: ${e.make_event_id} vs Incoming: ${processedEvent.make_event_id}`);
                });
              }
            }
          }
        }
        
        // Handle duplicates: if multiple events found, keep the canonical one and clean up
        let existingEvent = null;
        if (existingEvents && existingEvents.length > 1) {
          console.log(`⚠️ Found ${existingEvents.length} duplicate events for ${processedEvent.make_event_id}`);
          
          // Sort to find canonical event (priority: is_assigned=true, then most recent)
          const sortedEvents = existingEvents.sort((a: any, b: any) => {
            if (a.is_assigned && !b.is_assigned) return -1;
            if (!a.is_assigned && b.is_assigned) return 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
          
          existingEvent = sortedEvents[0];
          const duplicates = sortedEvents.slice(1);
          
          console.log(`🔧 Using canonical event ${existingEvent.id}, cleaning ${duplicates.length} duplicates`);
          
          // Migrate assignments from duplicates to canonical
          for (const duplicate of duplicates) {
            const { data: assignments } = await supabaseClient
              .from('event_assignments')
              .select('*')
              .eq('activity_id', duplicate.id);
            
            if (assignments && assignments.length > 0) {
              await supabaseClient
                .from('event_assignments')
                .update({ activity_id: existingEvent.id })
                .eq('activity_id', duplicate.id);
              console.log(`✅ Migrated ${assignments.length} assignments from duplicate`);
            }
          }
          
          // Delete duplicate events
          const duplicateIds = duplicates.map((d: any) => d.id);
          await supabaseClient
            .from('activities')
            .delete()
            .in('id', duplicateIds);
          
          console.log(`✅ Cleaned up ${duplicates.length} duplicate events`);
        } else {
          existingEvent = existingEvents?.[0];
        }

        if (existingEvent) {
          // Si l'événement existant a calendar_source='unknown', on le met à jour avec le bon calendar_source
          const shouldUpdateCalendarSource = existingEvent.calendar_source === 'unknown';
          
          // Vérifier si l'événement a changé
          if (hasEventChanged(existingEvent, processedEvent) || shouldUpdateCalendarSource) {
            console.log(`📝 Event ${shouldUpdateCalendarSource ? '(updating calendar_source)' : 'changed'}, updating: ${processedEvent.title}`);
            
            // Déterminer si les horaires ont changé
            const timeChanged = existingEvent.start_time !== processedEvent.start_time || 
                               existingEvent.end_time !== processedEvent.end_time || 
                               existingEvent.date !== processedEvent.date;
            
            // Si les heures ont changé et qu'un GM était assigné, le désassigner
            if (timeChanged && existingEvent.assigned_gm_id) {
              console.log(`🔄 Unassigning GM due to time change`);
              await unassignGMFromActivity(existingEvent.id, supabaseClient);
            } else if (!timeChanged && existingEvent.assigned_gm_id) {
              // ✅ Préserver l'assignation existante si pas de changement d'horaire
              console.log(`✅ Preserving existing assignment (no time change)`);
              processedEvent.is_assigned = existingEvent.is_assigned;
              processedEvent.status = existingEvent.status;
              processedEvent.assigned_gm_id = existingEvent.assigned_gm_id;
              processedEvent.assignment_date = existingEvent.assignment_date;
              processedEvent.assignment_score = existingEvent.assignment_score;
            }

            const { error: updateError } = await supabaseClient
              .from('activities')
              .update(processedEvent)
              .eq('id', existingEvent.id);

            if (updateError) {
              console.error(`❌ Error updating event:`, updateError);
              errors.push({
                index,
                event_id: processedEvent.make_event_id,
                title: processedEvent.title,
                error_code: updateError.code,
                error_message: updateError.message,
                error_details: updateError.details
              });
              eventErrors++;
            } else {
              eventsUpdated++;
              console.log(`✅ Event updated: ${processedEvent.title}`);
              
              // Envoyer notification de modification d'événement seulement si ce n'était pas juste une mise à jour du calendar_source
              if (!shouldUpdateCalendarSource || hasEventChanged(existingEvent, processedEvent)) {
                try {
                  await supabaseClient.functions.invoke('send-event-change-notification', {
                    body: {
                      eventId: existingEvent.id,
                      changeType: 'modified',
                      oldData: existingEvent,
                      newData: processedEvent,
                      calendarSource
                    }
                  });
                  emailsSent++;
                } catch (notifError) {
                  console.error('❌ Error sending notification:', notifError);
                }
              }
            }
          }
        } else {
          // Créer un nouvel événement - définir les valeurs par défaut pour les nouveaux événements
          processedEvent.status = 'pending';
          processedEvent.is_assigned = false;
          
          const { data: newEvent, error: insertError } = await supabaseClient
            .from('activities')
            .insert([processedEvent])
            .select()
            .single();

          if (insertError) {
            console.error(`❌ Error creating event:`, insertError);
            errors.push({
              index,
              event_id: processedEvent.make_event_id,
              title: processedEvent.title,
              error_code: insertError.code,
              error_message: insertError.message,
              error_details: insertError.details
            });
            eventErrors++;
          } else {
            eventsCreated++;
            console.log(`✅ Event created: ${processedEvent.title}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error processing event ${index}:`, error);
        errors.push({
          index,
          event_id: event.event_id,
          title: event.title,
          error_message: error instanceof Error ? error.message : String(error)
        });
        eventErrors++;
      }
    }

    return {
      eventsCreated,
      eventsUpdated, 
      eventErrors,
      errors,
      emailsSent
    };
  }

  // Process received events (skip if audit mode)
  if (!auditOnly) {
    const processResult = await processReceivedEventsStrict(events, supabaseClient, calendarSource);
    eventsCreated += processResult.eventsCreated;
    eventsUpdated += processResult.eventsUpdated;
    eventErrors += processResult.eventErrors;
    emailsSent += processResult.emailsSent;
    
    // Add errors to main errors array
    if (processResult.errors) {
      errors.push(...processResult.errors);
    }
  } else {
    console.log('🔍 Skipping event processing in audit mode');
  }

  // Add reconciliation logic - now activated for ALL full snapshots
  let reconciliationStats = {};
  
  // PHASE 1.2: Automatic reconciliation on full snapshots
  if (isFullSnapshot) {
    if (dateRange && dateRange.start_date && dateRange.end_date) {
      console.log('🔍 Starting automatic reconciliation for full snapshot...');
      console.log(`📅 Date range: ${dateRange.start_date} to ${dateRange.end_date}`);
      console.log(`🔧 Mode: ${auditOnly ? 'AUDIT ONLY' : forceReconcile ? 'FORCE DELETE' : 'SOFT DELETE (cancel)'}`);
      console.log(`📊 Calendar source: ${calendarSource}`);
      console.log(`📊 Received ${events.length} events in snapshot`);
      
      // Extract only the date part for comparison (YYYY-MM-DD)
      const startDateOnly = dateRange.start_date.split('T')[0];
      const endDateOnly = dateRange.end_date.split('T')[0];
      
      console.log(`📅 Normalized date range for query: ${startDateOnly} to ${endDateOnly}`);
      
      // Get existing events in the date range for this calendar source
      const { data: existingEvents, error: existingError } = await supabaseClient
        .from('activities')
        .select('id, make_event_id, title, date, start_time, end_time, is_assigned, assigned_gm_id, status')
        .eq('calendar_source', calendarSource)
        .gte('date', startDateOnly)
        .lte('date', endDateOnly)
        .not('make_event_id', 'is', null);
      
      console.log(`📊 Found ${existingEvents?.length || 0} existing events in DB for source '${calendarSource}'`);

      if (!existingError && existingEvents) {
        const receivedEventIds = new Set(events.map(e => normalizeMakeEventId(e.event_id)));
        console.log(`📊 Received event IDs (normalized): ${Array.from(receivedEventIds).slice(0, 5).join(', ')}... (showing first 5)`);
        
        const missingEvents = existingEvents.filter((event: any) => {
          const normalized = normalizeMakeEventId(event.make_event_id);
          const isInSnapshot = receivedEventIds.has(normalized);
          const isAlreadyCanceled = event.status === 'canceled';
          
          if (!isInSnapshot && !isAlreadyCanceled) {
            console.log(`🔍 Missing from snapshot: ${event.make_event_id} (${event.title})`);
          }
          
          return !isInSnapshot && !isAlreadyCanceled;
        });

        const wouldCancel = [];
        const canceled = [];
        const deleted = [];
        const ignoredAssigned = [];

        for (const missingEvent of missingEvents) {
          const eventDesc = `${missingEvent.title} (${missingEvent.date} ${missingEvent.start_time})`;
          
          // PROTECTION: Never touch assigned events
          if (missingEvent.is_assigned || missingEvent.assigned_gm_id) {
            ignoredAssigned.push(eventDesc);
            console.log(`🔒 Protected: Ignoring assigned event: ${eventDesc}`);
            continue;
          }
          
          // Event is not assigned, we can process it
          if (auditOnly) {
            // Audit mode: just report what would happen
            wouldCancel.push(eventDesc);
            console.log(`📋 Audit: Would process missing event: ${eventDesc}`);
          } else if (forceReconcile) {
            // Force mode: physically delete unassigned events
            const { error: deleteError } = await supabaseClient
              .from('activities')
              .delete()
              .eq('id', missingEvent.id);
            
            if (!deleteError) {
              deleted.push(eventDesc);
              eventsDeleted++;
              console.log(`🗑️ DELETED missing unassigned event: ${eventDesc}`);
            } else {
              console.error(`❌ Error deleting event ${missingEvent.id}:`, deleteError);
            }
          } else {
            // Normal mode: soft delete by marking as canceled
            const { error: cancelError } = await supabaseClient
              .from('activities')
              .update({ 
                status: 'canceled',
                updated_at: new Date().toISOString()
              })
              .eq('id', missingEvent.id);
            
            if (!cancelError) {
              canceled.push(eventDesc);
              console.log(`❌ CANCELED missing unassigned event: ${eventDesc}`);
            } else {
              console.error(`❌ Error canceling event ${missingEvent.id}:`, cancelError);
            }
          }
        }

        reconciliationStats = {
          total_missing: missingEvents.length,
          would_cancel: wouldCancel,
          canceled: canceled,
          deleted: deleted,
          ignored_assigned: ignoredAssigned
        };

        console.log(`📊 Reconciliation complete:`);
        console.log(`   - ${missingEvents.length} events missing from calendar`);
        console.log(`   - ${canceled.length} canceled (soft delete)`);
        console.log(`   - ${deleted.length} deleted (hard delete)`);
        console.log(`   - ${ignoredAssigned.length} protected (assigned)`);
        console.log(`   - ${wouldCancel.length} would process (audit mode)`);
      } else if (existingError) {
        console.error('❌ Error fetching existing events for reconciliation:', existingError);
      }
    } else {
      console.log('⚠️ Skipping reconciliation: Invalid or missing date range');
      console.log('⚠️ Date range received:', dateRange);
      reconciliationStats = {
        skipped: true,
        reason: 'Invalid or missing date range in sync_metadata'
      };
    }
  } else {
    console.log('ℹ️ Incremental sync: reconciliation skipped (only runs on full snapshots)');
  }

  return {
    eventsCreated,
    eventsUpdated,
    eventsDeleted,
    eventsSkipped,
    eventErrors,
    eventsUnassigned,
    emailsSent,
    errors,
    reconciliation_stats: reconciliationStats
  };
};