
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useEventsQuery = (selectedDate: Date, viewMode: 'week' | 'month') => {
  return useQuery({
    queryKey: ['all-events', selectedDate.toISOString().split('T')[0], viewMode],
    queryFn: async () => {
      try {
        const startDate = new Date(selectedDate);
        const endDate = new Date(selectedDate);
        
        if (viewMode === 'week') {
          // Calculer le début de la semaine (lundi)
          const dayOfWeek = startDate.getDay();
          const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
          
          startDate.setDate(startDate.getDate() + mondayOffset);
          startDate.setHours(0, 0, 0, 0);
          
          // Calculer la fin de la semaine (dimanche)
          endDate.setTime(startDate.getTime());
          endDate.setDate(startDate.getDate() + 6);
          endDate.setHours(23, 59, 59, 999);
        } else {
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);
          endDate.setMonth(endDate.getMonth() + 1, 0);
          endDate.setHours(23, 59, 59, 999);
        }

        console.log('🔍 [EVENTS-QUERY] Fetching events from', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0], '| View mode:', viewMode);

        // Requête principal avec retry automatique
        let data, error;
        
        try {
          const result = await supabase
            .from('activities')
            .select(`
              *,
              game_masters:assigned_gm_id(name, email)
            `)
            .gte('date', startDate.toISOString().split('T')[0])
            .lte('date', endDate.toISOString().split('T')[0])
            .not('status', 'in', '(cancelled,deleted)')
            .order('date', { ascending: true })
            .order('start_time', { ascending: true });
          
          data = result.data;
          error = result.error;
        } catch (fetchError) {
          console.error('❌ [EVENTS-QUERY] Network error, trying fallback:', fetchError);
          
          // Fallback sans relation si la requête principale échoue
          const fallbackResult = await supabase
            .from('activities')
            .select('*')
            .gte('date', startDate.toISOString().split('T')[0])
            .lte('date', endDate.toISOString().split('T')[0])
            .not('status', 'in', '(cancelled,deleted)')
            .order('date', { ascending: true })
            .order('start_time', { ascending: true });
          
          data = fallbackResult.data;
          error = fallbackResult.error;
        }
        
        if (error) {
          console.error('❌ [EVENTS-QUERY] Error fetching events:', error);
          throw error;
        }

        console.log('✅ [EVENTS-QUERY] Events fetched successfully:', data?.length || 0, '| Date range:', startDate.toISOString().split('T')[0], 'to', endDate.toISOString().split('T')[0]);
        console.log('📋 [EVENTS-QUERY] Sample events:', data?.slice(0, 3).map(e => ({ 
          date: e.date, 
          title: e.title, 
          status: e.status,
          is_assigned: e.is_assigned 
        })));
        return data || [];
      } catch (error) {
        console.error('❌ [EVENTS-QUERY] Query failed:', error);
        throw error;
      }
    },
    staleTime: 30000, // 30 secondes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      console.log(`🔄 [EVENTS-QUERY] Retry attempt ${failureCount}:`, error);
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnMount: true,
    refetchOnReconnect: true
  });
};

export const useListEventsQuery = (
  listViewStartDate: string, 
  listViewEndDate: string, 
  fallbackEvents: any[]
) => {
  return useQuery({
    queryKey: ['list-events', listViewStartDate, listViewEndDate],
    queryFn: async () => {
      try {
        if (!listViewStartDate && !listViewEndDate) {
          console.log('🔍 [LIST-EVENTS] Using fallback events:', fallbackEvents?.length || 0);
          return fallbackEvents || [];
        }

        console.log('🔍 [LIST-EVENTS] Fetching custom date range:', listViewStartDate, 'to', listViewEndDate);

        let query = supabase
          .from('activities')
          .select(`
            *,
            game_masters:assigned_gm_id(name, email)
          `)
          .not('status', 'in', '(cancelled,deleted)')
          .order('date', { ascending: true })
          .order('start_time', { ascending: true });

        if (listViewStartDate) {
          query = query.gte('date', listViewStartDate);
        }
        if (listViewEndDate) {
          query = query.lte('date', listViewEndDate);
        }
        
        const { data, error } = await query;
        
        if (error) {
          console.error('❌ [LIST-EVENTS] Error fetching events:', error);
          throw error;
        }

        console.log('✅ [LIST-EVENTS] Events fetched:', data?.length || 0);
        return data || [];
      } catch (error) {
        console.error('❌ [LIST-EVENTS] Query failed:', error);
        throw error;
      }
    },
    enabled: !!(listViewStartDate || listViewEndDate),
    staleTime: 30000, // 30 secondes
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
};
