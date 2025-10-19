
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Calendar, CheckCircle, Clock, AlertTriangle, Webhook, Users, Zap, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const MakeCalendarSync = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isForceSync, setIsForceSync] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [lastSyncData, setLastSyncData] = useState<any>(null);

  const triggerSync = async () => {
    setIsLoading(true);
    setSyncStatus('idle');
    
    try {
      console.log('Triggering Make.com calendar sync...');
      
      const { data, error } = await supabase.functions.invoke('sync-make-calendar', {
        body: { syncType: 'manual' }
      });

      if (error) {
        console.error('Sync function error:', error);
        throw error;
      }

      console.log('Sync response:', data);
      
      if (data.success) {
        setLastSync(new Date());
        setSyncStatus('success');
        setLastSyncData(data);
        toast({
          title: "Synchronisation réussie",
          description: `${data.eventsProcessed || 0} événements traités, ${data.eventsCreated || 0} créés, ${data.eventsUpdated || 0} mis à jour`,
        });
      } else {
        setSyncStatus('error');
        toast({
          title: "Erreur de synchronisation",
          description: data.error || "Erreur lors de la synchronisation",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('error');
      toast({
        title: "Erreur de synchronisation",
        description: "Impossible de synchroniser avec Make.com",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const forceSyncWebhook = async () => {
    setIsForceSync(true);
    
    try {
      console.log('Forcing Make.com webhook sync...');
      
      const { data, error } = await supabase.functions.invoke('sync-make-calendar', {
        body: { 
          syncType: 'forced',
          forceWebhook: true,
          timestamp: new Date().toISOString()
        }
      });

      if (error) {
        console.error('Force sync error:', error);
        throw error;
      }

      console.log('Force sync response:', data);
      
      if (data.success) {
        setLastSync(new Date());
        setSyncStatus('success');
        setLastSyncData(data);
        toast({
          title: "Synchronisation forcée réussie",
          description: `${data.eventsProcessed || 0} événements traités via webhook forcé`,
        });
      } else {
        setSyncStatus('error');
        toast({
          title: "Erreur de synchronisation forcée",
          description: data.error || "Erreur lors de la synchronisation forcée",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Force sync error:', error);
      toast({
        title: "Erreur de synchronisation forcée",
        description: "Impossible d'exécuter la synchronisation forcée",
        variant: "destructive"
      });
    } finally {
      setIsForceSync(false);
    }
  };

  const triggerAssignment = async () => {
    setIsAssigning(true);
    
    try {
      console.log('Triggering GM auto-assignment...');
      
      const { data, error } = await supabase.functions.invoke('auto-assign-gms');

      if (error) {
        console.error('Assignment function error:', error);
        throw error;
      }

      console.log('Assignment response:', data);
      
      if (data.success) {
        toast({
          title: "Attribution automatique terminée",
          description: `${data.assignments || 0} nouvelles attributions effectuées`,
        });
      } else {
        toast({
          title: "Erreur d'attribution",
          description: data.error || "Erreur lors de l'attribution automatique",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Assignment error:', error);
      toast({
        title: "Erreur d'attribution",
        description: "Impossible d'effectuer l'attribution automatique",
        variant: "destructive"
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const getStatusBadge = () => {
    switch (syncStatus) {
      case 'success':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Synchronisé
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Erreur
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            <Activity className="w-3 h-3 mr-1" />
            Prêt
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="w-5 h-5 text-blue-600" />
            Synchronisation Make.com
          </CardTitle>
          <CardDescription>
            Synchronisation automatique directe avec Make.com toutes les 6 heures
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-600" />
              <div>
                <h3 className="font-medium">Make.com Webhook</h3>
                <p className="text-sm text-gray-600">Scénario automatisé configuré</p>
              </div>
            </div>
            {getStatusBadge()}
          </div>

          {lastSync && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-4 h-4" />
              Dernière synchronisation: {lastSync.toLocaleString('fr-FR')}
            </div>
          )}

          {lastSyncData && syncStatus === 'success' && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-800">
                <strong>Dernière synchronisation :</strong>
                <ul className="mt-1 space-y-1">
                  <li>• {lastSyncData.eventsProcessed || 0} événements traités</li>
                  <li>• {lastSyncData.eventsCreated || 0} nouveaux événements créés</li>
                  <li>• {lastSyncData.eventsUpdated || 0} événements mis à jour</li>
                </ul>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button 
              onClick={triggerSync}
              disabled={isLoading || isForceSync}
              variant="default"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sync...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync Manuel
                </>
              )}
            </Button>

            <Button 
              onClick={forceSyncWebhook}
              disabled={isLoading || isForceSync}
              variant="secondary"
            >
              {isForceSync ? (
                <>
                  <Zap className="w-4 h-4 mr-2 animate-spin" />
                  Forçage...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Sync Forcé
                </>
              )}
            </Button>

            <Button 
              onClick={triggerAssignment}
              disabled={isAssigning}
              variant="outline"
            >
              {isAssigning ? (
                <>
                  <Users className="w-4 h-4 mr-2 animate-spin" />
                  Attribution...
                </>
              ) : (
                <>
                  <Users className="w-4 h-4 mr-2" />
                  Attribuer GM
                </>
              )}
            </Button>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <div>
                <h4 className="font-medium text-blue-800">Configuration Make.com</h4>
                <p className="text-sm text-blue-700 mt-1">
                  • Synchronisation automatique directe toutes les 6h<br/>
                  • Appel PostgreSQL → Make.com (sans Edge Function)<br/>
                  • Attribution GM via Edge Function toutes les 6h30<br/>
                  • Gestion des événements sur 3 mois<br/>
                  • Webhook configuré et testé avec succès
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MakeCalendarSync;
