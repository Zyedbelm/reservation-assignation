
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Activity {
  id: string;
  title: string;
  description?: string;
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
  activity_type: string;
  required_skills?: string[];
  assigned_gm_id?: string; // Primary GM for backward compatibility
  assigned_gms?: string[]; // Array of all assigned GM IDs
  assigned_gms_count?: number; // Number of assigned GMs
  assignment_orders?: Record<string, number>; // GM ID -> assignment order mapping
  is_assigned?: boolean;
  status: string;
  google_event_id?: string;
  bookeo_id?: string;
  make_event_id?: string;
  event_source?: string;
  created_at: string;
  updated_at: string;
}

export const useActivities = (date?: string) => {
  return useQuery({
    queryKey: ['activities', date],
    queryFn: async () => {
      let query = supabase
        .from('activities')
        .select(`
          *,
          event_assignments!left (
            gm_id,
            status,
            assignment_order
          )
        `)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });
      
      if (date) {
        query = query.eq('date', date);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Map the data to include multi-GM support
      const activities = (data || []).map(activity => {
        const assignments = activity.event_assignments || [];
        
        // Sort assignments by order
        const sortedAssignments = assignments.sort((a, b) => 
          (a.assignment_order || 1) - (b.assignment_order || 1)
        );
        
        // Extract assigned GMs from new system
        const newSystemGms = sortedAssignments.map(assignment => assignment.gm_id).filter(Boolean);
        
        // Handle backward compatibility: if no new assignments but old assigned_gm_id exists
        const legacyGmId = activity.assigned_gm_id;
        const hasLegacyAssignment = legacyGmId && newSystemGms.length === 0;
        
        // Final assigned GMs list
        const assignedGms = hasLegacyAssignment ? [legacyGmId] : newSystemGms;
        
        // Primary GM (first in order) for backward compatibility
        const primaryGmId = assignedGms[0] || legacyGmId;
        
        // Determine if assigned (either new system or legacy system)
        const isAssigned = assignedGms.length > 0 || Boolean(legacyGmId);
        
        return {
          ...activity,
          assigned_gm_id: primaryGmId, // Backward compatibility
          assigned_gms: assignedGms, // New multi-GM support
          assigned_gms_count: assignedGms.length,
          is_assigned: isAssigned,
          assignment_orders: hasLegacyAssignment && legacyGmId 
            ? { [legacyGmId]: 1 } 
            : sortedAssignments.reduce((acc, assignment) => {
                if (assignment.gm_id) {
                  acc[assignment.gm_id] = assignment.assignment_order || 1;
                }
                return acc;
              }, {} as Record<string, number>)
        };
      });
      
      return activities as unknown as Activity[];
    }
  });
};

export const useCreateActivity = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (activity: Omit<Activity, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('activities')
        .insert([activity])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate all related queries for immediate UI refresh
      queryClient.invalidateQueries({ queryKey: ['activities'] });
      queryClient.invalidateQueries({ queryKey: ['all-events'] });
      queryClient.invalidateQueries({ queryKey: ['list-events'] });
    }
  });
};
