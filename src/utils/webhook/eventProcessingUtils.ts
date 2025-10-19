
interface MakeEvent {
  event_id: string;
  title: string;
  description?: string;
  start_datetime: string;
  end_datetime: string;
  duration_minutes: number | string;
  location?: string;
  activity_type?: string;
  calendar_source?: string;
  last_modified?: string;
}

export const cleanJsonString = (jsonString: string): string => {
  console.log('🧹 Cleaning JSON string...');
  
  let cleaned = jsonString
    .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')
    .replace(/\\n/g, '\\n')
    .replace(/\\r/g, '\\r')
    .replace(/\\t/g, '\\t')
    .replace(/"\s*\n\s*"/g, '\\n')
    .replace(/"\n/g, '\\n"')
    .replace(/\n"/g, '\\n"')
    .replace(/[\u2000-\u206F\u2E00-\u2E7F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  console.log(`✅ JSON cleaned. Original length: ${jsonString.length}, Cleaned length: ${cleaned.length}`);
  return cleaned;
};

export const extractGMAndHalleInfo = (description: string): { gm_info?: string; halle_info?: string } => {
  if (!description) return {};
  
  console.log('🔍 Extracting GM and Halle info from description...');
  
  const gmPatterns = [
    /GM\s*:?\s*([^\n\r]+)/i,
    /Game\s*Master\s*:?\s*([^\n\r]+)/i,
    /Animateur\s*:?\s*([^\n\r]+)/i,
    /Maître\s*de\s*jeu\s*:?\s*([^\n\r]+)/i
  ];
  
  const hallePatterns = [
    /Halle\(?s?\)?\s*:?\s*([^\n\r]+)/i,
    /Salle\(?s?\)?\s*:?\s*([^\n\r]+)/i,
    /Location\s*:?\s*([^\n\r]+)/i,
    /Lieu\s*:?\s*([^\n\r]+)/i
  ];
  
  let gm_info: string | undefined;
  let halle_info: string | undefined;
  
  for (const pattern of gmPatterns) {
    const match = description.match(pattern);
    if (match && match[1] && match[1].trim() && !['???', '?', '-', 'TBD', 'N/A'].includes(match[1].trim())) {
      gm_info = match[1].trim();
      console.log(`✅ GM info found: ${gm_info}`);
      break;
    }
  }
  
  for (const pattern of hallePatterns) {
    const match = description.match(pattern);
    if (match && match[1] && match[1].trim()) {
      halle_info = match[1].trim();
      console.log(`✅ Halle info found: ${halle_info}`);
      break;
    }
  }
  
  return { gm_info, halle_info };
};

export const processEventData = (makeEvent: MakeEvent, eventIndex: number) => {
  console.log(`📝 [Event ${eventIndex + 1}] Processing: ${makeEvent.title}`);
  
  let startDate: Date;
  let endDate: Date;
  
  try {
    startDate = new Date(makeEvent.start_datetime);
    if (isNaN(startDate.getTime())) {
      console.log(`⚠️ [Event ${eventIndex + 1}] Invalid start_datetime, using current date`);
      startDate = new Date();
    }
  } catch (error) {
    console.log(`⚠️ [Event ${eventIndex + 1}] Error parsing start_datetime:`, error);
    startDate = new Date();
  }
  
  try {
    if (makeEvent.end_datetime) {
      endDate = new Date(makeEvent.end_datetime);
      if (isNaN(endDate.getTime())) {
        throw new Error('Invalid end date');
      }
    } else {
      const durationMs = (Number(makeEvent.duration_minutes) || 60) * 60 * 1000;
      endDate = new Date(startDate.getTime() + durationMs);
    }
  } catch (error) {
    console.log(`⚠️ [Event ${eventIndex + 1}] Error with end_datetime, calculating from duration`);
    const durationMs = (Number(makeEvent.duration_minutes) || 60) * 60 * 1000;
    endDate = new Date(startDate.getTime() + durationMs);
  }
  
  const { gm_info, halle_info } = extractGMAndHalleInfo(makeEvent.description || '');
  
  let duration = Number(makeEvent.duration_minutes);
  if (!duration || duration <= 0) {
    duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
  }
  
  if (!duration || duration <= 0) {
    duration = 60;
  }
  
  const requiredSkills: string[] = [];
  if (gm_info && gm_info !== '???') requiredSkills.push(`GM: ${gm_info}`);
  if (halle_info) requiredSkills.push(`Halle: ${halle_info}`);
  
  return {
    title: (makeEvent.title || 'Événement sans titre').trim(),
    description: makeEvent.description || '',
    date: startDate.toISOString().split('T')[0],
    start_time: startDate.toTimeString().split(' ')[0],
    end_time: endDate.toTimeString().split(' ')[0],
    duration,
    activity_type: makeEvent.activity_type || 'gaming',
    required_skills: requiredSkills,
    make_event_id: makeEvent.event_id || `generated-${Date.now()}-${Math.random()}`,
    event_source: 'make',
    status: 'pending',
    is_assigned: false
  };
};

export const hasEventChanged = (existingEvent: any, newEventData: any): boolean => {
  const fieldsToCompare = [
    'title', 'description', 'date', 'start_time', 'end_time', 'duration'
  ];
  
  for (const field of fieldsToCompare) {
    if (existingEvent[field] !== newEventData[field]) {
      console.log(`🔄 🎯 CHANGE DETECTED in field '${field}': '${existingEvent[field]}' -> '${newEventData[field]}'`);
      return true;
    }
  }
  
  console.log(`✅ 🎯 NO CHANGES detected - event unchanged`);
  return false;
};

export const unassignGMFromActivity = async (activityId: string, supabaseClient: any) => {
  console.log(`🔄 🎯 TARGETED UNASSIGNMENT: Unassigning GM from activity: ${activityId}`);
  
  try {
    const { error: deleteAssignmentError } = await supabaseClient
      .from('event_assignments')
      .delete()
      .eq('activity_id', activityId);

    if (deleteAssignmentError) {
      console.error('❌ Error deleting assignments:', deleteAssignmentError);
    } else {
      console.log('✅ Event assignments deleted successfully');
    }

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
      console.log('✅ 🎯 ACTIVITY UNASSIGNED: GM successfully unassigned due to time slot change');
    }
  } catch (error) {
    console.error('💥 Error in targeted unassignment:', error);
  }
};
