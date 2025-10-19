
import { Badge } from '@/components/ui/badge';

interface EventStatusBadgesProps {
  event: any;
}

const EventStatusBadges = ({ event }: EventStatusBadgesProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-orange-100 text-orange-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Utiliser les données calculées par le hook useActivities si disponibles
  const isAssigned = event.assigned_gms_count > 0 || event.is_assigned;
  const displayStatus = isAssigned ? 'assigned' : event.status;

  return (
    <div className="flex gap-2 flex-wrap">
      <Badge className={getStatusColor(displayStatus)}>
        {displayStatus === 'confirmed' ? 'Confirmé' :
         displayStatus === 'assigned' ? 'Assigné' :
         displayStatus === 'pending' ? 'En attente' :
         displayStatus === 'cancelled' ? 'Annulé' : displayStatus}
      </Badge>
      <Badge variant="secondary">{event.activity_type}</Badge>
      {isAssigned ? (
        <Badge className="bg-green-100 text-green-800">
          {event.assigned_gms_count > 1 ? `Assigné (${event.assigned_gms_count} GMs)` : 'Assigné'}
        </Badge>
      ) : (
        <Badge className="bg-orange-100 text-orange-800">Non assigné</Badge>
      )}
    </div>
  );
};

export default EventStatusBadges;
