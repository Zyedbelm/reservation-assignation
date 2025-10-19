
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Calendar, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const CalendarSync = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const triggerSync = async () => {
    setIsLoading(true);
    setSyncStatus('idle');
    
    try {
      console.log('Triggering calendar sync...');
      
      const { data, error } = await supabase.functions.invoke('sync-calendar', {
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
        toast({
          title: "Synchronisation réussie",
          description: `${data.eventsProcessed || 0} événements traités depuis Google Calendar`,
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
        description: "Impossible de synchroniser avec Google Calendar. Utilisez le diagnostic pour plus de détails.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runDiagnostic = async () => {
    try {
      console.log('Running Google Calendar diagnostic...');
      
      const { data, error } = await supabase.functions.invoke('test-google-calendar');

      if (error) {
        console.error('Diagnostic error:', error);
        throw error;
      }

      console.log('Diagnostic result:', data);
      
      if (data.success) {
        toast({
          title: "Diagnostic réussi",
          description: "Configuration Google Calendar validée",
        });
      } else {
        toast({
          title: "Problème détecté",
          description: data.error || "Vérifiez les recommandations dans l'onglet Diagnostics",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error running diagnostic:', error);
      toast({
        title: "Erreur de diagnostic",
        description: "Impossible d'exécuter le diagnostic",
        variant: "destructive"
      });
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
            <CheckCircle className="w-3 h-3 mr-1" />
            Configuré
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-blue-600" />
            Synchronisation Google Calendar
          </CardTitle>
          <CardDescription>
            Synchronisation avec virtualrealitycenter60@gmail.com
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3">
              <Calendar className="w-8 h-8 text-blue-600" />
              <div>
                <h3 className="font-medium">Google Calendar</h3>
                <p className="text-sm text-gray-600">virtualrealitycenter60@gmail.com</p>
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

          <div className="flex gap-3">
            <Button 
              onClick={triggerSync}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Synchronisation...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Synchroniser maintenant
                </>
              )}
            </Button>

            <Button 
              onClick={runDiagnostic}
              variant="outline"
            >
              Diagnostic
            </Button>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <div>
                <h4 className="font-medium text-blue-800">Configuration détectée</h4>
                <p className="text-sm text-blue-700 mt-1">
                  Clé API configurée avec le nom "API_GOOGLE_CALENDAR". 
                  Utilisez le bouton "Diagnostic" pour vérifier que l'API Google Calendar est activée.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarSync;
