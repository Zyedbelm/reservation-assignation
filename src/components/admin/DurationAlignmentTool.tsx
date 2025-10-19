import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Clock, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { findMatchingGame } from '@/utils/unifiedGameMappingService';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

interface AlignmentResult {
  eventId: string;
  title: string;
  oldDuration: number;
  newDuration: number;
  newEndTime: string;
  success: boolean;
  error?: string;
}

const DurationAlignmentTool = () => {
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<AlignmentResult[]>([]);
  const queryClient = useQueryClient();

  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
    return endDate.toTimeString().slice(0, 5);
  };

  const handleAlignDurations = async () => {
    if (!startDate || !endDate) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une plage de dates valide",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setResults([]);

    try {
      // Récupérer les activités gaming dans la plage de dates
      const { data: activities, error: fetchError } = await supabase
        .from('activities')
        .select('*')
        .eq('activity_type', 'gaming')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (fetchError) throw fetchError;

      console.log(`🔧 [DURATION-ALIGN] Trouvé ${activities?.length || 0} activités gaming à traiter`);

      const alignmentResults: AlignmentResult[] = [];
      let updatedCount = 0;
      let ignoredCount = 0;

      for (const activity of activities || []) {
        try {
          // Résoudre le mapping de jeu
          const gameMatch = await findMatchingGame(activity.title);
          
          if (gameMatch.averageDuration && gameMatch.confidence > 80 && gameMatch.averageDuration !== activity.duration) {
            // Calculer la nouvelle heure de fin
            const newEndTime = calculateEndTime(activity.start_time, gameMatch.averageDuration);
            
            // Mettre à jour l'activité en base
            const { error: updateError } = await supabase
              .from('activities')
              .update({
                duration: gameMatch.averageDuration,
                end_time: newEndTime,
                updated_at: new Date().toISOString()
              })
              .eq('id', activity.id);

            if (updateError) throw updateError;

            alignmentResults.push({
              eventId: activity.id,
              title: activity.title,
              oldDuration: activity.duration,
              newDuration: gameMatch.averageDuration,
              newEndTime: newEndTime,
              success: true
            });
            
            updatedCount++;
            console.log(`✅ [DURATION-ALIGN] Mis à jour "${activity.title}": ${activity.duration}min → ${gameMatch.averageDuration}min`);
          } else {
            alignmentResults.push({
              eventId: activity.id,
              title: activity.title,
              oldDuration: activity.duration,
              newDuration: activity.duration,
              newEndTime: activity.end_time,
              success: true
            });
            
            ignoredCount++;
            console.log(`⏭️ [DURATION-ALIGN] Ignoré "${activity.title}": pas de mapping ou durée identique`);
          }
        } catch (error) {
          console.error(`❌ [DURATION-ALIGN] Erreur pour "${activity.title}":`, error);
          alignmentResults.push({
            eventId: activity.id,
            title: activity.title,
            oldDuration: activity.duration,
            newDuration: activity.duration,
            newEndTime: activity.end_time,
            success: false,
            error: error instanceof Error ? error.message : 'Erreur inconnue'
          });
        }
      }

      setResults(alignmentResults);

      // Invalider les caches
      await queryClient.invalidateQueries({ queryKey: ['activities'] });
      await queryClient.invalidateQueries({ queryKey: ['monthly-reports'] });

      toast({
        title: "Alignement terminé",
        description: `${updatedCount} événement(s) mis à jour, ${ignoredCount} ignoré(s)`
      });

    } catch (error) {
      console.error('❌ [DURATION-ALIGN] Erreur générale:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de l'alignement des durées",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const successfulUpdates = results.filter(r => r.success && r.oldDuration !== r.newDuration);
  const ignoredEvents = results.filter(r => r.success && r.oldDuration === r.newDuration);
  const failedEvents = results.filter(r => !r.success);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Outil d'Alignement des Durées
        </CardTitle>
        <CardDescription>
          Applique les durées d'administration (définies dans les mappings de jeux) aux événements gaming existants
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">Date de début</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isProcessing}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end-date">Date de fin</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={isProcessing}
            />
          </div>
        </div>

        {/* Action */}
        <div className="flex items-center gap-4">
          <Button
            onClick={handleAlignDurations}
            disabled={isProcessing || !startDate || !endDate}
            className="flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Traitement en cours...
              </>
            ) : (
              <>
                <Clock className="h-4 w-4" />
                Appliquer les durées d'administration
              </>
            )}
          </Button>
        </div>

        {/* Résultats */}
        {results.length > 0 && (
          <div className="space-y-4">
            <Separator />
            
            {/* Résumé */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {successfulUpdates.length > 0 && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {successfulUpdates.length} mis à jour
                  </span>
                </div>
              )}
              
              {ignoredEvents.length > 0 && (
                <div className="flex items-center gap-2 text-yellow-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {ignoredEvents.length} ignoré(s)
                  </span>
                </div>
              )}
              
              {failedEvents.length > 0 && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {failedEvents.length} échoué(s)
                  </span>
                </div>
              )}
            </div>

            {/* Détails des mises à jour */}
            {successfulUpdates.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-green-700">Événements mis à jour</h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {successfulUpdates.map((result) => (
                    <div key={result.eventId} className="text-xs bg-green-50 p-2 rounded">
                      <div className="font-medium">{result.title}</div>
                      <div className="text-green-600">
                        {result.oldDuration}min → {result.newDuration}min (fin: {result.newEndTime})
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Erreurs */}
            {failedEvents.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-red-700">Erreurs</h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {failedEvents.map((result) => (
                    <div key={result.eventId} className="text-xs bg-red-50 p-2 rounded">
                      <div className="font-medium">{result.title}</div>
                      <div className="text-red-600">{result.error}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DurationAlignmentTool;