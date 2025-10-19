
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, User, Phone, Flag } from 'lucide-react';
import { useGameMasters } from '@/hooks/useGameMasters';
import { useMemo } from 'react';
import { extractOptions } from '@/utils/eventOptionsExtractor';

interface EventsListViewProps {
  filteredEvents: any[];
  onEventClick: (event: any) => void;
  allEvents?: any[];
  showPrecedingInfo?: boolean;
}

const EventsListView = ({ filteredEvents, onEventClick, allEvents = [], showPrecedingInfo = false }: EventsListViewProps) => {
  const { data: gms = [] } = useGameMasters();
  const gmById = useMemo(() => {
    const map: Record<string, any> = {};
    gms.forEach((gm) => { if (gm.id) map[gm.id] = gm; });
    return map;
  }, [gms]);

  // Normalise un titre pour comparer les jeux (ignore lieu, compteur, chiffres romains)
  const normalizeGameKey = (title?: string) => {
    if (!title) return '';
    const base = title.split(' - ')[0];
    return base
      .replace(/\[[^\]]+\]/g, '') // remove [5]
      .replace(/\b(i{1,3}|iv|v|vi{1,3}|x)\b/gi, '') // remove roman numerals
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const findPreviousSameGameEvent = (current: any) => {
    if (!showPrecedingInfo || !current) return null;
    const key = normalizeGameKey(current.title);
    const sameDay = (e: any) => e.date === current.date;
    const sameGame = (e: any) => normalizeGameKey(e.title) === key;
    const earlier = (e: any) => e.start_time < current.start_time;
    const candidates = allEvents.filter((e) => sameDay(e) && sameGame(e) && earlier(e) && e.assigned_gm_id);
    if (candidates.length === 0) return null;
    // pick the latest before current
    return candidates.sort((a, b) => (a.start_time < b.start_time ? 1 : -1))[0];
  };

  if (filteredEvents.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>Aucun événement trouvé pour cette période</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredEvents.map((event) => (
        <div 
          key={event.id} 
          className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-gray-50"
          onClick={() => onEventClick(event)}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-medium">{event.title}</h4>
              {(event as any).admin_notes?.trim() && (
                <Flag className="w-4 h-4 text-yellow-600 flex-shrink-0" fill="currentColor" />
              )}
              <Badge variant="outline" className={
                (event.assigned_gms_count > 0 || event.is_assigned) ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
              }>
                {(event.assigned_gms_count > 0 || event.is_assigned) ? 
                  (event.assigned_gms_count > 1 ? `Assigné (${event.assigned_gms_count})` : 'Assigné') : 
                  'Non assigné'
                }
              </Badge>
              <Badge variant="secondary">{event.activity_type}</Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(event.date).toLocaleDateString('fr-FR')}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {event.start_time.substring(0, 5)} - {event.end_time.substring(0, 5)}
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                Sion Centre
              </div>
              {event.is_assigned && event.game_masters && (
                <div className="flex items-center gap-1">
                  <User className="w-4 h-4" />
                  {event.game_masters.name}
                </div>
              )}
            </div>
            {event.description && (
              <div className="mt-2 text-sm text-gray-500 line-clamp-2">
                {event.description}
              </div>
            )}
            
            {(() => {
              const options = extractOptions(event.description || '');
              if (options.length === 0) return null;
              return (
                <div className="mt-2 bg-yellow-50 border border-yellow-300 rounded-lg p-2">
                  <div className="text-xs font-semibold text-yellow-800 mb-1">
                    📋 Options sélectionnées
                  </div>
                  <ul className="text-xs text-yellow-900 space-y-0.5">
                    {options.map((option, idx) => (
                      <li key={idx} className="flex items-start gap-1">
                        <span className="text-yellow-600">•</span>
                        <span>{option}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })()}

            {showPrecedingInfo && (() => {
              const prev = findPreviousSameGameEvent(event);
              const sameGM = prev && prev.assigned_gm_id === event.assigned_gm_id;
              const prevGM = prev?.assigned_gm_id ? gmById[prev.assigned_gm_id] : null;
              if (!prev || !prevGM || sameGM) return null;
              return (
                <div className="mt-3 rounded-md border bg-gray-50 p-3 text-sm">
                  <div className="mb-1 font-medium text-gray-700">Événement précédent le même jour (même jeu)</div>
                  <div className="flex flex-wrap items-center gap-3 text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {prev.start_time.substring(0, 5)} - {prev.end_time.substring(0, 5)}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {prevGM.name}
                    </div>
                    {prevGM.email && (
                      <div className="truncate max-w-xs">{prevGM.email}</div>
                    )}
                    {prevGM.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {prevGM.phone}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      ))}
    </div>
  );
};

export default EventsListView;
