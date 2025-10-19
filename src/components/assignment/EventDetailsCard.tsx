
import { Calendar, Clock } from 'lucide-react';

interface EventDetailsCardProps {
  event: any;
}

const EventDetailsCard = ({ event }: EventDetailsCardProps) => {
  return (
    <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-4 rounded-lg border border-gray-200">
      <h3 className="font-semibold text-lg mb-3 text-gray-900">{event.title}</h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-500" />
          <span className="font-medium">Date:</span>
          <span>{new Date(event.date).toLocaleDateString('fr-FR')}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-500" />
          <span className="font-medium">Horaire:</span>
          <span>{event.start_time?.substring(0, 5)} - {event.end_time?.substring(0, 5)}</span>
        </div>
      </div>
      {event.description && (
        <p className="text-sm text-gray-600 mt-3 line-clamp-2">
          {event.description.split('n')[0]}
        </p>
      )}
    </div>
  );
};

export default EventDetailsCard;
