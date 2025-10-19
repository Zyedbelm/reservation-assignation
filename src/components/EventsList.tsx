
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Clock, MapPin, User, Search, Filter } from 'lucide-react';
import { useActivities } from '@/hooks/useActivities';
import EventDetailsDialog from './EventDetailsDialog';

const EventsList = () => {
  const { data: activities = [], isLoading } = useActivities();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || activity.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Complété</Badge>;
      case 'assigned':
        return <Badge className="bg-blue-100 text-blue-800">Assigné</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr: string) => {
    try {
      return timeStr?.substring(0, 5) || '';
    } catch {
      return timeStr || '';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Contrôles de filtrage */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Rechercher par titre ou description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border rounded px-3 py-2 text-sm bg-white"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="assigned">Assignés</option>
            <option value="completed">Complétés</option>
          </select>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">{activities.length}</div>
            <div className="text-sm text-blue-600">Total événements</div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-700">
              {activities.filter(a => a.status === 'pending').length}
            </div>
            <div className="text-sm text-yellow-600">En attente</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-700">
              {activities.filter(a => a.status === 'assigned').length}
            </div>
            <div className="text-sm text-green-600">Assignés</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-700">
              {activities.filter(a => a.event_source === 'make').length}
            </div>
            <div className="text-sm text-purple-600">Depuis Make.com</div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des événements */}
      <div className="space-y-4">
        {filteredActivities.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <div className="text-lg mb-2">Aucun événement trouvé</div>
              <div className="text-sm">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Essayez de modifier vos critères de recherche'
                  : 'Lancez une synchronisation pour voir les événements'
                }
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredActivities.map((activity) => (
            <Card key={activity.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg leading-tight">
                      {activity.title}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      ID: {activity.make_event_id || activity.id?.substring(0, 8)}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {getStatusBadge(activity.status)}
                    {activity.event_source === 'make' && (
                      <Badge variant="outline" className="bg-purple-50 text-purple-700">
                        Make.com
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      {formatDate(activity.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      {formatTime(activity.start_time)} - {formatTime(activity.end_time)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">
                      {activity.duration} min
                    </span>
                  </div>
                </div>

                {activity.description && (
                  <div className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {activity.description.length > 100 
                      ? `${activity.description.substring(0, 100)}...`
                      : activity.description
                    }
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    {activity.required_skills?.slice(0, 2).map((skill, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {skill.length > 20 ? `${skill.substring(0, 20)}...` : skill}
                      </Badge>
                    ))}
                    {activity.required_skills?.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{activity.required_skills.length - 2}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedEvent(activity)}
                  >
                    Détails
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Dialog des détails */}
      {selectedEvent && (
        <EventDetailsDialog
          event={selectedEvent}
          open={!!selectedEvent}
          onOpenChange={(open) => !open && setSelectedEvent(null)}
        />
      )}
    </div>
  );
};

export default EventsList;
