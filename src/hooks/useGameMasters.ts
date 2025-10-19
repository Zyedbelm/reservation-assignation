
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GameMaster {
  id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  birth_date?: string;
  avs_number?: string;
  hire_date?: string;
  is_active?: boolean;
  termination_date?: string;
  termination_reason?: string;
  phone?: string;
  address?: string;
  email?: string;
  specialties: string[];
  skills: Record<string, number>;
  total_hours: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export const useGameMasters = () => {
  return useQuery({
    queryKey: ['game-masters'],
    queryFn: async () => {
      console.log('🎮 Fetching Game Masters...');
      
      const { data, error } = await supabase
        .from('game_masters')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('❌ Error fetching Game Masters:', error);
        throw error;
      }
      
      console.log('✅ Game Masters fetched:', {
        count: data?.length || 0,
        data: data
      });
      
      return data as GameMaster[];
    }
  });
};

export const useCreateGameMaster = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (gm: Omit<GameMaster, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('game_masters')
        .insert([gm])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-masters'] });
    }
  });
};

export const useUpdateGameMaster = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GameMaster> & { id: string }) => {
      const { data, error } = await supabase
        .from('game_masters')
        .update(updates)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Aucune ligne mise à jour');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-masters'] });
    }
  });
};

export const useDeleteGameMaster = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('game_masters')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['game-masters'] });
    }
  });
};
