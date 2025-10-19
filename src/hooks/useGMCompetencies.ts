
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GMCompetency {
  id: string;
  gm_id: string;
  game_id: string;
  competency_level: number;
  training_date?: string;
  last_assessment_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  games?: {
    name: string;
    category?: string;
  };
}

export const useGMCompetencies = (gmId?: string) => {
  return useQuery({
    queryKey: ['gm-competencies', gmId],
    queryFn: async () => {
      let query = supabase
        .from('gm_game_competencies')
        .select(`
          *,
          games (
            name,
            category
          )
        `);
      
      if (gmId) {
        query = query.eq('gm_id', gmId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as GMCompetency[];
    }
  });
};

export const useCreateGMCompetency = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (competency: Omit<GMCompetency, 'id' | 'created_at' | 'updated_at' | 'games'>) => {
      const { data, error } = await supabase
        .from('gm_game_competencies')
        .insert([competency])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gm-competencies'] });
    }
  });
};

export const useUpdateGMCompetency = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<GMCompetency> & { id: string }) => {
      const { data, error } = await supabase
        .from('gm_game_competencies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gm-competencies'] });
    }
  });
};

export const useDeleteGMCompetency = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gm_game_competencies')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gm-competencies'] });
    }
  });
};
