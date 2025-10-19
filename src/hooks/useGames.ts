
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Game {
  id: string;
  name: string;
  category?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  location?: string;
  average_duration?: number;
  is_active?: boolean;
  minimum_break_minutes?: number;
  required_gms?: number; // Number of GMs required for this game
}

export const useGames = () => {
  return useQuery({
    queryKey: ['games'],
    queryFn: async () => {
      console.log('🎯 Fetching Games...');
      
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('❌ Error fetching Games:', error);
        throw error;
      }
      
      console.log('✅ Games fetched:', {
        count: data?.length || 0,
        activeGames: data?.filter(g => g.is_active !== false).length || 0,
        data: data
      });
      
      return data as Game[];
    }
  });
};

export const useCreateGame = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (game: Omit<Game, 'id' | 'created_at' | 'updated_at'>) => {
      console.log('Creating game:', game);
      
      const gameData = {
        name: game.name,
        category: game.category || null,
        description: game.description || null,
        location: game.location || null,
        average_duration: game.average_duration || 30,
        is_active: game.is_active !== false,
        required_gms: game.required_gms || 1
      };
      
      const { data, error } = await supabase
        .from('games')
        .insert([gameData])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating game:', error);
        throw error;
      }
      
      console.log('Created game:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
    }
  });
};

export const useUpdateGame = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Game> & { id: string }) => {
      console.log('Updating game:', { id, updates });
      
      const updateData: any = {};
      
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.category !== undefined) updateData.category = updates.category;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.location !== undefined) updateData.location = updates.location;
      if (updates.average_duration !== undefined) updateData.average_duration = updates.average_duration;
      if (updates.is_active !== undefined) updateData.is_active = updates.is_active;
      if (updates.minimum_break_minutes !== undefined) updateData.minimum_break_minutes = updates.minimum_break_minutes;
      if (updates.required_gms !== undefined) updateData.required_gms = updates.required_gms;
      
      console.log('Final update data:', updateData);
      
      const { data, error } = await supabase
        .from('games')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating game:', error);
        throw error;
      }
      
      console.log('Updated game:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
    }
  });
};

export const useDeleteGame = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      console.log('Deleting game:', id);
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Error deleting game:', error);
        throw error;
      }
      
      console.log('Game deleted successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['games'] });
    }
  });
};
