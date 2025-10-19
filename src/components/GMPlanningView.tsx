import { Calendar, Clock, Flag } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useActivities } from '@/hooks/useActivities';
import { useProfile } from '@/hooks/auth/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { useActivitiesRealtime } from '@/hooks/useActivitiesRealtime';
import EventBasicInfo from '@/components/event-details/EventBasicInfo';
import EventDescriptionFormatter from '@/components/event-details/EventDescriptionFormatter';
import AdminNotesDisplay from '@/components/event-details/AdminNotesDisplay';
import EventSalesSummary from '@/components/event-details/EventSalesSummary';
import { extractOptions } from '@/utils/eventOptionsExtractor';

const GMPlanningView = () => {
  const { user } = useAuth();
  const { profile } = useProfile(user);
  const { data: activities = [] } = useActivities();
  
  // Activer les mises à jour en temps réel
  useActivitiesRealtime();

  // Filtrer uniquement les activités assignées à ce GM
  const myActivities = activities.filter(activity => 
    activity.assigned_gm_id === profile?.gm_id
  );

  // Obtenir le mois en cours
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  
  // Activités du mois en cours
  const currentMonthActivities = myActivities.filter(activity => 
    activity.date.startsWith(currentMonth)
  );

  // Prochaines activités (limitées à 5)
  const upcomingActivities = myActivities.filter(activity => 
    new Date(`${activity.date}T${activity.start_time}`) > new Date() &&
    (activity.status === 'assigned' || activity.status === 'confirmed')
  ).slice(0, 5);

  // Activités d'aujourd'hui
  const todayActivities = myActivities.filter(activity => 
    activity.date === new Date().toISOString().split('T')[0]
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Confirmé</Badge>;
      case 'assigned':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Assigné</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">En attente</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatTime = (timeString: string) => {
    return new Date(`1970-01-01T${timeString}`).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Activités d'aujourd'hui */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Mes Activités Aujourd'hui
          </CardTitle>
          <CardDescription>
            {todayActivities.length === 0 ? 'Aucune activité programmée' : `${todayActivities.length} activité(s) programmée(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {todayActivities.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Aucune activité aujourd'hui</p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {todayActivities.map((activity) => (
                <AccordionItem key={activity.id} value={activity.id} className="border rounded-lg mb-3">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium text-gray-900 text-left">{activity.title}</h4>
                        {(activity as any).admin_notes?.trim() && (
                          <Flag className="w-4 h-4 text-yellow-600 flex-shrink-0" fill="currentColor" />
                        )}
                        {(() => {
                          const count = extractOptions(activity.description || '').length;
                          return count > 0 ? (
                            <span className="inline-flex items-center rounded border border-yellow-300 bg-yellow-100 text-yellow-800 text-[10px] px-1.5 py-0.5">
                              📋 {count}
                            </span>
                          ) : null;
                        })()}
                        {getStatusBadge(activity.status)}
                      </div>
                      <div className="text-sm text-gray-500 mr-4 text-right">
                        <div className="text-xs">{formatTime(activity.start_time)} - {formatTime(activity.end_time)}</div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-4 pt-2">
                      <EventBasicInfo 
                        event={activity} 
                        isReadOnly={true}
                        isAdmin={false}
                      />
                      
                      <div className="pt-2 border-t">
                        <EventSalesSummary
                          eventId={activity.id}
                          eventTitle={activity.title}
                          assignedGmId={activity.assigned_gm_id || undefined}
                        />
                      </div>
                      
                      {(activity as any).admin_notes && (
                        <AdminNotesDisplay adminNotes={(activity as any).admin_notes} />
                      )}
                      
                      {(() => {
                        const options = extractOptions(activity.description || '');
                        if (options.length === 0) return null;
                        return (
                          <div className="mt-2 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                            <div className="text-sm font-semibold text-yellow-800 mb-2">
                              📋 Options sélectionnées
                            </div>
                            <ul className="text-sm text-yellow-900 space-y-1">
                              {options.map((option, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-yellow-600">•</span>
                                  <span>{option}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })()}
                      
                      {activity.description && (
                        <div className="pt-2 border-t">
                          <EventDescriptionFormatter description={activity.description} />
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Prochaines activités */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-green-600" />
            Mes Prochaines Activités
          </CardTitle>
          <CardDescription>
            Vos prochaines sessions programmées
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingActivities.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Aucune activité programmée prochainement</p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {upcomingActivities.map((activity) => (
                <AccordionItem key={activity.id} value={activity.id} className="border rounded-lg mb-3">
                  <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium text-gray-900 text-left">{activity.title}</h4>
                        {(activity as any).admin_notes?.trim() && (
                          <Flag className="w-4 h-4 text-yellow-600 flex-shrink-0" fill="currentColor" />
                        )}
                        {(() => {
                          const count = extractOptions(activity.description || '').length;
                          return count > 0 ? (
                            <span className="inline-flex items-center rounded border border-yellow-300 bg-yellow-100 text-yellow-800 text-[10px] px-1.5 py-0.5">
                              📋 {count}
                            </span>
                          ) : null;
                        })()}
                        {getStatusBadge(activity.status)}
                      </div>
                      <div className="text-sm text-gray-500 mr-4 text-right">
                        <div>{formatDate(activity.date).split(',')[0]}</div>
                        <div className="text-xs">{formatTime(activity.start_time)} - {formatTime(activity.end_time)}</div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="space-y-4 pt-2">
                      <EventBasicInfo 
                        event={activity} 
                        isReadOnly={true}
                        isAdmin={false}
                      />
                      
                      <div className="pt-2 border-t">
                        <EventSalesSummary
                          eventId={activity.id}
                          eventTitle={activity.title}
                          assignedGmId={activity.assigned_gm_id || undefined}
                        />
                      </div>
                      
                      {(activity as any).admin_notes && (
                        <AdminNotesDisplay adminNotes={(activity as any).admin_notes} />
                      )}
                      
                      {(() => {
                        const options = extractOptions(activity.description || '');
                        if (options.length === 0) return null;
                        return (
                          <div className="mt-2 bg-yellow-50 border border-yellow-300 rounded-lg p-3">
                            <div className="text-sm font-semibold text-yellow-800 mb-2">
                              📋 Options sélectionnées
                            </div>
                            <ul className="text-sm text-yellow-900 space-y-1">
                              {options.map((option, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-yellow-600">•</span>
                                  <span>{option}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })()}
                      
                      {activity.description && (
                        <div className="pt-2 border-t">
                          <EventDescriptionFormatter description={activity.description} />
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Statistiques du mois en cours */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Ce Mois</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{currentMonthActivities.length}</div>
            <p className="text-sm text-gray-600">Activités ce mois-ci</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Confirmées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {currentMonthActivities.filter(a => a.status === 'confirmed').length}
            </div>
            <p className="text-sm text-gray-600">Sessions confirmées ce mois</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Heures Mois</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(currentMonthActivities.reduce((total, activity) => total + activity.duration, 0) / 60)}h
            </div>
            <p className="text-sm text-gray-600">Heures ce mois-ci</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GMPlanningView;