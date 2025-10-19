
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, UserX } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { createGMNotificationWithEmail, createNotificationContent } from '@/utils/unifiedNotificationService';

interface GMSelfUnassignmentProps {
  event: any;
  onEventChange: (updatedEvent: any) => void;
}

const GMSelfUnassignment = ({ event, onEventChange }: GMSelfUnassignmentProps) => {
  const [isUnassigning, setIsUnassigning] = useState(false);
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Vérifier si l'événement est dans moins de 5 jours
  const isWithinFiveDays = () => {
    const eventDate = new Date(event.date);
    const today = new Date();
    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 5;
  };

  // Vérifier si l'utilisateur actuel est assigné à cet événement (GM seulement)
  const isCurrentUserAssigned = () => {
    return profile?.role === 'gm' && 
           event.is_assigned && 
           profile.gm_id === event.assigned_gm_id;
  };

  const handleUnassignSelf = async () => {
    if (isWithinFiveDays()) {
      toast({
        title: "Désassignation impossible",
        description: "Vous ne pouvez pas vous désassigner d'un événement qui a lieu dans moins de 5 jours.",
        variant: "destructive"
      });
      return;
    }

    setIsUnassigning(true);
    
    try {
      console.log('🔄 GM self-unassignment for event:', event.id);
      
      // Récupérer les infos du GM pour la notification
      const { data: gmData } = await supabase
        .from('game_masters')
        .select('name, email')
        .eq('id', profile?.gm_id)
        .single();
      
      // Supprimer les assignations existantes
      const { error: deleteAssignmentError } = await supabase
        .from('event_assignments')
        .delete()
        .eq('activity_id', event.id);

      if (deleteAssignmentError) {
        console.error('❌ Error deleting assignments:', deleteAssignmentError);
      }

      // Mettre à jour l'activité pour enlever l'assignation
      const { error: updateError } = await supabase
        .from('activities')
        .update({
          assigned_gm_id: null,
          is_assigned: false,
          assignment_date: null,
          assignment_score: null,
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', event.id);

      if (updateError) throw updateError;

      // Envoyer notification d'auto-désassignation
      if (gmData && profile?.gm_id) {
        console.log('📧 Sending self-unassignment notification...');
        
        const { title, message } = createNotificationContent('unassigned', event);
        
        const notificationResult = await createGMNotificationWithEmail({
          gmId: profile.gm_id,
          gmEmail: gmData.email,
          gmName: gmData.name,
          notificationType: 'unassigned',
          eventId: event.id,
          title,
          message,
          eventData: event
        });

        if (!notificationResult.success) {
          console.error('❌ Failed to send self-unassignment notification:', notificationResult.error);
        }
      }
      
      // Mettre à jour l'état local
      const updatedEvent = {
        ...event,
        assigned_gm_id: null,
        is_assigned: false,
        assignment_date: null,
        assignment_score: null,
        status: 'pending'
      };
      
      onEventChange(updatedEvent);
      
      // Actualiser les données
      await queryClient.invalidateQueries({ queryKey: ['activities'] });
      
      toast({
        title: "Désassignation réussie",
        description: "Vous avez été désassigné de cet événement. Une notification a été enregistrée.",
        variant: "default"
      });
      
    } catch (error) {
      console.error('❌ Error during self-unassignment:', error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de la désassignation.",
        variant: "destructive"
      });
    } finally {
      setIsUnassigning(false);
    }
  };

  // N'afficher le bouton que pour les GMs assignés à l'événement
  if (!isCurrentUserAssigned()) {
    return null;
  }

  return (
    <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
        <div className="flex-1">
          <h4 className="font-medium text-yellow-900 mb-2">
            Désassignation manuelle
          </h4>
          <p className="text-sm text-yellow-800 mb-3">
            Vous pouvez vous désassigner de cet événement si vous n'êtes finalement pas disponible.
            {isWithinFiveDays() && (
              <span className="block mt-1 font-medium text-red-700">
                ⚠️ Attention: L'événement a lieu dans moins de 5 jours. Désassignation impossible.
              </span>
            )}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleUnassignSelf}
            disabled={isUnassigning || isWithinFiveDays()}
            className="border-yellow-300 text-yellow-800 hover:bg-yellow-100"
          >
            <UserX className="w-4 h-4 mr-2" />
            {isUnassigning ? 'Désassignation...' : 'Me désassigner'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default GMSelfUnassignment;
