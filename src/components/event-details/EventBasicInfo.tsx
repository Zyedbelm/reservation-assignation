
import { Calendar, Clock, MapPin, User, Users, Edit2, Check, X } from 'lucide-react';
import { useGameMasters } from '@/hooks/useGameMasters';
import { useProfiles } from '@/hooks/useProfiles';
import { useGMPublicNames, getGMNameById } from '@/hooks/useGMPublicNames';
import { useEventAssignments } from '@/hooks/useEventAssignments';
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface EventBasicInfoProps {
  event: any;
  isReadOnly?: boolean;
  isAdmin?: boolean;
  onDurationUpdated?: (payload: { duration: number; end_time: string }) => void;
}

const EventBasicInfo = ({ event, isReadOnly = false, isAdmin = false, onDurationUpdated }: EventBasicInfoProps) => {
  const { data: gameMasters = [] } = useGameMasters();
  const { data: profiles = [] } = useProfiles();
  const { data: gmNames = [] } = useGMPublicNames();
  const { data: assignments = [] } = useEventAssignments(event.id);
  const queryClient = useQueryClient();
  const [isEditingDuration, setIsEditingDuration] = useState(false);
  const [newDuration, setNewDuration] = useState(event.duration);

  // Synchroniser la durée locale avec l'événement
  useEffect(() => {
    setNewDuration(event.duration);
  }, [event.duration]);

  // Fonction pour calculer l'heure de fin basée sur la durée
  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
    return endDate.toTimeString().slice(0, 5);
  };

  // Fonction pour sauvegarder la nouvelle durée
  const handleSaveDuration = async () => {
    const originalDuration = event.duration;
    const originalEndTime = event.end_time;
    
    try {
      console.log('🔧 Tentative de mise à jour de la durée:', {
        eventId: event.id,
        oldDuration: originalDuration,
        newDuration: newDuration,
        eventTitle: event.title
      });

      const newEndTime = calculateEndTime(event.start_time, newDuration);
      console.log('🕐 Nouvelle heure de fin calculée:', newEndTime);
      
      // Optimistic update - mettre à jour immédiatement l'UI
      queryClient.setQueriesData(
        { queryKey: ['activities'] },
        (oldData: any) => {
          if (!oldData) return oldData;
          if (Array.isArray(oldData)) {
            return oldData.map(item => 
              item.id === event.id 
                ? { ...item, duration: newDuration, end_time: newEndTime }
                : item
            );
          }
          return oldData;
        }
      );
      
      // Informer le composant parent immédiatement
      onDurationUpdated?.({ duration: newDuration, end_time: newEndTime });
      
      // Sortir du mode édition immédiatement
      setIsEditingDuration(false);
      
      // Faire la mutation en arrière-plan
      const { data, error } = await supabase
        .from('activities')
        .update({
          duration: newDuration,
          end_time: newEndTime,
          updated_at: new Date().toISOString()
        })
        .eq('id', event.id)
        .select();

      console.log('📤 Résultat de la mise à jour:', { data, error });

      if (error) throw error;

      toast({
        title: "Durée mise à jour",
        description: `La durée a été modifiée à ${newDuration} minutes`
      });

      // Re-synchroniser proprement
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      
      // Rollback en cas d'erreur
      queryClient.setQueriesData(
        { queryKey: ['activities'] },
        (oldData: any) => {
          if (!oldData) return oldData;
          if (Array.isArray(oldData)) {
            return oldData.map(item => 
              item.id === event.id 
                ? { ...item, duration: originalDuration, end_time: originalEndTime }
                : item
            );
          }
          return oldData;
        }
      );
      
      onDurationUpdated?.({ duration: originalDuration, end_time: originalEndTime });
      setNewDuration(originalDuration);
      
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la durée",
        variant: "destructive"
      });
    }
  };

  const handleCancelEdit = () => {
    setNewDuration(event.duration);
    setIsEditingDuration(false);
  };

  // Fonction pour formater l'affichage du nom du GM
  const getGMDisplayName = (gameMaster: any) => {
    if (!gameMaster) return 'GM inconnu';
    
    // Si on a prénom et nom, les utiliser
    if (gameMaster.first_name && gameMaster.last_name) {
      return `${gameMaster.first_name} ${gameMaster.last_name}`;
    }
    
    // Si on a juste le prénom ou le nom, l'utiliser
    if (gameMaster.first_name) return gameMaster.first_name;
    if (gameMaster.last_name) return gameMaster.last_name;
    
    // Sinon utiliser le nom complet si disponible
    if (gameMaster.name && gameMaster.name !== gameMaster.email) {
      return gameMaster.name;
    }
    
    // En dernier recours, utiliser l'email tronqué
    if (gameMaster.email) {
      const emailPart = gameMaster.email.split('@')[0];
      return emailPart.length > 15 ? `${emailPart.substring(0, 15)}...` : emailPart;
    }
    
    return 'GM inconnu';
  };

  // Get GM name using the secure public names function
  const getGMName = (gmId?: string) => {
    if (!gmId) return null;
    const name = getGMNameById(gmNames, gmId);
    return name === 'Non assigné' ? null : name;
  };

  // Get all assigned GM names
  const assignedGmNames = useMemo(() => {
    if (!assignments.length) {
      const name = getGMName(event.assigned_gm_id);
      return name ? [name] : [];
    }
    return assignments
      .sort((a, b) => (a.assignment_order || 0) - (b.assignment_order || 0))
      .map(assignment => getGMName(assignment.gm_id))
      .filter(Boolean);
  }, [assignments, gmNames, event.assigned_gm_id]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-500" />
        <span className="text-sm">
          {new Date(event.date).toLocaleDateString('fr-FR')}
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-gray-500" />
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm">
            {event.start_time} - {event.end_time} (
          </span>
          
          {isEditingDuration && isAdmin && !isReadOnly ? (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={newDuration}
                onChange={(e) => setNewDuration(parseInt(e.target.value) || 0)}
                className="w-16 h-6 text-xs px-1"
                min="1"
                max="480"
              />
              <span className="text-sm">min</span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={handleSaveDuration}
              >
                <Check className="h-3 w-3 text-green-600" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={handleCancelEdit}
              >
                <X className="h-3 w-3 text-red-600" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span 
                className={`text-sm px-1 rounded transition-colors ${
                  isAdmin && !isReadOnly 
                    ? 'cursor-pointer hover:bg-accent hover:text-accent-foreground' 
                    : 'cursor-default'
                }`}
                onClick={() => isAdmin && !isReadOnly && setIsEditingDuration(true)}
                title={isAdmin && !isReadOnly ? "Cliquer pour modifier la durée" : "Seuls les admins peuvent modifier la durée"}
              >
                {event.duration} min
              </span>
              {isAdmin && !isReadOnly && (
                <Edit2 className="h-3 w-3 text-muted-foreground opacity-50" />
              )}
            </div>
          )}
          
          <span className="text-sm">)</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-gray-500" />
        <span className="text-sm">Sion Centre</span>
      </div>

      {assignedGmNames.length > 0 && (
        <div className="flex items-center gap-2">
          {assignedGmNames.length > 1 ? (
            <Users className="w-4 h-4 text-gray-500" />
          ) : (
            <User className="w-4 h-4 text-gray-500" />
          )}
          <span className="text-sm">{assignedGmNames.join(', ')}</span>
        </div>
      )}
    </div>
  );
};

export default EventBasicInfo;
