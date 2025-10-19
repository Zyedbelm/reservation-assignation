
import { sendNotification } from './centralizedNotificationService';

export const unassignGMFromActivity = async (activityId: string, supabaseClient: any, eventData?: any) => {
  console.log(`🔄 Unassigning GM from activity: ${activityId}`);
  
  try {
    // Récupérer l'activité avec les infos du GM assigné AVANT la désassignation
    const { data: activityWithGM, error: fetchError } = await supabaseClient
      .from('activities')
      .select('*, assigned_gm_id')
      .eq('id', activityId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching activity before unassignment:', fetchError);
    }

    // Supprimer les assignations existantes
    const { error: deleteAssignmentError } = await supabaseClient
      .from('event_assignments')
      .delete()
      .eq('activity_id', activityId);

    if (deleteAssignmentError) {
      console.error('❌ Error deleting assignments:', deleteAssignmentError);
    } else {
      console.log('✅ Assignments deleted successfully');
    }

    // Mettre à jour l'activité pour enlever l'assignation
    const { error: updateError } = await supabaseClient
      .from('activities')
      .update({
        assigned_gm_id: null,
        is_assigned: false,
        assignment_date: null,
        assignment_score: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', activityId);

    if (updateError) {
      console.error('❌ Error updating activity:', updateError);
    } else {
      console.log('✅ Activity unassigned successfully');
    }

    // Envoyer une notification au GM si il était assigné et qu'on a les données de l'événement
    if (activityWithGM?.assigned_gm_id && eventData) {
      console.log('📧 Sending cancellation notification due to unassignment...');
      
      // Récupérer les infos du GM
      const { data: gmData } = await supabaseClient
        .from('game_masters')
        .select('name, email')
        .eq('id', activityWithGM.assigned_gm_id)
        .single();

      if (gmData?.email) {
        await sendNotification({
          gmEmail: gmData.email,
          gmName: gmData.name,
          changeType: 'cancelled',
          eventData: activityWithGM
        });
      }
    }

  } catch (error) {
    console.error('💥 Error in unassignGMFromActivity:', error);
  }
};
