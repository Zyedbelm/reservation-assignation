import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface GMPublicName {
  gm_id: string;
  display_name: string;
}

export const useGMPublicNames = () => {
  return useQuery({
    queryKey: ['gm-public-names'],
    queryFn: async () => {
      console.log('Fetching GM public names...');
      const { data, error } = await supabase.rpc('get_gm_public_names');

      if (error) {
        console.error('Error fetching GM public names:', error);
        throw error;
      }

      console.log('Fetched GM public names:', data);
      return data as GMPublicName[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Helper function to get GM name by ID from the cached data
export const getGMNameById = (gmNames: GMPublicName[] | undefined, gmId: string): string => {
  if (!gmId || !gmNames) return 'Non assigné';
  
  const gmName = gmNames.find(gm => gm.gm_id === gmId);
  return gmName?.display_name || 'GM inconnu';
};