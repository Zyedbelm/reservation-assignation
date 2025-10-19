
interface EventData {
  title: string;
  description?: string;
  start_datetime: string;
  end_datetime: string;
  duration_minutes?: number;
  activity_type?: string;
  required_skills?: string[];
  location?: string;
}

export const validateEventData = (event: any): EventData | null => {
  try {
    // Validation des champs obligatoires
    if (!event.title || typeof event.title !== 'string') {
      console.warn('Event missing or invalid title:', event);
      return null;
    }

    if (!event.start_datetime || !event.end_datetime) {
      console.warn('Event missing datetime fields:', event);
      return null;
    }

    // Validation des dates
    const startDate = new Date(event.start_datetime);
    const endDate = new Date(event.end_datetime);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.warn('Event has invalid dates:', event);
      return null;
    }

    if (startDate >= endDate) {
      console.warn('Event start date is after end date:', event);
      return null;
    }

    // Calculer la durée si non fournie
    let duration = event.duration_minutes;
    if (!duration || typeof duration !== 'number') {
      duration = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60));
    }

    // Nettoyer et valider les compétences requises
    let requiredSkills: string[] = [];
    if (Array.isArray(event.required_skills)) {
      requiredSkills = event.required_skills.filter(skill => 
        typeof skill === 'string' && skill.trim().length > 0
      );
    }

    // Extraire les compétences de la description si nécessaire
    if (event.description && !requiredSkills.length) {
      const gmMatch = event.description.match(/GM\s*:\s*([^\\n]+)/);
      const halleMatch = event.description.match(/Halle\(s\)\s*:\s*([^\\n]+)/);
      
      if (gmMatch && gmMatch[1].trim() !== '???') {
        requiredSkills.push(gmMatch[1].trim());
      }
      if (halleMatch) {
        requiredSkills.push(`Halle: ${halleMatch[1].trim()}`);
      }
    }

    return {
      title: event.title.trim(),
      description: event.description ? event.description.trim() : '',
      start_datetime: event.start_datetime,
      end_datetime: event.end_datetime,
      duration_minutes: duration,
      activity_type: event.activity_type || 'gaming',
      required_skills: requiredSkills,
      location: event.location ? event.location.trim() : ''
    };

  } catch (error) {
    console.error('Error validating event data:', error);
    return null;
  }
};

export const cleanJsonString = (jsonString: string): string => {
  // Supprimer les caractères de contrôle
  let cleaned = jsonString.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Supprimer les caractères d'échappement problématiques
  cleaned = cleaned.replace(/\\n/g, '\n');
  cleaned = cleaned.replace(/\\r/g, '\r');
  cleaned = cleaned.replace(/\\t/g, '\t');
  
  // Réparer les fins de ligne dans les descriptions
  cleaned = cleaned.replace(/"\n/g, '\\n"');
  cleaned = cleaned.replace(/\n"/g, '\\n"');
  
  return cleaned.trim();
};

export const formatEventForDisplay = (event: any) => {
  const startDate = new Date(event.start_datetime || event.date + 'T' + event.start_time);
  const endDate = new Date(event.end_datetime || event.date + 'T' + event.end_time);
  
  return {
    title: event.title,
    date: startDate.toLocaleDateString('fr-FR'),
    time: `${startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`,
    duration: event.duration || Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60)),
    type: event.activity_type || 'gaming',
    skills: Array.isArray(event.required_skills) ? event.required_skills : [],
    location: event.location || 'Non spécifié'
  };
};
