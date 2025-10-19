import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Calendar, RefreshCw, Shield, Eye, Activity, Users, X } from 'lucide-react';
import DateRangeSelector from '../DateRangeSelector';

interface SyncActionsProps {
  syncPeriodMonths: number;
}

interface ReconciliationStats {
  wouldCancel?: string[];
  canceled?: string[];
  ignoredAssigned?: string[];
  auditMode?: boolean;
}

const SyncActions = ({ syncPeriodMonths }: SyncActionsProps) => {
  const [isEnhancedSyncing, setIsEnhancedSyncing] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [auditOnly, setAuditOnly] = useState(false);
  const [forceReconcile, setForceReconcile] = useState(false);
  const [calendarSource, setCalendarSource] = useState<string>('all');
  const [reconciliationStats, setReconciliationStats] = useState<ReconciliationStats | null>(null);
  const [useCustomDateRange, setUseCustomDateRange] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>();
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>();
  const [cleanDuplicatesAfterSync, setCleanDuplicatesAfterSync] = useState(true);
  const { toast } = useToast();

  const waitForSyncCompletion = async (syncStartTime: string): Promise<any> => {
    console.log('⏳ Attente de la fin de synchronisation...');
    
    // Attendre 45 secondes pour laisser le temps au webhook de traiter
    await new Promise(resolve => setTimeout(resolve, 45000));
    
    // Récupérer les logs de synchronisation créés après notre déclenchement
    const { data: syncLogs, error } = await supabase
      .from('make_sync_logs')
      .select('*')
      .gte('created_at', syncStartTime)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('❌ Erreur lors de la récupération des logs:', error);
      return null;
    }

    return syncLogs;
  };

  const triggerEnhancedSync = async () => {
    setIsEnhancedSyncing(true);
    setReconciliationStats(null);
    
    try {
      const syncStartTime = new Date().toISOString();
      
      const actionText = auditOnly ? "Audit" : forceReconcile ? "Réconciliation sécurisée" : "Synchronisation intelligente";
      
      toast({
        title: `${actionText} démarré${auditOnly ? '' : 'e'}`,
        description: "Traitement des événements en cours...",
      });

      // Préparer les dates pour l'envoi
      let requestBody: any = {
        syncPeriodMonths,
        triggerSource: auditOnly ? 'manual_audit' : forceReconcile ? 'manual_reconcile' : 'manual_enhanced',
        syncStartTime,
        auditOnly,
        forceReconcile,
        calendarSource: calendarSource === 'all' ? undefined : calendarSource,
        enhanced_features: {
          batch_processing: true,
          improved_validation: true,
          better_error_handling: true,
          detailed_logging: true,
          differential_sync: !forceReconcile // Disable diff for reconcile mode
        },
        clean_duplicates: cleanDuplicatesAfterSync
      }
      
      // Ajouter les dates personnalisées si définies
      if (useCustomDateRange && customStartDate && customEndDate) {
        requestBody.startDate = customStartDate.toISOString();
        requestBody.endDate = customEndDate.toISOString();
      }

      const { data, error } = await supabase.functions.invoke('sync-make-calendar', {
        body: requestBody
      });

      if (error) {
        throw error;
      }

      // Wait a moment for the sync to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Wait for sync completion
      const syncResult = await waitForSyncCompletion(syncStartTime);
      
      if (syncResult) {
        const stats = syncResult.webhook_payload?.processing_stats || {};
        const reconcileStats = syncResult.webhook_payload?.reconciliation_stats || {};
        
        if (auditOnly) {
          setReconciliationStats({
            wouldCancel: reconcileStats.would_cancel || [],
            auditMode: true
          });
          toast({
            title: "🔍 Audit terminé",
            description: `${reconcileStats.would_cancel?.length || 0} événements seraient annulés`,
            duration: 5000,
          });
        } else if (forceReconcile) {
          setReconciliationStats({
            canceled: reconcileStats.canceled || [],
            ignoredAssigned: reconcileStats.ignored_assigned || [],
            auditMode: false
          });
          toast({
            title: "🔄 Réconciliation terminée",
            description: `${reconcileStats.canceled?.length || 0} annulés, ${reconcileStats.ignored_assigned?.length || 0} ignorés (assignés)`,
            duration: 5000,
          });
        } else {
          const totalChanges = stats.created + stats.updated + (stats.deleted || 0);
          const successRate = stats.total_received > 0 ? ((totalChanges / stats.total_received) * 100).toFixed(1) : '0';
          
          toast({
            title: "✅ Synchronisation intelligente terminée",
            description: `${stats.created || 0} créés, ${stats.updated || 0} mis à jour, ${stats.errors || 0} erreurs - ${successRate}% succès`,
            duration: 5000,
          });
        }
      } else {
        toast({
          title: `${actionText} lancé${auditOnly ? '' : 'e'}`,
          description: "Le processus est en cours, vérifiez les logs pour le statut",
        });
      }
    } catch (error) {
      console.error('Error triggering enhanced sync:', error);
      toast({
        title: `Erreur ${auditOnly ? "d'audit" : forceReconcile ? "de réconciliation" : "de synchronisation"}`,
        description: error.message || "Une erreur s'est produite",
        variant: "destructive",
      });
    } finally {
      setIsEnhancedSyncing(false);
    }
  };

  const triggerManualAssignment = async () => {
    setIsAssigning(true);
    
    try {
      console.log('🚀 [AUTO-ASSIGN] Déclenchement manuel de l\'auto-assignation...');
      
      const { data, error } = await supabase.functions.invoke('auto-assign-gms', {
        body: { 
          trigger: 'manual',
          source: 'sync_actions',
          timestamp: new Date().toISOString()
        }
      });

      if (error) {
        console.error('❌ [AUTO-ASSIGN] Erreur lors de l\'auto-assignation manuelle:', error);
        toast({
          title: "Erreur d'assignation",
          description: `Impossible de déclencher l'auto-assignation: ${error.message}`,
          variant: "destructive"
        });
      } else {
        console.log('✅ [AUTO-ASSIGN] Auto-assignation manuelle déclenchée avec succès:', data);
        
        if (data.success) {
          const assignmentsText = data.assignments === 1 ? 'assignation' : 'assignations';
          toast({
            title: "Auto-assignation terminée",
            description: `${data.assignments || 0} ${assignmentsText} effectuée(s) sur ${data.eventsProcessed || 0} événement(s)`,
          });
        } else {
          toast({
            title: "Erreur d'assignation",
            description: data.error || "Erreur lors de l'auto-assignation",
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error('💥 [AUTO-ASSIGN] Erreur inattendue:', error);
      toast({
        title: "Erreur système",
        description: "Une erreur inattendue s'est produite lors de l'auto-assignation",
        variant: "destructive"
      });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Options de Synchronisation Avancée
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Source calendrier</label>
              <Select value={calendarSource} onValueChange={setCalendarSource}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les sources</SelectItem>
                  <SelectItem value="VR">VR seulement</SelectItem>
                  <SelectItem value="EL">EL seulement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="custom-date-range" 
                checked={useCustomDateRange} 
                onCheckedChange={(checked) => {
                  setUseCustomDateRange(!!checked);
                  if (!checked) {
                    setCustomStartDate(undefined);
                    setCustomEndDate(undefined);
                  }
                }}
              />
              <label htmlFor="custom-date-range" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Utiliser une plage de dates personnalisée
              </label>
            </div>

            {useCustomDateRange && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Plage de dates personnalisée</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setUseCustomDateRange(false);
                      setCustomStartDate(undefined);
                      setCustomEndDate(undefined);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <DateRangeSelector 
                  startDate={customStartDate}
                  endDate={customEndDate}
                  onStartDateChange={setCustomStartDate}
                  onEndDateChange={setCustomEndDate}
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="audit-only" 
                checked={auditOnly} 
                onCheckedChange={(checked) => {
                  setAuditOnly(!!checked);
                  if (checked) setForceReconcile(false);
                }}
              />
              <label htmlFor="audit-only" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Mode Audit seulement (voir ce qui serait modifié)
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="force-reconcile" 
                checked={forceReconcile} 
                onCheckedChange={(checked) => {
                  setForceReconcile(!!checked);
                  if (checked) setAuditOnly(false);
                }}
              />
              <label htmlFor="force-reconcile" className="text-sm font-medium cursor-pointer flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Réconciliation sécurisée (annuler les événements manquants)
              </label>
            </div>

            <div className="flex items-center space-x-2">
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

          {(auditOnly || forceReconcile) && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {auditOnly ? 
                  "🔍 Mode audit : aucune modification ne sera apportée, vous verrez un rapport de ce qui serait changé." :
                  "⚠️ Mode réconciliation : les événements manquants dans la source seront marqués comme annulés (pas de suppression physique)."
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Button
          onClick={triggerEnhancedSync}
          disabled={isEnhancedSyncing}
          className="h-auto py-4 flex-col gap-2"
          size="lg"
          variant={auditOnly ? "outline" : forceReconcile ? "secondary" : "default"}
        >
          {isEnhancedSyncing ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <div>
                <div className="font-semibold">
                  {auditOnly ? "Audit..." : forceReconcile ? "Réconciliation..." : "Synchronisation..."}
                </div>
                <div className="text-xs opacity-80">Traitement en cours</div>
              </div>
            </>
          ) : (
            <>
              {auditOnly ? <Eye className="w-6 h-6" /> : 
               forceReconcile ? <RefreshCw className="w-6 h-6" /> :
               <Activity className="w-6 h-6" />}
              <div>
                <div className="font-semibold">
                  {auditOnly ? "Lancer l'Audit" : forceReconcile ? "Réconcilier" : "Sync Intelligente"}
                </div>
                <div className="text-xs opacity-80">
                  {auditOnly ? "Analyse sans modification" : 
                   forceReconcile ? "Réinitialisation sécurisée" : 
                   "Traite uniquement les changements"}
                </div>
              </div>
            </>
          )}
        </Button>

        <Button
          onClick={triggerManualAssignment}
          disabled={isAssigning}
          variant="secondary"
          className="h-auto py-4 flex-col gap-2"
          size="lg"
        >
          {isAssigning ? (
            <>
              <Users className="w-6 h-6 animate-spin" />
              <div>
                <div className="font-semibold">Attribution en cours...</div>
                <div className="text-xs opacity-80">Assignation manuelle GM</div>
              </div>
            </>
          ) : (
            <>
              <Users className="w-6 h-6" />
              <div>
                <div className="font-semibold">Auto-Attribuer GM</div>
                <div className="text-xs opacity-80">Attribution manuelle</div>
              </div>
            </>
          )}
        </Button>
      </div>

      {reconciliationStats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {reconciliationStats.auditMode ? "📊 Résultats de l'Audit" : "✅ Résultats de la Réconciliation"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reconciliationStats.auditMode ? (
              <div className="space-y-2">
                <p className="font-medium">Événements qui seraient annulés :</p>
                <div className="max-h-32 overflow-y-auto">
                  {reconciliationStats.wouldCancel?.length ? (
                    <ul className="text-sm space-y-1">
                      {reconciliationStats.wouldCancel.map((event, idx) => (
                        <li key={idx} className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded border-l-4 border-amber-400">
                          {event}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">Aucun événement à annuler</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="font-medium text-green-600">Événements annulés :</p>
                  <p className="text-sm text-muted-foreground">{reconciliationStats.canceled?.length || 0} événements</p>
                </div>
                <div>
                  <p className="font-medium text-blue-600">Événements ignorés (assignés) :</p>
                  <p className="text-sm text-muted-foreground">{reconciliationStats.ignoredAssigned?.length || 0} événements</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      
      <div className="text-sm text-muted-foreground">
        {useCustomDateRange && customStartDate && customEndDate ? (
          `Plage personnalisée : ${customStartDate.toLocaleDateString()} - ${customEndDate.toLocaleDateString()}`
        ) : (
          `Période automatique : ${syncPeriodMonths} mois à venir`
        )}
      </div>
    </div>
  );
};

export default SyncActions;