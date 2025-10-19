import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatGMName } from '@/utils/gmNameFormatter';

interface ReportInconsistency {
  gm_id: string;
  gm_name: string;
  month_year: string;
  manual_report_id: string;
  automatic_hours: number;
  manual_hours: number;
  missing_activities: boolean;
  activities_count: number;
}

const MonthlyReportDiagnostic = () => {
  const [inconsistencies, setInconsistencies] = useState<ReportInconsistency[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);

  const analyzeReports = async () => {
    setIsAnalyzing(true);
    try {
      // Récupérer tous les rapports manuels
      const { data: manualReports, error: manualError } = await supabase
        .from('monthly_reports')
        .select(`
          *,
          game_masters (
            name,
            first_name,
            last_name
          )
        `);

      if (manualError) throw manualError;

      const problems: ReportInconsistency[] = [];

      for (const report of manualReports || []) {
        const reportData = (report.report_data as any) || {};
        
        // Vérifier s'il y a des activités automatiques pour ce GM et cette période
        const [year, month] = report.month_year.split('-');
        const startDate = `${year}-${month}-01`;
        const endDate = `${year}-${month}-${new Date(parseInt(year), parseInt(month), 0).getDate()}`;

        const { data: activities } = await supabase
          .from('activities')
          .select('*')
          .eq('assigned_gm_id', report.gm_id)
          .gte('date', startDate)
          .lte('date', endDate)
          .eq('is_assigned', true);

        const automaticHours = activities?.reduce((total, activity) => 
          total + (activity.duration / 60), 0
        ) || 0;

        const manualHours = reportData.manual_entries?.reduce((total: number, entry: any) => 
          total + (entry.hours || 0), 0
        ) || 0;

        // Détecter les problèmes
        const hasActivitiesButNoReportData = automaticHours > 0 && !reportData.activities;
        const hasInconsistentData = automaticHours > 0 && reportData.activities && 
          reportData.activities.length !== activities?.length;

        if (hasActivitiesButNoReportData || hasInconsistentData) {
          problems.push({
            gm_id: report.gm_id,
            gm_name: formatGMName(report.game_masters || {}),
            month_year: report.month_year,
            manual_report_id: report.id,
            automatic_hours: automaticHours,
            manual_hours: manualHours,
            missing_activities: hasActivitiesButNoReportData,
            activities_count: activities?.length || 0
          });
        }
      }

      setInconsistencies(problems);
      
      if (problems.length === 0) {
        toast({
          title: "Analyse terminée",
          description: "Aucune incohérence détectée dans les rapports mensuels"
        });
      } else {
        toast({
          title: "Analyse terminée",
          description: `${problems.length} incohérence(s) détectée(s)`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erreur lors de l\'analyse:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'analyser les rapports",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const fixInconsistency = async (inconsistency: ReportInconsistency) => {
    try {
      // Récupérer les activités automatiques
      const [year, month] = inconsistency.month_year.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = `${year}-${month}-${new Date(parseInt(year), parseInt(month), 0).getDate()}`;

      const { data: activities } = await supabase
        .from('activities')
        .select('*')
        .eq('assigned_gm_id', inconsistency.gm_id)
        .gte('date', startDate)
        .lte('date', endDate)
        .eq('is_assigned', true);

      // Récupérer le rapport manuel existant
      const { data: existingReport } = await supabase
        .from('monthly_reports')
        .select('*')
        .eq('id', inconsistency.manual_report_id)
        .single();

      if (!existingReport) return;

      const reportData = (existingReport.report_data as any) || {};
      
      // Construire les données d'activités
      const activitiesData = activities?.map(activity => ({
        title: activity.title,
        date: activity.date,
        start_time: activity.start_time,
        end_time: activity.end_time,
        duration: activity.duration / 60,
        type: activity.activity_type
      })) || [];

      // Mettre à jour le rapport avec les activités automatiques
      const updatedReportData = {
        ...(typeof reportData === 'object' ? reportData : {}),
        activities: activitiesData
      };

      const { error } = await supabase
        .from('monthly_reports')
        .update({
          report_data: updatedReportData,
          updated_at: new Date().toISOString()
        })
        .eq('id', inconsistency.manual_report_id);

      if (error) throw error;

      toast({
        title: "Rapport corrigé",
        description: `Le rapport de ${inconsistency.gm_name} pour ${inconsistency.month_year} a été corrigé`
      });

      // Retirer de la liste des incohérences
      setInconsistencies(prev => prev.filter(item => item.manual_report_id !== inconsistency.manual_report_id));

    } catch (error) {
      console.error('Erreur lors de la correction:', error);
      toast({
        title: "Erreur",
        description: "Impossible de corriger le rapport",
        variant: "destructive"
      });
    }
  };

  const fixAllInconsistencies = async () => {
    setIsFixing(true);
    try {
      for (const inconsistency of inconsistencies) {
        await fixInconsistency(inconsistency);
      }
      toast({
        title: "Corrections terminées",
        description: "Toutes les incohérences ont été corrigées"
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors des corrections",
        variant: "destructive"
      });
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Diagnostic des Rapports Mensuels
        </CardTitle>
        <CardDescription>
          Détecte et corrige les incohérences entre les activités automatiques et les rapports manuels
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={analyzeReports} 
            disabled={isAnalyzing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {isAnalyzing ? 'Analyse en cours...' : 'Analyser les rapports'}
          </Button>
          
          {inconsistencies.length > 0 && (
            <Button 
              onClick={fixAllInconsistencies}
              disabled={isFixing}
              variant="outline"
            >
              {isFixing ? 'Correction...' : `Corriger tout (${inconsistencies.length})`}
            </Button>
          )}
        </div>

        {inconsistencies.length === 0 && !isAnalyzing && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Aucune incohérence détectée. Cliquez sur "Analyser" pour vérifier à nouveau.
            </AlertDescription>
          </Alert>
        )}

        {inconsistencies.length > 0 && (
          <div className="space-y-3">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {inconsistencies.length} incohérence(s) détectée(s) dans les rapports mensuels
              </AlertDescription>
            </Alert>

            {inconsistencies.map((item) => (
              <Card key={item.manual_report_id} className="border-l-4 border-l-destructive">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{item.gm_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.month_year} • {item.activities_count} activités automatiques ({item.automatic_hours.toFixed(1)}h)
                      </div>
                      <div className="flex gap-2 mt-2">
                        {item.missing_activities && (
                          <Badge variant="destructive">Activités manquantes</Badge>
                        )}
                        {item.manual_hours > 0 && (
                          <Badge variant="secondary">{item.manual_hours}h manuelles</Badge>
                        )}
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      onClick={() => fixInconsistency(item)}
                      disabled={isFixing}
                    >
                      Corriger
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MonthlyReportDiagnostic;