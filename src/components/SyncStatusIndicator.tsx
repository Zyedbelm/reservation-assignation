
import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface SyncLog {
  id: string;
  status: string;
  events_processed: number;
  events_created: number;
  events_updated: number;
  sync_completed_at: string;
  webhook_payload: any;
  created_at: string;
}

const SyncStatusIndicator = () => {
  const [lastSync, setLastSync] = useState<SyncLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLastSync();
  }, []);

  const fetchLastSync = async () => {
    try {
      const { data, error } = await supabase
        .from('make_sync_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching sync logs:', error);
        return;
      }

      if (data) {
        setLastSync(data);
      }
    } catch (error) {
      console.error('Error in fetchLastSync:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!lastSync) {
      return (
        <Badge variant="outline" className="bg-gray-100">
          <Clock className="w-3 h-3 mr-1" />
          Aucune sync
        </Badge>
      );
    }

    switch (lastSync.status) {
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Complétée
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
            En cours
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Erreur
          </Badge>
        );
    }
  };

  const getSuccessRate = () => {
    if (!lastSync?.webhook_payload?.processing_stats) {
      // Calculate from direct values if processing_stats not available
      if (lastSync?.events_created !== undefined || lastSync?.events_updated !== undefined) {
        const created = lastSync.events_created || 0;
        const updated = lastSync.events_updated || 0;
        const processed = lastSync.events_processed || 0;
        
        if (processed === 0) return '0';
        return (((created + updated) / processed) * 100).toFixed(1);
      }
      return null;
    }
    
    const stats = lastSync.webhook_payload.processing_stats;
    const total = stats.created + stats.updated + stats.skipped + stats.errors;
    const successful = stats.created + stats.updated;
    
    if (total === 0) return '0';
    return ((successful / total) * 100).toFixed(1);
  };

  const getTotalEventsFromMetadata = () => {
    return lastSync?.webhook_payload?.metadata?.total_events || 0;
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm text-gray-600">Chargement du statut...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Statut de Synchronisation</CardTitle>
          {getStatusBadge()}
        </div>
        <CardDescription>
          Dernière synchronisation avec Make.com
        </CardDescription>
      </CardHeader>
      <CardContent>
        {lastSync ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="font-semibold text-green-700">{lastSync.events_created || 0}</div>
                <div className="text-green-600">Créés</div>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded">
                <div className="font-semibold text-blue-700">{lastSync.events_updated || 0}</div>
                <div className="text-blue-600">Mis à jour</div>
              </div>
              <div className="text-center p-2 bg-purple-50 rounded">
                <div className="font-semibold text-purple-700">{lastSync.events_processed || 0}</div>
                <div className="text-purple-600">Traités</div>
              </div>
              <div className="text-center p-2 bg-yellow-50 rounded">
                <div className="font-semibold text-yellow-700">{getSuccessRate() || '0'}%</div>
                <div className="text-yellow-600">Succès</div>
              </div>
            </div>
            
            {getTotalEventsFromMetadata() > 0 && (
              <div className="text-center p-2 bg-orange-50 rounded text-sm">
                <div className="font-semibold text-orange-700">{getTotalEventsFromMetadata()}</div>
                <div className="text-orange-600">Total disponibles chez Make.com</div>
              </div>
            )}
            
            <div className="text-xs text-gray-500 border-t pt-2">
              <div>Dernière sync: {new Date(lastSync.sync_completed_at || lastSync.created_at).toLocaleString('fr-FR')}</div>
              {lastSync.webhook_payload?.metadata && (
                <div>Source: {lastSync.webhook_payload.metadata.calendar_id}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-4">
            <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <div>Aucune synchronisation trouvée</div>
            <div className="text-xs mt-1">Lancez une synchronisation pour voir les statistiques</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SyncStatusIndicator;
