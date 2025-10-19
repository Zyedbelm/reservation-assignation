
import { Clock, Users, Flag } from 'lucide-react';
import { Activity } from '@/hooks/useActivities';
import { useAllEventAssignments } from '@/hooks/useEventAssignments';
import { extractOptions } from '@/utils/eventOptionsExtractor';

interface EventBlockProps {
  event: Activity & { eventType?: 'own' | 'preceding' | 'following'; colorClass?: string };
  style: {
    top: string;
    height: string;
  };
  getGMName: (gmId: string) => string;
  onEventClick: (event: Activity & { eventType?: 'own' | 'preceding' | 'following'; colorClass?: string }) => void;
}

const EventBlock = ({ event, style, getGMName, onEventClick }: EventBlockProps) => {
  const { data: assignmentsByEvent = {} } = useAllEventAssignments();
  const isPreceding = event.eventType === 'preceding';
  const isFollowing = event.eventType === 'following';
  const assignmentData = assignmentsByEvent[event.id];
  const gmCount = assignmentData?.count || (event.assigned_gm_id ? 1 : 0);
  const options = extractOptions(event.description || '');
  
  const baseClasses = "absolute left-1 right-1 text-white rounded-lg p-2 cursor-pointer transition-all duration-200 shadow-md hover:shadow-lg z-10";
  const ownEventClasses = event.colorClass 
    ? `bg-gradient-to-r ${event.colorClass} border-l-4 border-white/30`
    : "bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 border-l-4 border-green-300";
  const precedingEventClasses = "bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 border-l-4 border-gray-300 opacity-60";
  const followingEventClasses = "bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 border-l-4 border-blue-300 opacity-60";
  
  const optionsSummary = options.length > 0
    ? `\nOptions:\n- ${options.slice(0, 5).join('\n- ')}${options.length > 5 ? '\n...' : ''}`
    : '';
  const optionsPreview = options.length > 0
    ? `${options.slice(0, 2).join(', ')}${options.length > 2 ? ` (+${options.length - 2})` : ''}`
    : '';
  
  const tooltipText = isPreceding 
    ? `${event.title}\n${event.start_time.substring(0, 5)}-${event.end_time.substring(0, 5)}\nGM: ${getGMName(event.assigned_gm_id || '')}\n(Événement précédent - lecture seule)${optionsSummary}`
    : isFollowing
    ? `${event.title}\n${event.start_time.substring(0, 5)}-${event.end_time.substring(0, 5)}\nGM: ${getGMName(event.assigned_gm_id || '')}\n(Événement suivant - lecture seule)${optionsSummary}`
    : `${event.title}\n${event.start_time.substring(0, 5)}-${event.end_time.substring(0, 5)}\nGM: ${getGMName(event.assigned_gm_id || '')}${gmCount > 1 ? ` (+${gmCount - 1} autres)` : ''}${optionsSummary}`;

  return (
    <div
      className={`${baseClasses} ${
        isPreceding ? precedingEventClasses : 
        isFollowing ? followingEventClasses : 
        ownEventClasses
      }`}
      style={style}
      title={tooltipText}
      onClick={() => onEventClick(event)}
    >
      <div className="flex items-start gap-1 mb-1">
        <div className="text-sm font-semibold truncate flex-1">
          {event.title}
        </div>
        {(event as any).admin_notes?.trim() && (
          <Flag className="w-3 h-3 text-yellow-300 flex-shrink-0" fill="currentColor" />
        )}
        {options.length > 0 && (
          <span className="inline-flex items-center rounded border border-yellow-300 bg-yellow-100 text-yellow-800 text-[10px] px-1 py-0.5 flex-shrink-0">
            📋 {options.length}
          </span>
        )}
      </div>
      <div className="text-xs opacity-90 flex items-center gap-1 mb-1">
        <Clock className="w-3 h-3" />
        {event.start_time.substring(0, 5)}-{event.end_time.substring(0, 5)}
      </div>
      {gmCount > 1 && (
        <div className="text-xs opacity-90 flex items-center gap-1">
          <Users className="w-3 h-3" />
          {gmCount} GMs
        </div>
      )}
      {(isPreceding || isFollowing) && (
        <div className="text-xs opacity-80 truncate">
          GM: {getGMName(event.assigned_gm_id || '')}
        </div>
      )}
      
      {options.length > 0 && (
        <div className="mt-1 bg-yellow-50 border border-yellow-300 rounded px-1.5 py-0.5 text-[10px] text-yellow-900 truncate">
          📋 {optionsPreview}
        </div>
      )}
    </div>
  );
};

export default EventBlock;
