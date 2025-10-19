
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invalidateMappingsCache } from '@/utils/unifiedGameMappingService';

export interface EventGameMapping {
  id: string;
  event_name_pattern: string;
  game_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  games?: {
    name: string;
    category?: string;
  };
}

export const useEventGameMappings = () => {
  return useQuery({
    queryKey: ['event-game-mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_game_mappings')
        .select(`
          *,
          games (
            name,
            category
          )
        `)
        .eq('is_active', true)
        .order('event_name_pattern');
      
      if (error) throw error;
      return data as EventGameMapping[];
    }
  });
};

export const useCreateEventGameMapping = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (mapping: Omit<EventGameMapping, 'id' | 'created_at' | 'updated_at' | 'games'>) => {
      const { data, error } = await supabase
        .from('event_game_mappings')
        .insert([{
          ...mapping,
          user_id: null // Les correspondances sont globales, pas spécifiques à un utilisateur
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-game-mappings'] });
      invalidateMappingsCache(); // Invalider le cache du nouveau service
    }
  });
};

export const useUpdateEventGameMapping = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EventGameMapping> & { id: string }) => {
      const { data, error } = await supabase
        .from('event_game_mappings')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-game-mappings'] });
      invalidateMappingsCache(); // Invalider le cache du nouveau service
    }
  });
};

export const useDeleteEventGameMapping = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('event_game_mappings')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-game-mappings'] });
      invalidateMappingsCache(); // Invalider le cache du nouveau service
    }
  });
};

// Fonction utilitaire pour extraire le jeu depuis un titre d'événement (DEPRECATED - utiliser unifiedGameMappingService)
export const extractGameFromEventTitle = (title: string, mappings: EventGameMapping[]): string | null => {
  console.warn('⚠️ extractGameFromEventTitle is deprecated. Use findMatchingGame from unifiedGameMappingService instead.');
  
  if (!title || !mappings) return null;
  
  const titleLower = title.toLowerCase();
  
  for (const mapping of mappings) {
    if (titleLower.includes(mapping.event_name_pattern.toLowerCase())) {
      return mapping.game_id;
    }
  }
  
  return null;
};
