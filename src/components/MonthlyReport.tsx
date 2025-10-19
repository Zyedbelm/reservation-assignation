
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Download, Eye, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useMonthlyReports, useExportMonthlyReports } from '@/hooks/useMonthlyReports';
import { useGameMasters } from '@/hooks/useGameMasters';
import AddManualHoursDialog from './AddManualHoursDialog';
import DateRangeSelector from './DateRangeSelector';
import ReportSummaryTable from './ReportSummaryTable';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { toast } from '@/hooks/use-toast';
import { formatGMName } from '@/utils/gmNameFormatter';

const MonthlyReport = () => {
  const [startDate, setStartDate] = useState<Date>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [endDate, setEndDate] = useState<Date>(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
  );
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());
  const [isPeriodValidated, setIsPeriodValidated] = useState(false);

  const startDateStr = startDate ? format(startDate, 'yyyy-MM-dd') : '';
  const endDateStr = endDate ? format(endDate, 'yyyy-MM-dd') : '';

  const { data: reports = [], refetch } = useMonthlyReports(
    isPeriodValidated ? startDateStr : undefined, 
    isPeriodValidated ? endDateStr : undefined
  );
  const { data: gameMasters = [] } = useGameMasters();
  const exportReports = useExportMonthlyReports();

  const validatePeriod = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une date de début et de fin",
        variant: "destructive"
      });
      return;
    }

    if (startDate > endDate) {
      toast({
        title: "Erreur",
        description: "La date de début doit être antérieure à la date de fin",
        variant: "destructive"
      });
      return;
    }

    setIsPeriodValidated(true);
    await refetch();
    
    toast({
      title: "Période validée",
      description: "Les rapports ont été chargés pour la période sélectionnée"
    });
  };

  const resetPeriod = () => {
    setIsPeriodValidated(false);
  };

  const toggleReportExpansion = (reportId: string) => {
    const newExpanded = new Set(expandedReports);
    if (newExpanded.has(reportId)) {
      newExpanded.delete(reportId);
    } else {
      newExpanded.add(reportId);
    }
    setExpandedReports(newExpanded);
  };

  const handleExport = async () => {
    if (!startDateStr || !endDateStr) {
      toast({
        title: "Erreur",
        description: "Veuillez valider une période",
        variant: "destructive"
      });
      return;
    }

    try {
      await exportReports.mutateAsync({ startDate: startDateStr, endDate: endDateStr });
      toast({
        title: "Export réussi",
        description: "Le fichier CSV a été téléchargé"
      });
    } catch (error) {
      toast({
        title: "Erreur d'export",
        description: "Impossible d'exporter les données",
        variant: "destructive"
      });
    }
  };

  // Calculer le mois/année pour le dialog d'ajout manuel
  const selectedMonthYear = startDate ? format(startDate, 'yyyy-MM') : '';

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-green-600" />
          Rapport Mensuel
        </CardTitle>
        <CardDescription>
          Résumé des heures et activités des Game Masters
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Sélection de la période */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Sélection de la période</h3>
            <DateRangeSelector
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
            
            <div className="flex gap-2 flex-wrap">
              <AddManualHoursDialog selectedMonthYear={selectedMonthYear} />
              {!isPeriodValidated ? (
                <Button 
                  onClick={validatePeriod}
                  className="flex items-center gap-2"
                  disabled={!startDate || !endDate}
                >
                  <CheckCircle className="w-4 h-4" />
                  Valider la période
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  onClick={resetPeriod}
                  className="flex items-center gap-2"
                >
                  Modifier la période
                </Button>
              )}
            </div>

            {isPeriodValidated && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">
                  Période validée : du {startDate?.toLocaleDateString('fr-FR')} au {endDate?.toLocaleDateString('fr-FR')}
                </p>
              </div>
            )}
          </div>

          {/* Export disponible après validation */}
          {isPeriodValidated && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                onClick={handleExport}
                disabled={exportReports.isPending || reports.length === 0}
              >
                <Download className="w-4 h-4" />
                {exportReports.isPending ? 'Export...' : 'Exporter'}
              </Button>
            </div>
          )}

          {/* Tableau récapitulatif - affiché seulement après validation */}
          {isPeriodValidated && reports.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Tableau récapitulatif par GM</h3>
              <ReportSummaryTable reports={reports} />
            </div>
          )}

          {/* Message si aucun rapport après validation */}
          {isPeriodValidated && reports.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                Aucun rapport généré pour la période sélectionnée
              </p>
            </div>
          )}

          {/* Liste détaillée des rapports */}
          {isPeriodValidated && reports.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Détails par rapport</h3>
              {reports.map((report) => (
                <div key={report.id} className="border rounded-lg overflow-hidden">
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-medium">
                        {formatGMName(report.game_masters || {})} - {report.month_year}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {Number(report.total_hours).toFixed(2)}h total
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleReportExpansion(report.id)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          Détails
                        </Button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Gaming:</span>
                        <span className="ml-2 font-medium">{Number(report.gaming_hours).toFixed(2)}h</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Formation:</span>
                        <span className="ml-2 font-medium">{Number(report.formation_hours).toFixed(2)}h</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Maintenance:</span>
                        <span className="ml-2 font-medium">{Number(report.maintenance_hours).toFixed(2)}h</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Admin:</span>
                        <span className="ml-2 font-medium">{Number(report.admin_hours).toFixed(2)}h</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Travaux informatiques:</span>
                        <span className="ml-2 font-medium">{Number(report.travaux_informatiques_hours).toFixed(2)}h</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Ménage:</span>
                        <span className="ml-2 font-medium">{Number(report.menage_hours).toFixed(2)}h</span>
                      </div>
                    </div>
                  </div>

                  <Collapsible open={expandedReports.has(report.id)}>
                    <CollapsibleContent>
                      <div className="px-4 pb-4 border-t bg-gray-50">
                        <div className="pt-4">
                          <h5 className="text-sm font-medium mb-3">Détails du rapport</h5>
                          
                          {/* Liste des événements/activités */}
                          {report.report_data && 
                           typeof report.report_data === 'object' && 
                           !Array.isArray(report.report_data) &&
                           'activities' in report.report_data && 
                           Array.isArray(report.report_data.activities) && 
                           report.report_data.activities.length > 0 && (
                            <div className="mb-4">
                              <h6 className="text-xs font-medium text-gray-700 mb-2">Événements associés ({report.report_data.activities.length})</h6>
                              <div className="space-y-2 max-h-60 overflow-y-auto">
                                {report.report_data.activities.map((activity: any, index: number) => (
                                  <div key={index} className="text-xs bg-white p-2 rounded border">
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1">
                                        <div className="font-medium">{activity.title}</div>
                                        <div className="text-gray-500 mt-1">
                                          {new Date(activity.date).toLocaleDateString('fr-FR')} - {activity.start_time} à {activity.end_time}
                                        </div>
                                        <div className="text-gray-600 mt-1">
                                          Type: {activity.type}
                                        </div>
                                      </div>
                                      <div className="ml-2 text-right">
                                        <span className="font-medium">{Number(activity.duration).toFixed(2)}h</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Ajouts manuels */}
                          {report.report_data && 
                           typeof report.report_data === 'object' && 
                           !Array.isArray(report.report_data) &&
                           'manual_entries' in report.report_data && 
                           Array.isArray(report.report_data.manual_entries) && 
                           report.report_data.manual_entries.length > 0 && (
                            <div className="mb-4">
                              <h6 className="text-xs font-medium text-gray-700 mb-2">Ajouts manuels ({report.report_data.manual_entries.length})</h6>
                              <div className="space-y-2">
                                {report.report_data.manual_entries.map((entry: any, index: number) => (
                                  <div key={index} className="text-xs bg-white p-2 rounded border">
                                     <div className="flex justify-between">
                                       <span>{entry.description}</span>
                                       <span className="font-medium">{Number(entry.hours).toFixed(2)}h</span>
                                     </div>
                                    <div className="text-gray-500 mt-1">
                                      {new Date(entry.date).toLocaleDateString('fr-FR')} - {entry.activity_type}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="text-gray-600">Créé le:</span>
                              <span className="ml-2">{new Date(report.created_at).toLocaleDateString('fr-FR')}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Modifié le:</span>
                              <span className="ml-2">{new Date(report.updated_at).toLocaleDateString('fr-FR')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlyReport;
