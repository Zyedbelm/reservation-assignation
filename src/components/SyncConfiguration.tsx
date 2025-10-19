
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertTriangle, Calendar, RefreshCw, Settings, Zap, Clock, Activity, TrendingUp, CheckCircle, Timer, User, Bot, Search, Shield } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AutoSyncTimer from './sync/AutoSyncTimer';

const SyncConfiguration = () => {
  const queryClient = useQueryClient();
  const [syncStartDate, setSyncStartDate] = useState('');
  const [syncEndDate, setSyncEndDate] = useState('');
  const [cleanDuplicatesAfterSync, setCleanDuplicatesAfterSync] = useState(true);

  const { data: syncLogs, isLoading: isLogsLoading } = useQuery({
    queryKey: ['sync-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('make_sync_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    }
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      // Calculer les dates par défaut si non remplies
      const today = new Date();
      const threeMonthsLater = new Date();
      threeMonthsLater.setMonth(today.getMonth() + 3);
      
      const startDate = syncStartDate || today.toISOString().split('T')[0];
      const endDate = syncEndDate || threeMonthsLater.toISOString().split('T')[0];
      
      const { data, error } = await supabase.functions.invoke('sync-make-calendar', {
        body: {
          startDate,
          endDate,
          trigger: 'manual',
          source: 'sync_configuration',
          clean_duplicates: cleanDuplicatesAfterSync
        }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['sync-logs'] });
    },
    onError: () => {
      // Erreur gérée silencieusement
    }
  });

  const handleSync = () => {
    syncMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          Synchronisation Intelligente
        </CardTitle>
        <CardDescription>
          Synchronisation avancée avec Make.com et Google Calendar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="sync" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sync" className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Synchronisation
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Historique
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sync" className="space-y-6">
            <div className="space-y-4">
              {/* Configuration des dates de synchronisation */}
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-3">Période de synchronisation (optionnel)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sync-start-date">Date de début</Label>
                    <Input
                      id="sync-start-date"
                      type="date"
                      value={syncStartDate}
                      onChange={(e) => setSyncStartDate(e.target.value)}
                      placeholder="Aujourd'hui par défaut"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sync-end-date">Date de fin</Label>
                    <Input
                      id="sync-end-date"
                      type="date"
                      value={syncEndDate}
                      onChange={(e) => setSyncEndDate(e.target.value)}
                      placeholder="Aujourd'hui + 3 mois par défaut"
                    />
                  </div>
                </div>
                <p className="text-sm text-yellow-700 mt-2">
                  Si non renseignées, la synchronisation couvre aujourd'hui à aujourd'hui + 3 mois
                </p>

                {/* Case à cocher pour nettoyer les doublons */}
                <div className="flex items-center space-x-2 mt-4">
                  <Checkbox 
                    id="clean-duplicates" 
                    checked={cleanDuplicatesAfterSync} 
                    onCheckedChange={(checked) => setCleanDuplicatesAfterSync(!!checked)}
                  />
                  <label htmlFor="clean-duplicates" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Nettoyer les doublons automatiquement après la sync
                  </label>
                </div>
              </div>

              {/* Bouton de synchronisation */}
              <div className="flex justify-center pt-4">
                <Button
                  onClick={handleSync}
                  disabled={syncMutation.isPending}
                  size="lg"
                  className="px-8 py-4 text-lg font-semibold"
                >
                  {syncMutation.isPending ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                      Synchronisation en cours...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 mr-2" />
                      Synchroniser le Calendrier
                    </>
                  )}
                </Button>
              </div>

              {/* Présentation de la synchronisation */}
              <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-blue-600" />
                  Synchronisation Intelligente v2.0
                </h3>
                <p className="text-blue-800 mb-4">
                  Notre système de synchronisation analyse automatiquement les changements dans votre calendrier Google 
                  et met à jour uniquement les événements modifiés, créés ou supprimés.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      Détection des changements
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      Synchronisation différentielle
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      Gestion des suppressions
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      Attribution intelligente des GM
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      Logs détaillés
                    </div>
                    <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      Performance optimisée
                    </div>
                  </div>
                </div>
              </div>

              {/* Fonctionnalités avancées */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <h4 className="font-medium text-green-800">Sync Différentielle</h4>
                  </div>
                  <p className="text-sm text-green-700">
                    Ne traite que les événements modifiés, évitant les traitements inutiles
                  </p>
                </div>

                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-5 h-5 text-purple-600" />
                    <h4 className="font-medium text-purple-800">Attribution Smart</h4>
                  </div>
                  <p className="text-sm text-purple-700">
                    Désassigne les GM uniquement si nécessaire, préserve les assignations stables
                  </p>
                </div>

                <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <RefreshCw className="w-5 h-5 text-orange-600" />
                    <h4 className="font-medium text-orange-800">Traitement Batch</h4>
                  </div>
                  <p className="text-sm text-orange-700">
                    Traite plusieurs événements en parallèle pour une synchronisation rapide
                  </p>
                </div>
              </div>

              {/* Auto Sync Timer Section */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-blue-800 mb-1 flex items-center gap-2">
                      <Timer className="w-4 h-4" />
                      Synchronisation Automatique
                    </h4>
                    <p className="text-sm text-blue-600">
                      Synchronisation automatique toutes les 6 heures
                    </p>
                  </div>
                  <AutoSyncTimer />
                </div>
              </div>

              {/* Informations complémentaires */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-gray-800 mb-2">Comment ça fonctionne ?</h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>1. <strong>Analyse :</strong> Le système récupère les événements de votre calendrier Google</p>
                  <p>2. <strong>Comparaison :</strong> Compare avec les événements existants dans la base</p>
                  <p>3. <strong>Traitement :</strong> Crée, met à jour ou supprime uniquement les événements modifiés</p>
                  <p>4. <strong>Attribution :</strong> Propose automatiquement l'attribution aux GM disponibles</p>
                  <p>5. <strong>Rapport :</strong> Génère un rapport détaillé des changements effectués</p>
                </div>
              </div>
            </div>
          </TabsContent>


          <TabsContent value="logs" className="space-y-4">
            {isLogsLoading ? (
              <div className="text-center">Chargement de l'historique...</div>
            ) : (
              <div className="space-y-2">
                {syncLogs?.map((log) => {
                  const webhook = log.webhook_payload as any;
                  const isAutoSync = webhook?.trigger === 'auto_scheduler';
                  const TriggerIcon = isAutoSync ? Bot : User;
                  const triggerText = isAutoSync ? 'Auto' : 'Manuel';
                  
                  return (
                    <div key={log.id} className="border rounded-md p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-sm text-gray-600">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            {new Date(log.created_at).toLocaleDateString()}
                            <span className="ml-2">
                              <Clock className="w-4 h-4 inline mr-1" />
                              {new Date(log.created_at).toLocaleTimeString()}
                            </span>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${isAutoSync ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}
                          >
                            <TriggerIcon className="w-3 h-3 mr-1" />
                            {triggerText}
                          </Badge>
                        </div>
                        <Badge variant="secondary">
                          {log.status === 'completed' ? 'Succès' : log.status === 'in_progress' ? 'En cours' : 'Échec'}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700 mt-1">
                        {log.events_processed} événements traités - {log.events_created} créés - {log.events_updated} mis à jour
                      </p>
                    </div>
                  );
                })}
                {(!syncLogs || syncLogs.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Aucun historique de synchronisation</p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default SyncConfiguration;
