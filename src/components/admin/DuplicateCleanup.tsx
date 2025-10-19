import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, CheckCircle, Trash2 } from 'lucide-react';

interface CleanupResult {
  success: boolean;
  summary?: {
    totalEventsAnalyzed: number;
    uniqueEventGroups: number;
    totalDuplicatesFound: number;
    totalDuplicatesDeleted: number;
    assignmentsMigrated: number;
  };
  details?: any[];
  error?: string;
}

export const DuplicateCleanup = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<CleanupResult | null>(null);
  const { toast } = useToast();

  const runCleanup = async () => {
    setIsRunning(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('admin-clean-duplicates');

      if (error) {
        throw error;
      }

      setResult(data);
      
      if (data.success) {
        toast({
          title: "Nettoyage terminé",
          description: `${data.summary.totalDuplicatesDeleted} doublons supprimés avec succès`,
        });
      } else {
        toast({
          title: "Erreur lors du nettoyage",
          description: data.error || "Une erreur inconnue s'est produite",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error running cleanup:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'exécuter le nettoyage des doublons",
        variant: "destructive",
      });
      setResult({
        success: false,
        error: error.message || String(error)
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trash2 className="h-5 w-5" />
          Nettoyage des événements dupliqués
        </CardTitle>
        <CardDescription>
          Nettoie les événements dupliqués causés par les différents formats d'ID de Google Calendar.
          Les événements avec assignments seront préservés en priorité.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Attention :</strong> Cette opération va supprimer définitivement les événements dupliqués.
            Les assignments seront migrés vers les événements conservés.
          </AlertDescription>
        </Alert>

        <Button 
          onClick={runCleanup} 
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Nettoyage en cours...
            </>
          ) : (
            <>
              <Trash2 className="mr-2 h-4 w-4" />
              Nettoyer les doublons
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              )}
              <span className="font-semibold">
                {result.success ? 'Nettoyage réussi' : 'Erreur lors du nettoyage'}
              </span>
            </div>

            {result.success && result.summary && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Événements analysés</div>
                  <Badge variant="secondary">{result.summary.totalEventsAnalyzed}</Badge>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Groupes uniques</div>
                  <Badge variant="secondary">{result.summary.uniqueEventGroups}</Badge>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Doublons trouvés</div>
                  <Badge variant="destructive">{result.summary.totalDuplicatesFound}</Badge>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Doublons supprimés</div>
                  <Badge variant="destructive">{result.summary.totalDuplicatesDeleted}</Badge>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Assignments migrés</div>
                  <Badge variant="outline">{result.summary.assignmentsMigrated}</Badge>
                </div>
              </div>
            )}

            {result.error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Erreur :</strong> {result.error}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};