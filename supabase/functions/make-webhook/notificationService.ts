
export const sendEventChangeNotification = async (
  gmId: string,
  changeType: 'cancelled' | 'modified',
  originalEvent: any,
  updatedEvent?: any,
  supabaseClient?: any
) => {
  if (!supabaseClient || !gmId) return;
  
  try {
    console.log(`📧 Sending ${changeType} notification to GM: ${gmId}`);
    
    const { data: gmData, error: gmError } = await supabaseClient
      .from('game_masters')
      .select('name, email')
      .eq('id', gmId)
      .single();

    if (gmError || !gmData?.email) {
      console.error('❌ Error fetching GM data:', gmError);
      return;
    }

    const changes = changeType === 'modified' && updatedEvent 
      ? getEventChanges(originalEvent, updatedEvent) 
      : [];

    const { data: emailResult, error: emailError } = await supabaseClient.functions.invoke(
      'send-event-change-notification',
      {
        body: {
          gmEmail: gmData.email,
          gmName: gmData.name,
          changeType,
          originalEvent,
          updatedEvent,
          changes
        }
      }
    );

    if (emailError) {
      console.error('❌ Error sending change notification email:', emailError);
    } else {
      console.log('✅ Change notification email sent successfully:', emailResult);
    }

  } catch (error) {
    console.error('💥 Error in sendEventChangeNotification:', error);
  }
};

const getEventChanges = (existingEvent: any, newEventData: any): string[] => {
  const changes: string[] = [];
  
  if (existingEvent.title !== newEventData.title) {
    changes.push(`Titre modifié : "${existingEvent.title}" → "${newEventData.title}"`);
  }
  
  if (existingEvent.description !== newEventData.description) {
    changes.push(`Description mise à jour`);
  }
  
  if (existingEvent.date !== newEventData.date) {
    const oldDate = new Date(existingEvent.date).toLocaleDateString('fr-FR');
    const newDate = new Date(newEventData.date).toLocaleDateString('fr-FR');
    changes.push(`Date modifiée : ${oldDate} → ${newDate}`);
  }
  
  if (existingEvent.start_time !== newEventData.start_time || existingEvent.end_time !== newEventData.end_time) {
    const oldTime = `${existingEvent.start_time.substring(0, 5)} - ${existingEvent.end_time.substring(0, 5)}`;
    const newTime = `${newEventData.start_time.substring(0, 5)} - ${newEventData.end_time.substring(0, 5)}`;
    changes.push(`Horaire modifié : ${oldTime} → ${newTime}`);
  }
  
  if (existingEvent.duration !== newEventData.duration) {
    changes.push(`Durée modifiée : ${existingEvent.duration} min → ${newEventData.duration} min`);
  }
  
  return changes;
};
