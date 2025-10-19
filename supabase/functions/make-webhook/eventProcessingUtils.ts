// Import du service de mapping des jeux
import { findMatchingGame } from './gameMappingService.ts';

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

// Normalize make_event_id by removing @google.com suffix to prevent duplicates
export const normalizeMakeEventId = (eventId: string): string => {
  if (!eventId) return eventId;
  return eventId.replace(/@google\.com$/, '');
};

export const cleanJsonString = (jsonString: string): string => {
  console.log('🧹 Cleaning JSON string - Safe mode...');
  
  // Nettoyer UNIQUEMENT les caractères de contrôle invisibles (pas les \n, \r, \t)
  // \x00-\x08: NULL à BACKSPACE
  // \x0B-\x0C: Vertical Tab, Form Feed (on garde \n=0x0A et \r=0x0D)
  // \x0E-\x1F: Shift Out à Unit Separator
  // \x7F-\x9F: DEL et contrôles C1
  let cleaned = jsonString
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, ' ')
    .replace(/[\u2000-\u206F\u2E00-\u2E7F]/g, ' ');
  
  // Supprimer les virgules trailing avant } ou ]
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
  
  // Normaliser les espaces multiples (mais garder les retours à la ligne)
  cleaned = cleaned.replace(/ +/g, ' ').trim();
  
  console.log(`✅ JSON cleaned safely. Original: ${jsonString.length}, Cleaned: ${cleaned.length}`);
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

// SIMPLIFIED TIME PROCESSING - USE RAW TIMES FROM MAKE
const parseRawDateTime = (datetimeString: string): { date: string; time: string } => {
  console.log(`📅 RAW TIME PROCESSING: Input '${datetimeString}'`);
  
  try {
    // Parse ISO datetime and extract date/time components directly
    const dt = new Date(datetimeString);
    
    if (isNaN(dt.getTime())) {
      throw new Error('Invalid date');
    }
    
    // Extract date in YYYY-MM-DD format
    const date = dt.toISOString().split('T')[0];
    
    // Extract time in HH:MM:SS format (using UTC components to avoid timezone conversion)
    const hours = dt.getUTCHours().toString().padStart(2, '0');
    const minutes = dt.getUTCMinutes().toString().padStart(2, '0');
    const seconds = dt.getUTCSeconds().toString().padStart(2, '0');
    const time = `${hours}:${minutes}:${seconds}`;
    
    console.log(`✅ RAW PARSED: '${datetimeString}' -> Date: ${date}, Time: ${time}`);
    return { date, time };
  } catch (error) {
    console.error(`❌ Error parsing datetime '${datetimeString}':`, error);
    // Fallback to current date/time
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = '12:00:00';
    console.log(`⚠️ Using fallback: Date: ${date}, Time: ${time}`);
    return { date, time };
  }
};

export const processEventData = async (makeEvent: MakeEvent, eventIndex: number, supabaseClient: any) => {
  console.log(`📝 [Event ${eventIndex + 1}] PROCESSING WITH GAME MAPPING: ${makeEvent.title}`);
  console.log(`📥 Raw start_datetime: '${makeEvent.start_datetime}'`);
  console.log(`📥 Raw end_datetime: '${makeEvent.end_datetime}'`);
  
  // Parse start time using raw processing
  const { date, time: startTime } = parseRawDateTime(makeEvent.start_datetime);
  
  // Parse end time
  let endTime: string;
  if (makeEvent.end_datetime) {
    const endResult = parseRawDateTime(makeEvent.end_datetime);
    endTime = endResult.time;
    console.log(`📥 End time from end_datetime: ${endTime}`);
  } else {
    // Calculate end time from duration
    const duration = Number(makeEvent.duration_minutes) || 60;
    const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
    const endMinutes = startMinutes + duration;
    const endHours = Math.floor(endMinutes / 60) % 24;
    const endMins = endMinutes % 60;
    endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}:00`;
    console.log(`📥 End time calculated from duration (${duration}min): ${endTime}`);
  }
  // Calculate duration
  let duration = Number(makeEvent.duration_minutes);
  if (!duration || duration <= 0) {
    // Calculate from start/end times
    const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
    const endMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
    duration = endMinutes - startMinutes;
    if (duration <= 0) duration = 60; // Default fallback
  }

  // Fix end_time si elle est <= start_time et qu'on a une duration
  let finalEndTime = endTime;
  const startMinutesForCheck = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
  const endMinutesForCheck = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
  
  if (endMinutesForCheck <= startMinutesForCheck && duration && duration > 0) {
    console.log(`⚠️ End time (${endTime}) <= start time (${startTime}), recalculating from duration (${duration}min)`);
    const correctedEndMinutes = startMinutesForCheck + duration;
    const correctedEndHours = Math.floor(correctedEndMinutes / 60) % 24;
    const correctedEndMins = correctedEndMinutes % 60;
    finalEndTime = `${correctedEndHours.toString().padStart(2, '0')}:${correctedEndMins.toString().padStart(2, '0')}:00`;
    console.log(`✅ Corrected end time: ${finalEndTime}`);
  }
  
  const { gm_info, halle_info } = extractGMAndHalleInfo(makeEvent.description || '');
  
  // Build required skills array
  const requiredSkills: string[] = [];
  if (gm_info && gm_info !== '???') requiredSkills.push(`GM: ${gm_info}`);
  if (halle_info) requiredSkills.push(`Halle: ${halle_info}`);
  
  const processedEvent = {
    title: (makeEvent.title || 'Événement sans titre').trim(),
    description: makeEvent.description || '',
    date,
    start_time: startTime,
    end_time: finalEndTime,
    duration,
    activity_type: makeEvent.activity_type || 'gaming',
    required_skills: requiredSkills,
    make_event_id: normalizeMakeEventId(makeEvent.event_id || `generated-${Date.now()}-${Math.random()}`),
    event_source: 'make',
    calendar_source: 'unknown' // Will be overridden by webhookProcessor
    // ⚠️ status et is_assigned ne sont pas définis ici - ils seront définis dans webhookProcessor lors de la création/mise à jour
  };
  
  console.log(`✅ [Event ${eventIndex + 1}] INITIAL PROCESSED: ${date} ${startTime}-${finalEndTime} (${duration}min) - ${processedEvent.title}`);
  console.log(`📋 Required skills: [${requiredSkills.join(', ')}]`);
  
  // 🎮 NOUVEAU: Résolution du mapping de jeu pour appliquer la durée administrative
  let finalDuration = duration;
  let adjustedEndTime = finalEndTime;
  let gameId: string | null = null;
  let durationSource: 'make_import' | 'game_mapping' = 'make_import';
  
  console.log(`🎮 [Event ${eventIndex + 1}] Searching for game mapping: "${processedEvent.title}"`);
  
  try {
    const gameMatch = await findMatchingGame(processedEvent.title, supabaseClient);
    
    console.log(`🎮 [Event ${eventIndex + 1}] Game match result:`, {
      gameName: gameMatch.gameName,
      confidence: gameMatch.confidence,
      averageDuration: gameMatch.averageDuration
    });
    
    // Si confiance élevée (>80%) ET durée administrative disponible
    if (gameMatch.confidence > 80 && gameMatch.averageDuration) {
      const originalDuration = finalDuration;
      finalDuration = gameMatch.averageDuration;
      gameId = gameMatch.gameId;
      durationSource = 'game_mapping';
      
      // Recalculer end_time avec la durée administrative
      const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
      const newEndMinutes = startMinutes + finalDuration;
      const newEndHours = Math.floor(newEndMinutes / 60) % 24;
      const newEndMins = newEndMinutes % 60;
      adjustedEndTime = `${newEndHours.toString().padStart(2, '0')}:${newEndMins.toString().padStart(2, '0')}:00`;
      
      console.log(`🎮✨ [Event ${eventIndex + 1}] DURATION ADJUSTED:`);
      console.log(`   Game recognized: "${gameMatch.gameName}" (confidence: ${gameMatch.confidence}%)`);
      console.log(`   Duration: ${originalDuration}min (Make) → ${finalDuration}min (Admin config)`);
      console.log(`   End time: ${finalEndTime} → ${adjustedEndTime}`);
    } else {
      console.log(`🎮 [Event ${eventIndex + 1}] Using Make duration (confidence: ${gameMatch.confidence}%, ${gameMatch.averageDuration ? 'low confidence' : 'no admin duration'})`);
    }
  } catch (error) {
    console.error(`❌ [Event ${eventIndex + 1}] Error finding game match:`, error);
    console.log(`⚠️ [Event ${eventIndex + 1}] Falling back to Make duration`);
  }
  
  // Retour avec les nouveaux champs et la durée ajustée si nécessaire
  return {
    ...processedEvent,
    duration: finalDuration,
    end_time: adjustedEndTime,
    game_id: gameId,
    duration_source: durationSource
  };
};

export const hasEventChanged = (existingEvent: any, newEventData: any): boolean => {
  const fieldsToCompare = [
    'title', 'description', 'date', 'start_time', 'end_time', 'duration'
  ];
  
  for (const field of fieldsToCompare) {
    if (existingEvent[field] !== newEventData[field]) {
      console.log(`🔄 CHANGE DETECTED in field '${field}': '${existingEvent[field]}' -> '${newEventData[field]}'`);
      return true;
    }
  }
  
  console.log(`✅ NO CHANGES detected - event unchanged`);
  return false;
};

export const unassignGMFromActivity = async (activityId: string, supabaseClient: any) => {
  console.log(`🔄 UNASSIGNING GM from activity: ${activityId}`);
  
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
      console.log('✅ GM successfully unassigned');
    }
  } catch (error) {
    console.error('💥 Error in unassignment:', error);
  }
};