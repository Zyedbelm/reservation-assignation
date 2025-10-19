
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Info } from 'lucide-react';
import { useActivities } from '@/hooks/useActivities';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getCurrentSwissDate } from '@/utils/dateUtils';
import ManualAssignmentDialog from './ManualAssignmentDialog';
import UnassignedEventsHeader from './unassigned/UnassignedEventsHeader';
import UnassignedEventCard from './unassigned/UnassignedEventCard';

const UnassignedEvents = () => {
  const { data: activities = [], isLoading } = useActivities();
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [selectedEventForAssignment, setSelectedEventForAssignment] = useState<any>(null);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Obtenir la date d'aujourd'hui au format YYYY-MM-DD (timezone suisse)
  const today = getCurrentSwissDate();
  
  // Filtrer les événements non assignés ET futurs ou du jour même
  // Utiliser is_assigned pour aligner avec la logique du calendrier
  const unassignedEvents = activities.filter(activity => 
    !activity.is_assigned && 
    activity.date >= today &&
    !['cancelled', 'deleted', 'completed'].includes(activity.status)
  );

  const toggleEventExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const handleManualAssignment = (event: any) => {
    setSelectedEventForAssignment(event);
    setIsAssignmentDialogOpen(true);
  };

  const handleAssignmentComplete = async () => {
    // Rafraîchir les données après assignation
    await queryClient.invalidateQueries({ queryKey: ['activities'] });
    toast({
      title: "Assignation réussie",
      description: "L'événement a été assigné avec succès",
    });
  };

  const handleDeleteEvent = async (event: any) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'événement "${event.title}" ?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('activities')
        .update({ status: 'cancelled' })
        .eq('id', event.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['activities'] });
      
      toast({
        title: "Événement supprimé",
        description: "L'événement a été marqué comme annulé",
      });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'événement",
        variant: "destructive"
      });
    }
  };

  const handleAutoAssignment = async () => {
    setIsAutoAssigning(true);
    
    try {
      console.log('🚀 [AUTO-ASSIGN] Déclenchement manuel de l\'auto-assignation depuis les événements non assignés...');
      
      const { data, error } = await supabase.functions.invoke('auto-assign-gms', {
        body: { 
          trigger: 'manual',
          source: 'unassigned_events',
          eventCount: unassignedEvents.length,
          timestamp: new Date().toISOString()
        }
      });

      if (error) {
        console.error('❌ [AUTO-ASSIGN] Erreur lors de l\'auto-assignation:', error);
        toast({
          title: "Erreur d'assignation",
          description: `Impossible de déclencher l'auto-assignation: ${error.message}`,
          variant: "destructive"
        });
      } else {
        console.log('✅ [AUTO-ASSIGN] Auto-assignation manuelle déclenchée avec succès:', data);
        
        // Actualiser les données après assignation
        await queryClient.invalidateQueries({ queryKey: ['activities'] });
        
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
      setIsAutoAssigning(false);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement des événements...</div>;
  }

  return (
    <>
      <div className="space-y-6">
        <Card>
          <UnassignedEventsHeader
            unassignedCount={unassignedEvents.length}
            isAutoAssigning={isAutoAssigning}
            onAutoAssignment={handleAutoAssignment}
          />
          <CardContent>
            <div className="flex items-center gap-2 mb-4 p-2 bg-muted/50 rounded-md">
              <Info className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Événements futurs non assignés (timezone suisse, exclut annulés/supprimés)
              </span>
            </div>
            {unassignedEvents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Tous les événements futurs sont assignés !</p>
              </div>
            ) : (
              <div className="space-y-2">
                {unassignedEvents.map((event) => (
                  <UnassignedEventCard
                    key={event.id}
                    event={event}
                    isExpanded={expandedEvents.has(event.id)}
                    onToggleExpanded={() => toggleEventExpansion(event.id)}
                    onAssignGM={() => handleManualAssignment(event)}
                    onDelete={() => handleDeleteEvent(event)}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog d'assignation manuelle */}
      <ManualAssignmentDialog
        open={isAssignmentDialogOpen}
        onOpenChange={setIsAssignmentDialogOpen}
        event={selectedEventForAssignment}
        onAssignmentComplete={handleAssignmentComplete}
      />
    </>
  );
};

export default UnassignedEvents;
