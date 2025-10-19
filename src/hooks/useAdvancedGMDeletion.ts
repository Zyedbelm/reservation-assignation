import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GMDependencies {
  notifications: number;
  documents: number;
  competencies: number;
  availabilities: number;
  activities: number;
  profiles: number;
}

export const useGMDependencies = (gmId: string) => {
  return useQuery({
    queryKey: ['gm-dependencies', gmId],
    queryFn: async (): Promise<GMDependencies> => {
      console.log('🔍 Checking dependencies for GM:', gmId);

      const [
        { count: notifications },
        { count: documents },
        { count: competencies },
        { count: availabilities },
        { count: activities },
        { count: profiles }
      ] = await Promise.all([
        supabase.from('gm_notifications').select('*', { count: 'exact', head: true }).eq('gm_id', gmId),
        supabase.from('gm_documents').select('*', { count: 'exact', head: true }).eq('gm_id', gmId),
        supabase.from('gm_game_competencies').select('*', { count: 'exact', head: true }).eq('gm_id', gmId),
        supabase.from('gm_availabilities').select('*', { count: 'exact', head: true }).eq('gm_id', gmId),
        supabase.from('activities').select('*', { count: 'exact', head: true }).eq('assigned_gm_id', gmId),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('gm_id', gmId)
      ]);

      const deps = {
        notifications: notifications || 0,
        documents: documents || 0,
        competencies: competencies || 0,
        availabilities: availabilities || 0,
        activities: activities || 0,
        profiles: profiles || 0
      };

      console.log('📊 Dependencies found:', deps);
      return deps;
    },
    enabled: !!gmId
  });
};

export const useAdvancedGMDeletion = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (gmId: string) => {
      console.log('🗑️ Starting advanced GM deletion:', gmId);
      
      try {
        const { data, error } = await supabase.functions.invoke('admin-delete-gm', {
          body: { gmId }
        });

        console.log('📡 Edge Function response:', { data, error });

        if (error) {
          console.error('❌ Edge Function invocation error:', error);
          
          // Fallback pour FunctionsRelayError ou erreurs 404
          if (error.message?.includes('Failed to send a request') || 
              error.message?.includes('FunctionsRelayError') || 
              error.message?.includes('404')) {
            
            console.log('🔄 Attempting direct fetch fallback...');
            
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
              throw new Error('No authentication token available for fallback');
            }

            const response = await fetch(
              'https://dnxyidnkmtrmkxucqrry.supabase.co/functions/v1/admin-delete-gm',
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${session.access_token}`,
                  'Content-Type': 'application/json',
                  'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRueHlpZG5rbXRybWt4dWNxcnJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NTM4NTUsImV4cCI6MjA2NjMyOTg1NX0.CQNSkJFpA1y_p2tpwzvavV0Ee4Cn1WrBcEx1IhIOdJo'
                },
                body: JSON.stringify({ gmId })
              }
            );

            console.log('📡 Direct fetch response status:', response.status);
            
            if (!response.ok) {
              const errorText = await response.text();
              console.error('❌ Direct fetch failed:', { status: response.status, error: errorText });
              throw new Error(`HTTP ${response.status}: ${errorText || 'Function unavailable'}`);
            }

            const fallbackData = await response.json();
            console.log('✅ Fallback successful:', fallbackData);
            return fallbackData;
          }
          
          throw error;
        }
        
        if (data?.error) {
          console.error('❌ Edge Function returned error:', data.error);
          throw new Error(data.error);
        }

        console.log('✅ Advanced deletion successful:', data);
        return data;
      } catch (err) {
        console.error('💥 Complete error in deletion:', err);
        throw err;
      }
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['game-masters'] });
      queryClient.invalidateQueries({ queryKey: ['gm-dependencies'] });
    }
  });
};