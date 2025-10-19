
export const hasEventChanged = (existingEvent: any, newEventData: any): boolean => {
  const fieldsToCompare = [
    'title', 'description', 'date', 'start_time', 'end_time', 'duration'
  ];
  
  for (const field of fieldsToCompare) {
    if (existingEvent[field] !== newEventData[field]) {
      console.log(`🔄 Change detected in field '${field}': '${existingEvent[field]}' -> '${newEventData[field]}'`);
      return true;
    }
  }
  
  return false;
};

export const getEventChanges = (existingEvent: any, newEventData: any): string[] => {
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
