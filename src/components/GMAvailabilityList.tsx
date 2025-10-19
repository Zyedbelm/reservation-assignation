import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Trash2, Plus, Users, AlertTriangle } from 'lucide-react';
import { useAvailabilities } from '@/hooks/useAvailabilities';
import { format, isAfter, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { checkAndHandleAvailabilityChanges } from '@/utils/availabilityChangeHandler';
import { formatAvailabilityError } from '@/utils/availabilityErrorHandler';
import { useQueryClient } from '@tanstack/react-query';

interface GMAvailabilityListProps {
  gmId: string;
}

const GMAvailabilityList = ({ gmId }: GMAvailabilityListProps) => {
  const { data: availabilities = [], isLoading, refetch } = useAvailabilities(gmId);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filtrer les disponibilités futures uniquement
  const futureAvailabilities = availabilities.filter(availability => 
    isAfter(new Date(availability.date), startOfDay(new Date()))
  );

  const handleDeleteAvailability = async (availabilityId: string, date: string, timeSlots: string[]) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette disponibilité ?')) {
      return;
    }

    setDeletingId(availabilityId);
    
    try {
      console.log(`🗑️ [DELETE AVAILABILITY] Starting deletion of availability ${availabilityId} for date ${date}`);
      
      // Vérifier et gérer les changements de disponibilité AVANT la suppression
      await checkAndHandleAvailabilityChanges(gmId, date, timeSlots, queryClient);
      
      const { error } = await supabase
        .from('gm_availabilities')
        .delete()
        .eq('id', availabilityId);

      if (error) {
        console.error('❌ [DELETE AVAILABILITY] Error deleting availability:', error);
        toast({
          title: "Erreur de suppression",
          description: formatAvailabilityError(error),
          variant: "destructive"
        });
      } else {
        console.log('✅ [DELETE AVAILABILITY] Availability deleted successfully');
        
        // Actualiser les données
        await refetch();
        
        // Invalider les queries pour synchroniser avec l'admin
        await queryClient.invalidateQueries({ queryKey: ['activities'] });
        await queryClient.invalidateQueries({ queryKey: ['all-events'] });
        
        toast({
          title: "Disponibilité supprimée",
          description: "La disponibilité a été supprimée avec succès",
        });
      }
    } catch (error) {
      console.error('💥 [DELETE AVAILABILITY] Error in handleDeleteAvailability:', error);
      toast({
        title: "Erreur système",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement des disponibilités...</div>;
  }

  return (
    <div className="space-y-4">
      {futureAvailabilities.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Aucune disponibilité future enregistrée</p>
          </CardContent>
        </Card>
      ) : (
        futureAvailabilities.map((availability) => (
          <Card key={availability.id}>
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-medium">
                  {format(new Date(availability.date), 'EEEE dd MMMM yyyy', { locale: fr })}
                </CardTitle>
                <CardDescription>
                  {availability.time_slots.length === 1 && availability.time_slots[0] === 'toute-la-journee'
                    ? 'Toute la journée'
                    : availability.time_slots.map((slot, index) => (
                      <Badge key={index} variant="secondary" className="mr-1">
                        {slot}
                      </Badge>
                    ))}
                </CardDescription>
              </div>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => handleDeleteAvailability(availability.id, availability.date, availability.time_slots)}
                disabled={deletingId === availability.id}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
          </Card>
        ))
      )}
    </div>
  );
};

export default GMAvailabilityList;
