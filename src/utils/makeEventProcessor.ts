interface MakeEvent {
  event_id: string;
  title: string;
  description?: string;
  start_datetime: string;
  end_datetime: string;
  duration_minutes: number;
  location?: string;
  activity_type?: string;
  calendar_source?: string;
  last_modified?: string;
}

interface ProcessedEventData {
  title: string;
  description: string;
  date: string;
  start_time: string;
  end_time: string;
  duration: number;
  activity_type: string;
  required_skills: string[];
  make_event_id: string;
  event_source: string;
  status: string;
  is_assigned: boolean;
  gm_info?: string;
  halle_info?: string;
}

export const cleanJsonString = (jsonString: string): string => {
  console.log('🧹 Cleaning JSON string...');
  
  try {
    // Test si c'est déjà un JSON valide
    JSON.parse(jsonString);
    return jsonString;
  } catch {
    // Nettoyage si nécessaire
    let cleaned = jsonString
      .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/"\s*\n\s*"/g, '\\n')
      .replace(/"\n/g, '\\n"')
      .replace(/\n"/g, '\\n"')
      .replace(/[\u2000-\u206F\u2E00-\u2E7F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(`✅ JSON cleaned. Length: ${cleaned.length}`);
    return cleaned;
  }
};

export const validateEventData = (event: any, eventIndex: number): boolean => {
  console.log(`🔍 [Event ${eventIndex + 1}] Validating: ${event?.title || 'Unknown'}`);
  
  // Validation ultra-simple - juste vérifier l'existence du titre
  if (!event || !event.title) {
    console.log(`❌ [Event ${eventIndex + 1}] Missing title`);
    return false;
  }

  console.log(`✅ [Event ${eventIndex + 1}] Validation passed`);
  return true;
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

export const processEventData = (makeEvent: MakeEvent, eventIndex: number): ProcessedEventData => {
  console.log(`📝 [Event ${eventIndex + 1}] Processing event data...`);
  
  // Gestion robuste des dates avec fallbacks
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
      const durationMs = (makeEvent.duration_minutes || 60) * 60 * 1000;
      endDate = new Date(startDate.getTime() + durationMs);
    }
  } catch (error) {
    console.log(`⚠️ [Event ${eventIndex + 1}] Error with end_datetime, calculating from duration`);
    const durationMs = (makeEvent.duration_minutes || 60) * 60 * 1000;
    endDate = new Date(startDate.getTime() + durationMs);
  }
  
  // Extraire les informations GM et Halle
  const { gm_info, halle_info } = extractGMAndHalleInfo(makeEvent.description || '');
  
  // Calculer la durée en minutes
  let duration = makeEvent.duration_minutes;
  if (!duration || duration <= 0) {
    duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
  }
  
  if (!duration || duration <= 0) {
    duration = 60; // Durée par défaut
  }
  
  // Construire les compétences requises
  const requiredSkills: string[] = [];
  if (gm_info && gm_info !== '???') requiredSkills.push(`GM: ${gm_info}`);
  if (halle_info) requiredSkills.push(`Halle: ${halle_info}`);
  
  const processedData: ProcessedEventData = {
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
    is_assigned: false,
    gm_info,
    halle_info
  };
  
  console.log(`✅ [Event ${eventIndex + 1}] Event data processed successfully`);
  return processedData;
};

export const shouldCreateNewEvent = async (makeEventId: string, supabaseClient: any): Promise<boolean> => {
  try {
    const { data: existingEvent, error } = await supabaseClient
      .from('activities')
      .select('id, make_event_id')
      .eq('make_event_id', makeEventId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking existing event:', error);
      return true;
    }

    return !existingEvent;
  } catch (error) {
    console.error('Error in shouldCreateNewEvent:', error);
    return true;
  }
};
