import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook personnalisé pour activer les mises à jour en temps réel 
 * de la table activities via Supabase Realtime
 * 
 * Ce hook invalide automatiquement le cache React Query quand 
 * des modifications sont détectées sur la table activities
 */
export const useActivitiesRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('activities-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Écoute tous les événements: INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'activities'
        },
        (payload) => {
          console.log('Realtime update détecté sur activities:', payload);
          
          // Invalider le cache pour forcer un rafraîchissement
          queryClient.invalidateQueries({ queryKey: ['activities'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
