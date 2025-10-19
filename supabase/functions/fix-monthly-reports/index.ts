import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FixRequest {
  fix_all?: boolean;
  report_id?: string;
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

    const { fix_all = false, report_id }: FixRequest = await req.json();

    console.log(`Starting monthly reports fix. Fix all: ${fix_all}, Report ID: ${report_id}`);

    let fixedReports = 0;
    let errors: string[] = [];

    // Récupérer les rapports à corriger
    let query = supabase
      .from('monthly_reports')
      .select(`
        *,
        game_masters (
          name,
          first_name,
          last_name
        )
      `);

    if (!fix_all && report_id) {
      query = query.eq('id', report_id);
    }

    const { data: manualReports, error: manualError } = await query;

    if (manualError) {
      console.error('Error fetching manual reports:', manualError);
      throw manualError;
    }

    console.log(`Found ${manualReports?.length || 0} reports to process`);

    for (const report of manualReports || []) {
      try {
        const reportData = (report.report_data as any) || {};
        
        // Vérifier s'il y a des activités automatiques manquantes
        const [year, month] = report.month_year.split('-');
        const startDate = `${year}-${month}-01`;
        const endDate = `${year}-${month}-${new Date(parseInt(year), parseInt(month), 0).getDate()}`;

        const { data: activities, error: activitiesError } = await supabase
          .from('activities')
          .select('*')
          .eq('assigned_gm_id', report.gm_id)
          .gte('date', startDate)
          .lte('date', endDate)
          .eq('is_assigned', true);

        if (activitiesError) {
          console.error(`Error fetching activities for report ${report.id}:`, activitiesError);
          errors.push(`Error fetching activities for ${report.id}: ${activitiesError.message}`);
          continue;
        }

        const automaticHours = activities?.reduce((total, activity) => 
          total + (activity.duration / 60), 0
        ) || 0;

        // Si il y a des activités automatiques mais pas dans le rapport, les ajouter
        if (automaticHours > 0 && (!reportData.activities || reportData.activities.length === 0)) {
          console.log(`Fixing report ${report.id} for GM ${report.gm_id} - ${report.month_year}`);
          console.log(`Adding ${activities?.length || 0} activities (${automaticHours.toFixed(2)}h)`);

          const activitiesData = activities?.map(activity => ({
            title: activity.title,
            date: activity.date,
            start_time: activity.start_time,
            end_time: activity.end_time,
            duration: activity.duration / 60,
            type: activity.activity_type
          })) || [];

          const updatedReportData = {
            ...(typeof reportData === 'object' ? reportData : {}),
            activities: activitiesData
          };

          const { error: updateError } = await supabase
            .from('monthly_reports')
            .update({
              report_data: updatedReportData,
              updated_at: new Date().toISOString()
            })
            .eq('id', report.id);

          if (updateError) {
            console.error(`Error updating report ${report.id}:`, updateError);
            errors.push(`Error updating ${report.id}: ${updateError.message}`);
            continue;
          }

          fixedReports++;
          console.log(`✅ Fixed report ${report.id}`);
        } else {
          console.log(`Report ${report.id} is already correct or has no automatic activities`);
        }

      } catch (error) {
        console.error(`Error processing report ${report.id}:`, error);
        errors.push(`Error processing ${report.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const result = {
      success: true,
      fixed_reports: fixedReports,
      total_processed: manualReports?.length || 0,
      errors: errors
    };

    console.log('Fix completed:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error in fix-monthly-reports function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});