
// Edge function pour synchroniser Google Calendar avec Bookeo
export const syncGoogleCalendar = async () => {
  try {
    const response = await fetch('/api/sync-calendar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to sync calendar');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error syncing calendar:', error);
    throw error;
  }
};

export const triggerManualSync = async () => {
  return syncGoogleCalendar();
};
