import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

// Utilitaire pour formater les noms des Game Masters de manière cohérente
interface GMNameData {
  first_name?: string;
  last_name?: string;
  email?: string;
  name?: string;
}

const formatGMName = (gm: GMNameData): string => {
  // Priorité 1 : Prénom et Nom
  if (gm.first_name && gm.last_name) {
    return `${gm.first_name} ${gm.last_name}`;
  }

  // Si on a seulement le prénom ou le nom
  if (gm.first_name) {
    return gm.first_name;
  }
  
  if (gm.last_name) {
    return gm.last_name;
  }

  // Priorité 2 : Partie avant @ de l'email
  if (gm.email) {
    const emailPrefix = gm.email.split('@')[0];
    if (emailPrefix) {
      return emailPrefix;
    }
  }

  // Fallback : champ name
  return gm.name || 'GM inconnu';
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GMNotificationData {
  gm_id: string;
  gm_name: string;
  gm_email: string;
  events: Array<{
    event_id: string;
    change_type: 'created' | 'modified' | 'assigned' | 'unassigned' | 'canceled';
    title: string;
    description?: string;
    date: string;
    start_time: string;
    end_time: string;
    status?: string;
    changes?: string[];
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔄 Starting daily GM notifications process');
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { test } = await req.json().catch(() => ({ test: false }));
    
    // Calculer la période (dernières 24h)
    const now = new Date();
    const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    
    if (test) {
      console.log('🧪 Running in test mode (still using last 24h)');
    }

    // Récupérer tous les événements avec changements récents (assignations, modifications, annulations)
    console.log(`🔍 Fetching events with recent changes since: ${yesterday.toISOString()}`);
    
    const { data: recentActivities, error: activitiesError } = await supabaseClient
      .from('activities')
      .select(`
        id,
        title,
        description,
        date,
        start_time,
        end_time,
        duration,
        assigned_gm_id,
        created_at,
        updated_at,
        assignment_date,
        status
      `)
      .or(`updated_at.gte.${yesterday.toISOString()},assignment_date.gte.${yesterday.toISOString()},created_at.gte.${yesterday.toISOString()}`)
      .order('updated_at', { ascending: false });

    if (activitiesError) {
      throw new Error(`Failed to fetch activities: ${activitiesError.message}`);
    }

    console.log(`📊 Found ${recentActivities?.length || 0} recent activities`);

    // Récupérer les assignations récentes pour détecter les désassignations
    console.log(`🔍 Fetching recent assignments to detect de-assignments`);
    const { data: recentAssignments, error: assignmentsError } = await supabaseClient
      .from('event_assignments')
      .select(`
        activity_id,
        gm_id,
        assigned_at,
        status
      `)
      .gte('assigned_at', yesterday.toISOString())
      .eq('status', 'assigned')
      .order('assigned_at', { ascending: false });

    if (assignmentsError) {
      console.warn(`⚠️ Failed to fetch recent assignments: ${assignmentsError.message}`);
    }

    console.log(`📊 Found ${recentAssignments?.length || 0} recent assignments`);

    // Analyser les changements par type
    const changeAnalysis = {
      newEvents: [] as any[],
      newAssignments: [] as any[],
      modifications: [] as any[],
      cancellations: [] as any[],
      deassignments: [] as any[]
    };

    // Créer un map des événements actuels pour faciliter les comparaisons
    const currentEventsMap = new Map();
    (recentActivities || []).forEach(activity => {
      currentEventsMap.set(activity.id, activity);
    });

    // Détecter les désassignations en comparant les assignations récentes avec l'état actuel
    const detectedDeassignments = new Set<string>();
    if (recentAssignments && recentAssignments.length > 0) {
      console.log(`🔍 Analyzing recent assignments for de-assignments...`);
      
      for (const assignment of recentAssignments) {
        const currentEvent = currentEventsMap.get(assignment.activity_id);
        
        if (currentEvent) {
          // L'événement existe toujours, vérifier s'il a encore le même GM assigné
          if (currentEvent.assigned_gm_id !== assignment.gm_id) {
            console.log(`🚫 De-assignment detected: Event ${currentEvent.title} - GM ${assignment.gm_id} was assigned at ${assignment.assigned_at} but is no longer assigned`);
            
            // Créer un événement de désassignation artificiel avec les bonnes infos
            const deassignmentEvent = {
              ...currentEvent,
              former_gm_id: assignment.gm_id, // GM qui était assigné avant
              assignment_removed_at: assignment.assigned_at
            };
            
            changeAnalysis.deassignments.push(deassignmentEvent);
            detectedDeassignments.add(`${currentEvent.id}-${assignment.gm_id}`);
          }
        } else {
          // L'événement n'existe plus dans notre requête récente, le récupérer spécifiquement
          const { data: eventData } = await supabaseClient
            .from('activities')
            .select(`
              id, title, description, date, start_time, end_time, 
              duration, assigned_gm_id, created_at, updated_at, 
              assignment_date, status
            `)
            .eq('id', assignment.activity_id)
            .single();
          
          if (eventData && eventData.assigned_gm_id !== assignment.gm_id) {
            console.log(`🚫 De-assignment detected (external event): Event ${eventData.title} - GM ${assignment.gm_id} was assigned but is no longer assigned`);
            
            const deassignmentEvent = {
              ...eventData,
              former_gm_id: assignment.gm_id,
              assignment_removed_at: assignment.assigned_at
            };
            
            changeAnalysis.deassignments.push(deassignmentEvent);
            detectedDeassignments.add(`${eventData.id}-${assignment.gm_id}`);
          }
        }
      }
    }

    for (const activity of recentActivities || []) {
      const createdAt = new Date(activity.created_at);
      const updatedAt = new Date(activity.updated_at);
      const assignmentDate = activity.assignment_date ? new Date(activity.assignment_date) : null;
      
      console.log(`🔍 Analyzing event: ${activity.title} (created: ${createdAt >= yesterday ? 'recent' : 'old'}, updated: ${updatedAt >= yesterday ? 'recent' : 'old'}, assigned_gm: ${activity.assigned_gm_id ? 'yes' : 'no'}, status: ${activity.status})`);
      
      // Événement annulé
      if (activity.status === 'canceled' && updatedAt >= yesterday) {
        console.log(`🚫 Événement annulé: ${activity.title}`);
        changeAnalysis.cancellations.push(activity);
        continue;
      }
      
      // Nouvel événement créé avec assignation
      if (createdAt >= yesterday && activity.assigned_gm_id) {
        console.log(`✨ Nouvel événement créé et assigné: ${activity.title}`);
        changeAnalysis.newEvents.push(activity);
        continue;
      }
      
      // Nouvelle assignation (événement existant, nouvelle assignation)
      if (assignmentDate && assignmentDate >= yesterday && activity.assigned_gm_id && createdAt < yesterday) {
        console.log(`📌 Nouvelle assignation: ${activity.title} -> GM ${activity.assigned_gm_id}`);
        changeAnalysis.newAssignments.push(activity);
        continue;
      }
      
      // Événement modifié (avec GM toujours assigné)
      if (updatedAt >= yesterday && activity.assigned_gm_id && (!assignmentDate || assignmentDate < yesterday)) {
        console.log(`📝 Événement modifié: ${activity.title}`);
        changeAnalysis.modifications.push(activity);
        continue;
      }
      
      // Désassignation détectée via l'état actuel (ancienne méthode de fallback)
      if (updatedAt >= yesterday && !activity.assigned_gm_id && createdAt < yesterday) {
        const deassignmentKey = `${activity.id}-fallback`;
        if (!detectedDeassignments.has(deassignmentKey)) {
          console.log(`❌ Désassignation détectée (fallback): ${activity.title}`);
          changeAnalysis.deassignments.push(activity);
          detectedDeassignments.add(deassignmentKey);
        }
        continue;
      }
      
      console.log(`⚠️ Événement non catégorisé: ${activity.title} (status: ${activity.status}, has_gm: ${!!activity.assigned_gm_id}, created_recent: ${createdAt >= yesterday}, updated_recent: ${updatedAt >= yesterday})`);
    }

    console.log(`📈 Change analysis: ${changeAnalysis.newEvents.length} nouveaux, ${changeAnalysis.newAssignments.length} assignations, ${changeAnalysis.modifications.length} modifications, ${changeAnalysis.cancellations.length} annulations, ${changeAnalysis.deassignments.length} désassignations`);

    // Collecter tous les GM IDs impliqués dans les changements
    const allGMIds = new Set<string>();
    
    // Ajouter les GMs assignés actuellement
    [...changeAnalysis.newEvents, ...changeAnalysis.newAssignments, ...changeAnalysis.modifications]
      .forEach(activity => {
        if (activity.assigned_gm_id) {
          allGMIds.add(activity.assigned_gm_id);
        }
      });
    
    // Ajouter les GMs des désassignations (former_gm_id)
    changeAnalysis.deassignments.forEach(activity => {
      if (activity.former_gm_id) {
        allGMIds.add(activity.former_gm_id);
      }
    });

    // Pour les annulations et désassignations, récupérer les anciens GMs depuis les logs
    let formerAssignments: any[] = [];
    if (changeAnalysis.cancellations.length > 0 || changeAnalysis.deassignments.length > 0) {
      const eventIds = [...changeAnalysis.cancellations, ...changeAnalysis.deassignments].map(a => a.id);
      const { data: assignmentLogs } = await supabaseClient
        .from('event_assignments')
        .select('activity_id, gm_id, assigned_at')
        .in('activity_id', eventIds)
        .order('assigned_at', { ascending: false });
      
      formerAssignments = assignmentLogs || [];
      
      // Ajouter les anciens GMs à notre set
      formerAssignments.forEach(assignment => {
        if (assignment.gm_id) {
          allGMIds.add(assignment.gm_id);
        }
      });
    }

    console.log(`👥 Found ${allGMIds.size} unique GMs involved in changes: [${Array.from(allGMIds).join(', ')}]`);

    // Récupérer les informations des GMs impliqués (sans filtre is_active)
    let gameMasters: any[] = [];
    if (allGMIds.size > 0) {
      const { data: gmData, error: gmError } = await supabaseClient
        .from('game_masters')
        .select('id, name, email, first_name, last_name, is_active')
        .in('id', Array.from(allGMIds));

      if (gmError) {
        throw new Error(`Failed to fetch game masters: ${gmError.message}`);
      }
      
      gameMasters = gmData || [];
      console.log(`📋 Retrieved ${gameMasters.length} GM records`);
      
      // Log des GMs manquants
      const foundGMIds = new Set(gameMasters.map(gm => gm.id));
      allGMIds.forEach(gmId => {
        if (!foundGMIds.has(gmId)) {
          console.warn(`⚠️ GM not found in database: ${gmId}`);
        }
      });
    }

    // Grouper les changements par GM
    const gmNotifications: Map<string, GMNotificationData> = new Map();

    // Fonction helper pour ajouter une notification
    const addNotification = (gmId: string, activity: any, changeType: 'created' | 'modified' | 'assigned' | 'unassigned' | 'canceled', changes: string[] = []) => {
      const gm = gameMasters?.find(g => g.id === gmId);
      if (!gm) return;

      if (!gmNotifications.has(gmId)) {
        gmNotifications.set(gmId, {
          gm_id: gmId,
          gm_name: formatGMName(gm),
          gm_email: gm.email,
          events: []
        });
      }

      gmNotifications.get(gmId)?.events.push({
        event_id: activity.id,
        change_type: changeType,
        title: activity.title,
        description: activity.description,
        date: activity.date,
        start_time: activity.start_time,
        end_time: activity.end_time,
        status: activity.status,
        changes
      });
    };

    // Traiter chaque type de changement
    for (const activity of changeAnalysis.newEvents) {
      addNotification(activity.assigned_gm_id, activity, 'created', ['Nouvel événement créé et assigné']);
    }

    for (const activity of changeAnalysis.newAssignments) {
      addNotification(activity.assigned_gm_id, activity, 'assigned', ['Vous avez été assigné à cet événement']);
    }

    for (const activity of changeAnalysis.modifications) {
      addNotification(activity.assigned_gm_id, activity, 'modified', ['Événement modifié']);
    }

    for (const activity of changeAnalysis.cancellations) {
      // Pour les annulations, notifier l'ancien GM si il y en avait un
      const lastAssignment = formerAssignments.find(a => a.activity_id === activity.id);
      if (lastAssignment) {
        addNotification(lastAssignment.gm_id, activity, 'canceled', ['Événement annulé']);
      }
    }

    for (const activity of changeAnalysis.deassignments) {
      // Pour les désassignations, utiliser l'ancien GM stocké dans former_gm_id ou chercher dans les assignations
      const formerGmId = activity.former_gm_id || 
                        formerAssignments.find(a => a.activity_id === activity.id)?.gm_id;
      
      if (formerGmId) {
        console.log(`📤 Notification de désassignation: ${activity.title} -> ancien GM ${formerGmId}`);
        addNotification(formerGmId, activity, 'unassigned', ['Vous avez été désassigné de cet événement']);
      } else {
        console.warn(`⚠️ Aucun ancien GM trouvé pour la désassignation de: ${activity.title}`);
      }
    }

    const notificationData = Array.from(gmNotifications.values());
    
    console.log(`📋 Prepared notifications for ${notificationData.length} GMs`);

    if (notificationData.length === 0) {
      console.log(`ℹ️ No notifications to send - Reason: No valid GM notifications prepared`);
      console.log(`💡 Debug info: Found ${allGMIds.size} unique GM IDs, retrieved ${gameMasters.length} GM records`);
      console.log(`📊 Change breakdown: ${changeAnalysis.newEvents.length} new, ${changeAnalysis.newAssignments.length} assigned, ${changeAnalysis.modifications.length} modified, ${changeAnalysis.cancellations.length} canceled, ${changeAnalysis.deassignments.length} deassigned`);
      console.log(`📋 Recent activities count: ${recentActivities?.length || 0}, Recent assignments count: ${recentAssignments?.length || 0}`);
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No notifications to send',
        gms_count: 0,
        events_count: 0,
        debug: {
          unique_gm_ids: Array.from(allGMIds),
          retrieved_gms: gameMasters.length,
          activities_analyzed: (recentActivities?.length || 0),
          assignments_analyzed: (recentAssignments?.length || 0),
          change_breakdown: {
            new_events: changeAnalysis.newEvents.length,
            new_assignments: changeAnalysis.newAssignments.length,
            modifications: changeAnalysis.modifications.length,
            cancellations: changeAnalysis.cancellations.length,
            deassignments: changeAnalysis.deassignments.length
          }
        }
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Récupérer la configuration du webhook - Priorité 1: Configuration nommée "Notifications Quotidiennes GM"
    let webhookUrl: string | null = null;
    
    const { data: namedConfig } = await supabaseClient
      .from('api_configurations')
      .select('config')
      .eq('name', 'Notifications Quotidiennes GM')
      .eq('type', 'webhook')
      .eq('is_active', true)
      .single();

    if (namedConfig?.config?.url) {
      webhookUrl = namedConfig.config.url;
      console.log('📡 Using named webhook configuration: Notifications Quotidiennes GM');
    } else {
      // Fallback sur l'ancienne méthode
      const { data: fallbackConfig } = await supabaseClient
        .from('api_configurations')
        .select('config')
        .eq('type', 'make_webhook')
        .eq('is_active', true)
        .single();

      if (fallbackConfig?.config?.webhook_url) {
        webhookUrl = fallbackConfig.config.webhook_url;
        console.log('📡 Using fallback webhook configuration: make_webhook');
      } else {
        // Dernier recours : variable d'environnement
        webhookUrl = Deno.env.get('MAKE_WEBHOOK_URL') || null;
        if (webhookUrl) {
          console.log('📡 Using environment variable MAKE_WEBHOOK_URL');
        }
      }
    }

    if (!webhookUrl) {
      console.error('❌ No webhook URL found in any configuration');
      return new Response(JSON.stringify({ 
        error: 'Webhook not configured',
        message: 'Please configure the webhook URL in admin settings for "Notifications Quotidiennes GM"'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Préparer les données pour Make.com
    const webhookPayload = {
      gms: notificationData,
      summary: {
        total_gms: notificationData.length,
        total_events: notificationData.reduce((sum, gm) => sum + gm.events.length, 0),
        date: now.toISOString().split('T')[0],
        timestamp: now.toISOString(),
        test: test || false
      }
    };

    console.log('📤 Sending to webhook:', webhookUrl);
    console.log('📦 Payload:', JSON.stringify(webhookPayload, null, 2));

    // Envoyer au webhook Make.com
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    });

    if (!webhookResponse.ok) {
      throw new Error(`Webhook failed: ${webhookResponse.status} ${webhookResponse.statusText}`);
    }

    console.log('✅ Successfully sent notifications to Make.com');

    // Logger l'activité
    await supabaseClient
      .from('make_sync_logs')
      .insert([{
        sync_started_at: now.toISOString(),
        sync_completed_at: new Date().toISOString(),
        events_processed: webhookPayload.summary.total_events,
        assignments_made: 0,
        webhook_payload: webhookPayload,
        is_full_snapshot: false,
        status: 'completed',
        calendar_source: 'daily_notifications'
      }]);

    return new Response(JSON.stringify({
      success: true,
      message: 'Notifications sent successfully',
      gms_count: webhookPayload.summary.total_gms,
      events_count: webhookPayload.summary.total_events,
      webhook_status: webhookResponse.status
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Error in daily GM notifications:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);