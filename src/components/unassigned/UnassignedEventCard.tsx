
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Calendar, Clock, MapPin, ChevronDown, ChevronUp, UserPlus, Bug, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import EventDescriptionFormatter from './EventDescriptionFormatter';
import AssignmentDebugDialog from '../AssignmentDebugDialog';

interface UnassignedEventCardProps {
  event: any;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onAssignGM: () => void;
  onDelete: () => void;
}

const UnassignedEventCard = ({ 
  event, 
  isExpanded, 
  onToggleExpanded, 
  onAssignGM,
  onDelete
}: UnassignedEventCardProps) => {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpanded}>
      <div className="border rounded-lg hover:shadow-sm transition-shadow">
        <CollapsibleTrigger className="w-full">
          <div className="p-3 flex items-center justify-between hover:bg-gray-50 rounded-lg">
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-base">{event.title}</h3>
                <Badge variant="outline" className="text-orange-600 border-orange-300 text-xs">
                  Non assigné
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(event.date), 'dd MMM yyyy', { locale: fr })}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {event.start_time} - {event.end_time}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {event.duration}min
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">{event.activity_type}</Badge>
              <Badge variant="outline" className="text-xs">{event.event_source}</Badge>
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-3 pb-3 border-t border-gray-100">
            <div className="pt-3 space-y-4">
              <EventDescriptionFormatter description={event.description} />
              
              <div className="pt-3 border-t border-gray-100">
                <AssignmentDebugDialog event={event} />
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default UnassignedEventCard;
