
// Re-export des fonctions pour maintenir la compatibilité
export { processEventData, extractGMAndHalleInfo } from './eventDataProcessor';
export { hasEventChanged, getEventChanges } from './eventChangeDetector';
export { sendEventChangeNotification } from './eventNotificationService';
export { unassignGMFromActivity } from './gmUnassignmentService';
export { cleanJsonString } from './jsonCleaner';

// Interface principale pour compatibilité
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
