
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useGameMasters } from '@/hooks/useGameMasters';
import { useAvailabilities } from '@/hooks/useAvailabilities';
import { createGMNotificationWithEmail, createNotificationContent } from '@/utils/unifiedNotificationService';

export const useManualAssignment = (
  event: any,
  availableGMs?: any[],
  onAssignmentComplete?: () => void,
  onClose?: () => void
) => {
  const [selectedGMId, setSelectedGMId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const { data: gameMasters = [] } = useGameMasters();
  const { data: availabilities = [] } = useAvailabilities();
  const { toast } = useToast();

  const getAvailableGMs = () => {
    if (availableGMs) return availableGMs;
    
    if (!event) return [];
    
    const eventDate = event.date;
    const eventHour = event.start_time.slice(0, 2);
    
    return gameMasters.filter(gm => {
      if (!gm.is_active || !gm.is_available) return false;
      
      // Vérifier la disponibilité
      const hasAvailability = availabilities.some(avail => 
        avail.gm_id === gm.id && 
        avail.date === eventDate &&
        avail.time_slots.some(slot => slot.startsWith(eventHour))
      );
      
      return hasAvailability;
    });
  };

  const validateAssignment = (gmId: string): boolean => {
    const eventDate = event.date;
    const eventHour = event.start_time.slice(0, 2);
    
    const hasAvailability = availabilities.some(avail => 
      avail.gm_id === gmId && 
      avail.date === eventDate &&
      avail.time_slots.some(slot => slot.startsWith(eventHour))
    );

    if (!hasAvailability) {
      const selectedGM = gameMasters.find(gm => gm.id === gmId);
      toast({
        title: "Attribution impossible",
        description: `${selectedGM?.name} n'est pas disponible pour ce créneau. Le GM doit d'abord déclarer sa disponibilité.`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const performAssignment = async (gmId: string) => {
    if (!validateAssignment(gmId)) return false;

    setIsAssigning(true);
    
    try {
      const selectedGM = gameMasters.find(gm => gm.id === gmId);
      console.log(`🎯 Manual assignment: Assigning ${selectedGM?.name} to event ${event.title}`);
      
      // Mettre à jour l'activité avec le GM assigné
      const { error: updateError } = await supabase
        .from('activities')
        .update({
          assigned_gm_id: gmId,
          is_assigned: true,
          status: 'assigned',
          assignment_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', event.id);

      if (updateError) throw updateError;

      console.log(`✅ Event ${event.title} assigned to ${selectedGM?.name} with status 'assigned'`);

      // Paralléliser l'enregistrement d'assignation et l'envoi de notification
      const [assignmentResult] = await Promise.allSettled([
        // Créer l'enregistrement d'assignation
        supabase
          .from('event_assignments')
          .insert([{
            activity_id: event.id,
            gm_id: gmId,
            status: 'assigned',
            assigned_at: new Date().toISOString()
          }])
          .select()
          .single(),
        
        // Envoyer notification en parallèle
        sendNotificationWithUnifiedService(selectedGM)
      ]);

      if (assignmentResult.status === 'rejected') {
        console.warn('Assignment record creation failed:', assignmentResult.reason);
      }

      onAssignmentComplete?.();
      onClose?.();
      setSelectedGMId('');
      
      return true;

    } catch (error) {
      console.error('Assignment error:', error);
      toast({
        title: "Erreur d'attribution",
        description: "Une erreur est survenue lors de l'attribution.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsAssigning(false);
    }
  };

  const sendNotificationWithUnifiedService = async (selectedGM: any) => {
    if (!selectedGM) return;

    try {
      console.log('📧 Sending assignment notification with unified service...');
      
      const { title, message } = createNotificationContent('assignment', event);
      
      // Envoyer la notification de manière asynchrone sans attendre
      createGMNotificationWithEmail({
        gmId: selectedGM.id,
        gmEmail: selectedGM.email,
        gmName: selectedGM.name,
        notificationType: 'assignment',
        eventId: event.id,
        title,
        message,
        eventData: event
      }).then(result => {
        if (result.success) {
          console.log('✅ Assignment notification sent successfully via unified service');
        } else {
          console.error('❌ Error sending unified notification:', result.error);
        }
      }).catch(emailError => {
        console.error('💥 Error calling unified notification service:', emailError);
      });

      // Afficher le toast immédiatement sans attendre l'email
      toast({
        title: "Attribution réussie",
        description: `L'événement a été attribué à ${selectedGM.name}. Une notification est en cours d'envoi.`,
      });
      
    } catch (emailError) {
      console.error('💥 Error in notification setup:', emailError);
      toast({
        title: "Attribution réussie",
        description: `L'événement a été attribué à ${selectedGM.name}.`,
      });
    }
  };

  return {
    selectedGMId,
    setSelectedGMId,
    isAssigning,
    availableGMsList: getAvailableGMs(),
    selectedGM: gameMasters.find(gm => gm.id === selectedGMId),
    performAssignment
  };
};
