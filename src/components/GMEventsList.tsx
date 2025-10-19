
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, List } from 'lucide-react';
import { useActivities } from '@/hooks/useActivities';
import { useAuth } from '@/hooks/useAuth';
import { useEventsFilter } from '@/hooks/useEventsFilter';
import EventsFilter from './EventsFilter';
import EventDetailsDialog from './EventDetailsDialog';
import IOSCalendarView from './IOSCalendarView';
import EventsListView from './events/EventsListView';

const GMEventsList = () => {
  const { profile } = useAuth();
  const { data: activities = [] } = useActivities();
  const { filterOptions, updateFilter, filterEvents } = useEventsFilter();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const gmId = profile?.gm_id || profile?.id;
  const myActivities = activities.filter(activity => activity.assigned_gm_id === gmId);
  const filteredActivities = filterEvents(myActivities);

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setIsDialogOpen(true);
  };

  console.log('📊 GMEventsList render:', {
    totalActivities: activities.length,
    myActivities: myActivities.length,
    filteredActivities: filteredActivities.length,
    gmId,
    profileRole: profile?.role
  });

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Mes Événements
          </CardTitle>
          <CardDescription>
            Vue d'ensemble de tous mes événements assignés ({filteredActivities.length} événement{filteredActivities.length !== 1 ? 's' : ''})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EventsFilter 
            filterOptions={filterOptions}
            onFilterChange={updateFilter}
            showStatusFilter={false}
          />

          <Tabs defaultValue="calendar" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Vue Calendrier
              </TabsTrigger>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="w-4 h-4" />
                Vue Liste
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calendar" className="mt-6">
              <IOSCalendarView />
            </TabsContent>

            <TabsContent value="list" className="mt-6">
              <EventsListView 
                filteredEvents={filteredActivities}
                onEventClick={handleEventClick}
                allEvents={activities}
                showPrecedingInfo
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <EventDetailsDialog 
        event={selectedEvent}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </>
  );
};

export default GMEventsList;
