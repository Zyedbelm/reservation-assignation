
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Availability {
  id: string;
  gm_id: string;
  date: string;
  time_slots: string[];
  created_at: string;
  updated_at: string;
}

export const useAvailabilities = (gmId?: string, date?: string) => {
  return useQuery({
    queryKey: ['availabilities', gmId, date],
    queryFn: async () => {
      let query = supabase
        .from('gm_availabilities')
        .select('*')
        .order('date', { ascending: true });
      
      if (gmId) {
        query = query.eq('gm_id', gmId);
      }
      
      if (date) {
        query = query.eq('date', date);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as unknown as Availability[];
    }
  });
};

export const useCreateAvailability = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (availability: Omit<Availability, 'id' | 'created_at' | 'updated_at'>) => {
      // Vérifier d'abord si la disponibilité existe déjà
      const { data: existing, error: checkError } = await supabase
        .from('gm_availabilities')
        .select('id, time_slots')
        .eq('gm_id', availability.gm_id)
        .eq('date', availability.date)
        .maybeSingle();
      
      if (checkError) {
        console.error('Erreur lors de la vérification:', checkError);
        throw new Error(`Erreur de vérification: ${checkError.message}`);
      }
      
      if (existing) {
        // Si existe, mettre à jour
        const { data, error } = await supabase
          .from('gm_availabilities')
          .update({ 
            time_slots: availability.time_slots,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)
          .select()
          .single();
        
        if (error) {
          console.error('Erreur lors de la mise à jour:', error);
          throw new Error(`Mise à jour impossible: ${error.message}`);
        }
        
        return { ...data, action: 'updated' as const };
      } else {
        // Si n'existe pas, créer
        const { data, error } = await supabase
          .from('gm_availabilities')
          .insert([availability])
          .select()
          .single();
        
        if (error) {
          console.error('Erreur lors de la création:', error);
          
          // Gestion d'erreurs spécifiques
          if (error.code === '23505') { // Unique constraint violation
            throw new Error('Cette date a déjà des disponibilités. Veuillez rafraîchir la page et réessayer.');
          }
          if (error.code === '42501') { // Insufficient privilege
            throw new Error('Permissions insuffisantes. Contactez l\'administrateur.');
          }
          
          throw new Error(`Création impossible: ${error.message}`);
        }
        
        return { ...data, action: 'created' as const };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availabilities'] });
    },
    retry: (failureCount, error) => {
      // Retry jusqu'à 2 fois pour les erreurs réseau
      if (failureCount < 2 && (error.message.includes('network') || error.message.includes('fetch'))) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
};

export const useDeleteAvailability = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gm_availabilities')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availabilities'] });
    }
  });
};
