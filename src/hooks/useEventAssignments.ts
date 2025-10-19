import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useEventAssignments = (eventId?: string) => {
  return useQuery({
    queryKey: ['event-assignments', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const { data, error } = await supabase
        .from('event_assignments')
        .select('*')
        .eq('activity_id', eventId)
        .order('assignment_order');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!eventId
  });
};

export const useAllEventAssignments = () => {
  return useQuery({
    queryKey: ['all-event-assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_assignments')
        .select('activity_id, gm_id');
      
      if (error) throw error;
      
      // Grouper par event ID avec les détails des GMs
      const assignmentsByEvent = (data || []).reduce<Record<string, { count: number; gmIds: string[] }>>((acc, assignment) => {
        if (!acc[assignment.activity_id]) {
          acc[assignment.activity_id] = { count: 0, gmIds: [] };
        }
        acc[assignment.activity_id].count += 1;
        acc[assignment.activity_id].gmIds.push(assignment.gm_id);
        return acc;
      }, {});
      
      return assignmentsByEvent;
    }
  });
};