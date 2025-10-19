
import { cleanJsonString } from './jsonCleaner';

export interface MakeEvent {
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

export const processEventData = (rawData: any): MakeEvent[] => {
  console.log('🔄 Processing event data...');
  
  try {
    let events: any[] = [];
    
    if (Array.isArray(rawData)) {
      events = rawData;
    } else if (typeof rawData === 'string') {
      const cleanedData = cleanJsonString(rawData);
      const parsed = JSON.parse(cleanedData);
      events = Array.isArray(parsed) ? parsed : [parsed];
    } else if (rawData && typeof rawData === 'object') {
      if (rawData.events) {
        events = Array.isArray(rawData.events) ? rawData.events : [rawData.events];
      } else {
        events = [rawData];
      }
    }
    
    return events.map(event => ({
      event_id: event.event_id || event.id || '',
      title: cleanEventTitle(event.title || event.summary || ''),
      description: cleanEventDescription(event.description || ''),
      start_datetime: event.start_datetime || event.start || '',
      end_datetime: event.end_datetime || event.end || '',
      duration_minutes: parseDuration(event.duration_minutes || event.duration || 0),
      location: event.location || '',
      activity_type: determineActivityType(event.title || event.summary || ''),
      calendar_source: event.calendar_source || 'make',
      last_modified: event.last_modified || new Date().toISOString()
    }));
    
  } catch (error) {
    console.error('❌ Error processing event data:', error);
    return [];
  }
};

const cleanEventTitle = (title: string): string => {
  if (!title) return 'Événement sans titre';
  
  return title
    .replace(/[\r\n\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const cleanEventDescription = (description: string): string => {
  if (!description) return '';
  
  return description
    .replace(/[\r\n\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const parseDuration = (duration: any): number => {
  if (typeof duration === 'number') return duration;
  if (typeof duration === 'string') {
    const num = parseInt(duration, 10);
    return isNaN(num) ? 60 : num;
  }
  return 60;
};

const determineActivityType = (title: string): string => {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('formation') || titleLower.includes('training')) {
    return 'formation';
  }
  
  if (titleLower.includes('maintenance') || titleLower.includes('nettoyage')) {
    return 'maintenance';
  }
  
  if (titleLower.includes('admin') || titleLower.includes('réunion')) {
    return 'admin';
  }
  
  return 'gaming';
};

// Amélioration de l'extraction GM et Halle avec REGEX plus robustes
export const extractGMAndHalleInfo = (description: string): { gm?: string; halle?: string; phone?: string; email?: string } => {
  if (!description) return {};
  
  const result: { gm?: string; halle?: string; phone?: string; email?: string } = {};
  
  // Patterns améliorés pour GM (plus flexibles)
  const gmPatterns = [
    /(?:GM|Game\s*Master|Maître\s*de\s*jeu)\s*:?\s*([A-Za-zÀ-ÿ\s\-']+?)(?:\s*-|\s*\||$|Halle|Salle|Tel|Email|@)/i,
    /(?:Animateur|Responsable)\s*:?\s*([A-Za-zÀ-ÿ\s\-']+?)(?:\s*-|\s*\||$|Halle|Salle|Tel|Email|@)/i,
    /(?:^|\n|\r)([A-Za-zÀ-ÿ\s\-']{2,30})\s*-?\s*(?:GM|Game Master)/i
  ];

  for (const pattern of gmPatterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      const gmName = match[1].trim()
        .replace(/[-\s]+$/, '') // Enlever tirets et espaces en fin
        .replace(/^[-\s]+/, ''); // Enlever tirets et espaces en début
      
      if (gmName.length > 1 && gmName.length < 50) {
        result.gm = gmName;
        break;
      }
    }
  }
  
  // Patterns améliorés pour Halle/Salle
  const hallePatterns = [
    /(?:Halle|Salle|Hall|Room)\s*:?\s*([A-Za-z0-9\s\-']{1,20})(?:\s*-|\s*\||$|GM|Tel|Email|@)/i,
    /(?:Lieu|Location)\s*:?\s*([A-Za-z0-9\s\-']{1,30})(?:\s*-|\s*\||$|GM|Tel|Email|@)/i,
    /(?:^|\n|\r)(Halle\s*[A-Za-z0-9\s\-']{1,15})(?:\s*-|\s*\||$)/i
  ];

  for (const pattern of hallePatterns) {
    const match = description.match(pattern);
    if (match && match[1]) {
      const halleName = match[1].trim()
        .replace(/[-\s]+$/, '')
        .replace(/^[-\s]+/, '');
      
      if (halleName.length > 0 && halleName.length < 30) {
        result.halle = halleName;
        break;
      }
    }
  }

  // Pattern pour téléphone
  const phonePattern = /(?:Tel|Tél|Phone|Mobile)\s*:?\s*((?:\+41\s*)?(?:\d{2,3}\s*){2,4}\d{2,4})/i;
  const phoneMatch = description.match(phonePattern);
  if (phoneMatch) {
    result.phone = phoneMatch[1].trim();
  }

  // Pattern pour email
  const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
  const emailMatch = description.match(emailPattern);
  if (emailMatch) {
    result.email = emailMatch[1].trim();
  }

  console.log('Extracted info from description:', result);
  return result;
};

// Fonction pour formater les informations extraites pour l'affichage
export const formatExtractedInfo = (info: ReturnType<typeof extractGMAndHalleInfo>): string => {
  const parts = [];
  
  if (info.gm) {
    parts.push(`👤 GM: ${info.gm}`);
  }
  
  if (info.halle) {
    parts.push(`🏢 Lieu: ${info.halle}`);
  }
  
  if (info.phone) {
    parts.push(`📞 Tel: ${info.phone}`);
  }
  
  if (info.email) {
    parts.push(`📧 Email: ${info.email}`);
  }
  
  return parts.join(' • ');
};
