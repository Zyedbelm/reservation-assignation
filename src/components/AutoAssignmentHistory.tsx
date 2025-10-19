import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AutoAssignmentTimer from '@/components/sync/AutoAssignmentTimer';
import { toast } from 'sonner';
import { 
  Clock, 
  Bot, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  Zap, 
  User, 
  Info,
  Eye,
  MapPin,
  Users,
  GamepadIcon,
  AlertTriangle
} from 'lucide-react';

interface AutoAssignmentLog {
  id: string;
  triggered_at: string;
  trigger_type: string;
  assignments_made: number;
  events_processed: number;
  success: boolean;
  error_message?: string;
  execution_duration: number;
  created_at: string;
  details?: {
    eventsAnalyzed: number;
    eventDetails: Array<{
      eventId: string;
      title: string;
      date: string;
      startTime: string;
      endTime: string;
      skipReason: string | null;
      eligibleGMs: Array<{
        gmId: string;
        gmName: string;
        competencyLevel: number;
        weight: number;
      }>;
      availableGMs: number;
      gameMapping: {
        gameId: string;
        gameName: string;
        pattern: string;
      } | null;
      assigned: boolean;
      assignedTo: {
        gmId: string;
        gmName: string;
        competencyLevel: number;
      } | null;
    }>;
    categoryCounts: {
      noAvailability: number;
      noGameMapping: number;
      noCompetency: number;
      timeSlotConflict: number;
      scheduleConflict: number;
      assigned: number;
      assignmentError: number;
    };
  };
}

const AutoAssignmentHistory = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [selectedLogDetails, setSelectedLogDetails] = useState<AutoAssignmentLog | null>(null);
  const queryClient = useQueryClient();

  const { data: logs, isLoading, error } = useQuery({
    queryKey: ['auto-assignment-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auto_assignment_logs')
        .select('*')
        .order('triggered_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as AutoAssignmentLog[];
    },
    refetchInterval: 30000,
  });

  const formatDuration = (durationMs: number | null): string => {
    if (!durationMs) return 'N/A';
    if (durationMs < 1000) return `${durationMs}ms`;
    return `${(durationMs / 1000).toFixed(1)}s`;
  };

  const getTriggerInfo = (triggerType: string) => {
    switch (triggerType) {
      case 'auto':
      case 'auto_cron':
        return { icon: Bot, label: 'Automatique', color: 'text-blue-600 border-blue-200' };
      case 'manual':
        return { icon: User, label: 'Manuel', color: 'text-gray-600 border-gray-200' };
      default:
        return { icon: Zap, label: triggerType, color: 'text-purple-600 border-purple-200' };
    }
  };

  const getStatusInfo = (success: boolean) => {
    if (success) {
      return { icon: CheckCircle, label: 'Réussi', color: 'text-green-600 border-green-200' };
    }
    return { icon: XCircle, label: 'Échoué', color: 'text-red-600 border-red-200' };
  };

  const getCategoryInfo = (category: string) => {
    const categoryMap = {
      noAvailability: { icon: Users, label: 'Aucune disponibilité déclarée', color: 'text-orange-600' },
      noGameMapping: { icon: GamepadIcon, label: 'Aucun mapping de jeu trouvé', color: 'text-purple-600' },
      noCompetency: { icon: AlertTriangle, label: 'Aucune compétence ou conflit', color: 'text-yellow-600' },
      timeSlotConflict: { icon: Clock, label: 'Conflit de créneau', color: 'text-red-600' },
      scheduleConflict: { icon: Calendar, label: 'Conflit d\'horaire', color: 'text-red-600' },
      assigned: { icon: CheckCircle, label: 'Assigné avec succès', color: 'text-green-600' },
      assignmentError: { icon: XCircle, label: 'Erreur d\'assignation', color: 'text-red-600' }
    };
    return categoryMap[category] || { icon: Info, label: category, color: 'text-gray-600' };
  };

  // Debug logging when selectedLogDetails changes
  useEffect(() => {
    if (selectedLogDetails?.details) {
      console.log('🐛 Debug selectedLogDetails:', selectedLogDetails);
      console.log('🐛 Debug details:', selectedLogDetails.details);
      console.log('🐛 Debug categoryCounts:', selectedLogDetails.details?.categoryCounts);
      console.log('🐛 Debug eventDetails:', selectedLogDetails.details?.eventDetails);
    }
  }, [selectedLogDetails]);

  const handleAutoAssignment = async () => {
    setIsRunning(true);
    try {
      console.log('🚀 Déclenchement manuel de l\'auto-assignation...');
      
      const { data, error } = await supabase.functions.invoke('auto-assign-gms', {
        body: { 
          trigger: 'manual',
          source: 'auto_assignment_history'
        }
      });

      if (error) {
        console.error('❌ Erreur lors de l\'auto-assignation:', error);
        toast.error(`Erreur d'assignation: ${error.message}`);
      } else {
        console.log('✅ Auto-assignation réussie:', data);
        
        await queryClient.invalidateQueries({ queryKey: ['auto-assignment-logs'] });
        await queryClient.invalidateQueries({ queryKey: ['activities'] });
        
        if (data.success) {
          toast.success(`${data.assignments || 0} assignation(s) effectuée(s) sur ${data.eventsProcessed || 0} événement(s)`);
        } else {
          toast.error(data.error || "Erreur lors de l'auto-assignation");
        }
      }
    } catch (error) {
      console.error('💥 Erreur inattendue:', error);
      toast.error("Une erreur inattendue s'est produite");
    } finally {
      setIsRunning(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Historique Auto-Assignation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Chargement de l'historique...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Historique Auto-Assignation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-600">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p>Erreur lors du chargement de l'historique</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Historique Auto-Assignation
        </CardTitle>
        <CardDescription>
          Historique des exécutions automatiques toutes les 6 heures (dernières 50 entrées)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Auto Assignment Timer Section */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-800 mb-1 flex items-center gap-2">
                <Bot className="w-4 h-4" />
                Auto-Assignation Automatique
              </h4>
              <p className="text-sm text-blue-600">
                Auto-assignation automatique toutes les 6 heures (décalée de 30 min)
              </p>
            </div>
            <AutoAssignmentTimer />
          </div>
        </div>

        {/* Bouton d'auto-assignation manuelle */}
        <div className="flex justify-center mb-6">
          <Button
            onClick={handleAutoAssignment}
            disabled={isRunning}
            size="lg"
            className="px-8 py-4 text-lg font-semibold"
          >
            {isRunning ? (
              <>
                <Users className="w-5 h-5 mr-2 animate-spin" />
                Attribution en cours...
              </>
            ) : (
              <>
                <Users className="w-5 h-5 mr-2" />
                Lancer Auto-Assignation Manuelle
              </>
            )}
          </Button>
        </div>

        {!logs || logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Aucun historique d'auto-assignation</p>
            <p className="text-sm mt-1">Les exécutions automatiques apparaîtront ici</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Statistiques rapides */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="font-semibold text-blue-700">
                  {logs.filter(log => log.success).length}
                </div>
                <div className="text-sm text-blue-600">Succès</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="font-semibold text-red-700">
                  {logs.filter(log => !log.success).length}
                </div>
                <div className="text-sm text-red-600">Échecs</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="font-semibold text-green-700">
                  {logs.reduce((sum, log) => sum + (log.assignments_made || 0), 0)}
                </div>
                <div className="text-sm text-green-600">Assignations totales</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="font-semibold text-purple-700">
                  {logs.reduce((sum, log) => sum + (log.events_processed || 0), 0)}
                </div>
                <div className="text-sm text-purple-600">Événements traités</div>
              </div>
            </div>

            {/* Table d'historique */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Heure</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Événements</TableHead>
                  <TableHead>Assignations</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Détails</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const triggerInfo = getTriggerInfo(log.trigger_type);
                  const statusInfo = getStatusInfo(log.success);
                  const TriggerIcon = triggerInfo.icon;
                  const StatusIcon = statusInfo.icon;

                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="font-medium">
                              {new Date(log.triggered_at).toLocaleDateString('fr-FR')}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(log.triggered_at).toLocaleTimeString('fr-FR')}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={triggerInfo.color}>
                          <TriggerIcon className="w-3 h-3 mr-1" />
                          {triggerInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusInfo.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{log.events_processed || 0}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-green-600">
                          {log.assignments_made || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-600">
                          {formatDuration(log.execution_duration)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {log.error_message ? (
                            <div className="text-xs text-red-600 max-w-xs truncate" title={log.error_message}>
                              {log.error_message}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                          {log.details && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLogDetails(log)}
                              className="h-6 px-2 text-xs"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Détails
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Details Dialog */}
        <Dialog open={!!selectedLogDetails} onOpenChange={() => setSelectedLogDetails(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                Détails de l'exécution - {selectedLogDetails && new Date(selectedLogDetails.triggered_at).toLocaleString('fr-FR')}
              </DialogTitle>
              <DialogDescription>
                Analyse détaillée de l'auto-assignation avec raisons de skip par événement
              </DialogDescription>
            </DialogHeader>
            
            {selectedLogDetails?.details && (
              <div className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-blue-600">Événements analysés</div>
                    <div className="text-2xl font-bold text-blue-700">{selectedLogDetails.details?.eventsAnalyzed || 0}</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-green-600">Assignés</div>
                    <div className="text-2xl font-bold text-green-700">{selectedLogDetails.details?.categoryCounts?.assigned || 0}</div>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-orange-600">Non assignés</div>
                    <div className="text-2xl font-bold text-orange-700">
                      {(selectedLogDetails.details?.eventsAnalyzed || 0) - (selectedLogDetails.details?.categoryCounts?.assigned || 0)}
                    </div>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-purple-600">Taux de succès</div>
                    <div className="text-2xl font-bold text-purple-700">
                      {(selectedLogDetails.details?.eventsAnalyzed || 0) > 0 
                        ? Math.round(((selectedLogDetails.details?.categoryCounts?.assigned || 0) / (selectedLogDetails.details?.eventsAnalyzed || 1)) * 100)
                        : 0}%
                    </div>
                  </div>
                </div>

                {/* Category Breakdown */}
                <div>
                  <h4 className="font-medium mb-3">Répartition par catégorie</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedLogDetails.details?.categoryCounts && Object.entries(selectedLogDetails.details.categoryCounts).map(([category, count]) => {
                      if (count === 0) return null;
                      const categoryInfo = getCategoryInfo(category);
                      const CategoryIcon = categoryInfo.icon;
                      return (
                        <div key={category} className="flex items-center gap-2 p-2 border rounded">
                          <CategoryIcon className={`w-4 h-4 ${categoryInfo.color}`} />
                          <span className="text-sm">{categoryInfo.label}</span>
                          <Badge variant="secondary" className="ml-auto">{count}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Event Details */}
                <div>
                  <h4 className="font-medium mb-3">Détails par événement</h4>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {selectedLogDetails.details?.eventDetails?.filter(event => event != null).map((event, index) => {
                      console.log('🐛 Debug event:', event, 'assigned:', event?.assigned);
                      return (
                        <div key={event?.eventId || index} className="border rounded-lg p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h5 className="font-medium">{event?.title || 'Événement sans titre'}</h5>
                              <p className="text-sm text-gray-600">
                                {event?.date || 'N/A'} • {event?.startTime || 'N/A'} - {event?.endTime || 'N/A'}
                              </p>
                            </div>
                            {event?.assigned === true ? (
                              <Badge className="bg-green-100 text-green-700">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Assigné
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="w-3 h-3 mr-1" />
                                Non assigné
                              </Badge>
                            )}
                          </div>
                          
                          {event?.gameMapping && (
                            <div className="text-sm text-gray-600 mb-2">
                              <GamepadIcon className="w-3 h-3 inline mr-1" />
                              Jeu: {event.gameMapping.gameName} (pattern: "{event.gameMapping.pattern}")
                            </div>
                          )}
                          
                          {event?.assigned === true && event?.assignedTo ? (
                            <div className="text-sm text-green-700">
                              <User className="w-3 h-3 inline mr-1" />
                              Assigné à: {event.assignedTo.gmName} (niveau: {event.assignedTo.competencyLevel})
                            </div>
                          ) : event?.skipReason ? (
                            <div className="text-sm text-red-600">
                              <AlertCircle className="w-3 h-3 inline mr-1" />
                              Raison: {event.skipReason}
                            </div>
                          ) : null}
                          
                          {(event?.availableGMs || 0) > 0 && (
                            <div className="text-sm text-gray-600">
                              <Users className="w-3 h-3 inline mr-1" />
                              {event.availableGMs} GM(s) disponible(s), {event?.eligibleGMs?.length || 0} éligible(s)
                            </div>
                          )}
                          
                          {(event?.eligibleGMs?.length || 0) > 0 && (
                            <div className="mt-2">
                              <div className="text-xs text-gray-500 mb-1">GMs éligibles:</div>
                              <div className="flex flex-wrap gap-1">
                                {event.eligibleGMs?.map((gm, gmIndex) => (
                                  <Badge key={gmIndex} variant="outline" className="text-xs">
                                    {gm?.gmName || 'GM inconnu'} (niv. {gm?.competencyLevel || 0})
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    }) || []}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default AutoAssignmentHistory;