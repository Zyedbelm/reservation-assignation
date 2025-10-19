
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportRequest {
  start_date: string;
  end_date: string;
  format?: 'csv' | 'xlsx';
  email_list?: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { start_date, end_date, format = 'csv' }: ReportRequest = await req.json();

    if (!start_date || !end_date) {
      return new Response(
        JSON.stringify({ error: 'start_date and end_date are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer toutes les activités avec leurs assignations multi-GM
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        *,
        game_masters!assigned_gm_id (
          id,
          first_name,
          last_name,
          name,
          email
        ),
        event_assignments!activity_id (
          gm_id,
          status,
          game_masters!gm_id (
            id,
            first_name,
            last_name,
            name,
            email
          )
        )
      `)
      .gte('date', start_date)
      .lte('date', end_date)
      .eq('is_assigned', true)
      .order('date', { ascending: true });

    if (activitiesError) {
      console.error('Error fetching activities:', activitiesError);
      throw activitiesError;
    }

    // Calculer les mois inclus dans la période
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const monthsInRange = [];
    
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (current <= endDate) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, '0');
      monthsInRange.push(`${year}-${month}`);
      current.setMonth(current.getMonth() + 1);
    }
    
    const { data: manualReports, error: manualError } = await supabase
      .from('monthly_reports')
      .select(`
        *,
        game_masters (
          id,
          first_name,
          last_name,
          name,
          email
        )
      `)
      .in('month_year', monthsInRange);

    if (manualError) {
      console.error('Error fetching manual reports:', manualError);
      throw manualError;
    }

    // Fonction pour formater le nom d'un GM
    const formatGMName = (gm: any): string => {
      if (!gm) return 'GM inconnu';
      
      // Priority 1: first_name + last_name
      if (gm.first_name && gm.last_name) {
        return `${gm.first_name} ${gm.last_name}`.trim();
      }
      
      // Priority 2: just first_name
      if (gm.first_name) return gm.first_name;
      
      // Priority 3: just last_name
      if (gm.last_name) return gm.last_name;
      
      // Priority 4: email prefix if email doesn't look like a name
      if (gm.email) {
        const emailPrefix = gm.email.split('@')[0];
        if (emailPrefix) return emailPrefix;
      }
      
      // Fallback: name field
      return gm.name || 'GM inconnu';
    };

    // Grouper par GM et calculer les totaux
    const gmSummary = new Map();

    // Traiter les activités automatiques avec multi-GM
    activities?.forEach((activity) => {
      const hours = activity.duration / 60; // Convertir minutes en heures

      // Créer un Set pour éviter les doublons de GM pour la même activité
      const uniqueGMs = new Set();

      // Récupérer les GMs assignés via event_assignments (multi-GM)
      const eventAssignments = activity.event_assignments
        ?.filter((assignment: any) => 
          assignment.status === 'assigned' || assignment.status === 'confirmed'
        ) || [];

      // Si on a des event_assignments, les utiliser EXCLUSIVEMENT
      if (eventAssignments.length > 0) {
        eventAssignments.forEach((assignment: any) => {
          if (assignment.gm_id && assignment.game_masters) {
            uniqueGMs.add(formatGMName(assignment.game_masters));
          }
        });
      } else if (activity.assigned_gm_id && activity.game_masters) {
        // Fallback vers assigned_gm_id uniquement s'il n'y a pas d'event_assignments
        uniqueGMs.add(formatGMName(activity.game_masters));
      }

      // Log pour debug
      if (activity.title?.includes('Da Vinci Code')) {
        console.log('Da Vinci Code activity:', {
          title: activity.title,
          date: activity.date,
          assigned_gm_id: activity.assigned_gm_id,
          event_assignments: eventAssignments,
          uniqueGMs: Array.from(uniqueGMs)
        });
      }

      uniqueGMs.forEach((gmName: string) => {
        // gmName est déjà défini dans uniqueGMs

        if (!gmSummary.has(gmName)) {
          gmSummary.set(gmName, {
            gm_name: gmName,
            total_hours: 0,
            gaming_hours: 0,
            formation_hours: 0,
            maintenance_hours: 0,
            admin_hours: 0,
            menage_hours: 0,
          });
        }

        const summary = gmSummary.get(gmName);
        summary.total_hours += hours;
        
        switch (activity.activity_type) {
          case 'gaming':
            summary.gaming_hours += hours;
            break;
          case 'formation':
            summary.formation_hours += hours;
            break;
          case 'maintenance':
            summary.maintenance_hours += hours;
            break;
          case 'admin':
            summary.admin_hours += hours;
            break;
          case 'menage':
            summary.menage_hours += hours;
            break;
        }
      });
    });

    // Traiter les ajouts manuels
    manualReports?.forEach((report) => {
      const gmName = formatGMName(report.game_masters);
      const reportData = report.report_data;
      
      if (reportData && reportData.manual_entries && Array.isArray(reportData.manual_entries)) {
        if (!gmSummary.has(gmName)) {
          gmSummary.set(gmName, {
            gm_name: gmName,
            total_hours: 0,
            gaming_hours: 0,
            formation_hours: 0,
            maintenance_hours: 0,
            admin_hours: 0,
            menage_hours: 0,
          });
        }

        const summary = gmSummary.get(gmName);
        
        reportData.manual_entries.forEach((entry: any) => {
          const hours = entry.hours || 0;
          summary.total_hours += hours;
          
          switch (entry.activity_type) {
            case 'gaming':
              summary.gaming_hours += hours;
              break;
            case 'formation':
              summary.formation_hours += hours;
              break;
            case 'maintenance':
              summary.maintenance_hours += hours;
              break;
            case 'admin':
              summary.admin_hours += hours;
              break;
            case 'menage':
              summary.menage_hours += hours;
              break;
          }
        });
      }
    });

    // Log de diagnostic pour voir le contenu exact
    console.log('=== GM Summary avant CSV ===');
    console.log(`Nombre total de GMs: ${gmSummary.size}`);
    for (const [gmName, summary] of gmSummary) {
      console.log(`\n${gmName}:`, {
        total: summary.total_hours,
        gaming: summary.gaming_hours,
        formation: summary.formation_hours,
        maintenance: summary.maintenance_hours,
        admin: summary.admin_hours,
        menage: summary.menage_hours
      });
    }
    console.log('\n=== Fin GM Summary ===\n');

    // Générer le CSV avec seulement le résumé par GM
    const headers = [
      'GM',
      'Heures Totales',
      'Heures Gaming',
      'Heures Formation',
      'Heures Maintenance',
      'Heures Admin',
      'Heures Ménage'
    ];

    const csvLines = [headers.join(',')];
    
    // Ajouter les données de chaque GM
    for (const [, summary] of gmSummary) {
      csvLines.push([
        `"${summary.gm_name}"`,
        summary.total_hours.toFixed(2),
        summary.gaming_hours.toFixed(2),
        summary.formation_hours.toFixed(2),
        summary.maintenance_hours.toFixed(2),
        summary.admin_hours.toFixed(2),
        summary.menage_hours.toFixed(2)
      ].join(','));
    }

    const csvContent = csvLines.join('\n');

    return new Response(csvContent, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="rapport-gm-${start_date}-${end_date}.csv"`
      }
    });

  } catch (error) {
    console.error('Error generating report:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
