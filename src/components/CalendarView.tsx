import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar, Filter, User, Clock } from 'lucide-react';
import { useActivities } from '@/hooks/useActivities';
import { useGameMasters } from '@/hooks/useGameMasters';
import { useAvailabilities } from '@/hooks/useAvailabilities';
import { format, parseISO, isValid } from 'date-fns';
import { fr } from 'date-fns/locale';
import ManualAssignmentDialog from './ManualAssignmentDialog';

const CalendarView = () => {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);
  
  const { data: activities = [], refetch: refetchActivities } = useActivities();
  const { data: gameMasters = [] } = useGameMasters();
  const { data: availabilities = [] } = useAvailabilities();

  // Filter activities by date range
  const filteredActivities = activities.filter(activity => {
    const activityDate = activity.date;
    return activityDate >= startDate && activityDate <= endDate;
  });

  // Filter availabilities by date range
  const filteredAvailabilities = availabilities.filter(availability => {
    return availability.date >= startDate && availability.date <= endDate;
  });

  // Fonction pour formater l'affichage du nom du GM
  const getGMDisplayName = (gameMaster: any) => {
    if (!gameMaster) return 'GM inconnu';
    
    // Si on a prénom et nom, les utiliser
    if (gameMaster.first_name && gameMaster.last_name) {
      return `${gameMaster.first_name} ${gameMaster.last_name}`;
    }
    
    // Si on a juste le prénom ou le nom, l'utiliser
    if (gameMaster.first_name) return gameMaster.first_name;
    if (gameMaster.last_name) return gameMaster.last_name;
    
    // Sinon utiliser le nom complet si disponible
    if (gameMaster.name && gameMaster.name !== gameMaster.email) {
      return gameMaster.name;
    }
    
    // En dernier recours, utiliser l'email tronqué
    if (gameMaster.email) {
      const emailPart = gameMaster.email.split('@')[0];
      return emailPart.length > 15 ? `${emailPart.substring(0, 15)}...` : emailPart;
    }
    
    return 'GM inconnu';
  };

  const getGMName = (gmId?: string) => {
    if (!gmId) return 'Non assigné';
    const gm = gameMasters.find(gm => gm.id === gmId);
    return gm ? getGMDisplayName(gm) : 'GM inconnu';
  };

  const formatDateTime = (date: string, time: string) => {
    try {
      const dateTime = parseISO(`${date}T${time}`);
      if (isValid(dateTime)) {
        return format(dateTime, 'dd/MM/yyyy HH:mm', { locale: fr });
      }
    } catch (error) {
      console.error('Error formatting date:', error);
    }
    return `${date} ${time}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmé';
      case 'assigned': return 'Assigné';
      case 'pending': return 'En attente';
      default: return status;
    }
  };

  const handleManualAssign = (event: any) => {
    setSelectedEvent(event);
    setIsAssignmentDialogOpen(true);
  };

  const handleAssignmentComplete = () => {
    refetchActivities();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Planning des Activités
          </CardTitle>
          <CardDescription>
            Vue d'ensemble des activités programmées et disponibilités GM
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <Label htmlFor="start-date">Date de début</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end-date">Date de fin</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" className="w-full">
                <Filter className="w-4 h-4 mr-2" />
                Filtrer
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Section Disponibilités GM */}
            {filteredAvailabilities.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-green-700 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Disponibilités GM
                </h3>
                {filteredAvailabilities.map((availability) => {
                  const gm = gameMasters.find(gm => gm.id === availability.gm_id);
                  return (
                    <div key={availability.id} className="border rounded-lg p-4 bg-green-50 border-green-200">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold text-lg text-green-800">
                            {gm ? getGMDisplayName(gm) : 'GM inconnu'} - Disponible
                          </h4>
                          <p className="text-green-700">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            {new Date(availability.date).toLocaleDateString('fr-FR', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Clock className="w-3 h-3 inline mr-1" />
                          Disponibilité
                        </span>
                      </div>
                      
                      <div className="mt-3">
                        <span className="font-medium text-green-800">Créneaux disponibles:</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {availability.time_slots.map((slot, index) => (
                            <span 
                              key={index}
                              className="px-3 py-1 bg-green-200 text-green-800 rounded-full text-sm font-medium"
                            >
                              {slot}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Section Activités */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-blue-700 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Activités Programmées
              </h3>
              
              {filteredActivities.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Aucune activité pour cette période
                </p>
              ) : (
                filteredActivities.map((activity) => (
                  <div key={activity.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-lg">{activity.title}</h4>
                        {activity.description && (
                          <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                            {activity.description.length > 100 
                              ? `${activity.description.substring(0, 100)}...`
                              : activity.description
                            }
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(activity.status)}`}>
                          {getStatusText(activity.status)}
                        </span>
                        {!activity.is_assigned && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleManualAssign(activity)}
                          >
                            <User className="w-3 h-3 mr-1" />
                            Attribuer
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Début:</span>
                        <p>{formatDateTime(activity.date, activity.start_time)}</p>
                      </div>
                      <div>
                        <span className="font-medium">Fin:</span>
                        <p>{formatDateTime(activity.date, activity.end_time)}</p>
                      </div>
                      <div>
                        <span className="font-medium">GM assigné:</span>
                        <p>{getGMName(activity.assigned_gm_id)}</p>
                      </div>
                    </div>
                    
                    <div className="mt-2 text-sm flex items-center gap-4">
                      <div>
                        <span className="font-medium">Type:</span>
                        <span className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">
                          {activity.activity_type}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Durée:</span>
                        <span className="ml-2">{activity.duration} min</span>
                      </div>
                      {activity.make_event_id && (
                        <div>
                          <span className="font-medium">Source:</span>
                          <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                            Make.com
                          </span>
                        </div>
                      )}
                    </div>

                    {activity.required_skills && activity.required_skills.length > 0 && (
                      <div className="mt-3">
                        <span className="font-medium text-sm">Compétences requises:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {activity.required_skills.map((skill, index) => (
                            <span 
                              key={index}
                              className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Message si aucune donnée */}
            {filteredActivities.length === 0 && filteredAvailabilities.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <div className="text-lg mb-2">Aucune donnée pour cette période</div>
                  <div className="text-sm">
                    Modifiez la plage de dates ou lancez une synchronisation
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      <ManualAssignmentDialog
        open={isAssignmentDialogOpen}
        onOpenChange={setIsAssignmentDialogOpen}
        event={selectedEvent}
        onAssignmentComplete={handleAssignmentComplete}
      />
    </div>
  );
};

export default CalendarView;
