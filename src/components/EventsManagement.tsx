
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQueryClient } from '@tanstack/react-query';

import AdminEventsFilter from './events/AdminEventsFilter';
import EventsNavigation from './events/EventsNavigation';
import EventsCalendarView from './events/EventsCalendarView';
import EventsListView from './events/EventsListView';
import EventDetailsDialog from './EventDetailsDialog';
import AddActivitySlotDialog from './AddActivitySlotDialog';
import { useEventsQuery, useListEventsQuery } from './events/EventsQueryLogic';
import { useGameMasters } from '@/hooks/useGameMasters';
import { useGames } from '@/hooks/useGames';
import { MultiSelectOption } from '@/components/ui/multi-select';

const EventsManagement = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [filterStatus, setFilterStatus] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [listViewStartDate, setListViewStartDate] = useState<string>('');
  const [listViewEndDate, setListViewEndDate] = useState<string>('');
  const [selectedGMIds, setSelectedGMIds] = useState<string[]>([]);
  const [selectedGameIds, setSelectedGameIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data: gameMasters = [] } = useGameMasters();
  const { data: games = [] } = useGames();

  const { data: events = [], isLoading, refetch, error, isFetching } = useEventsQuery(selectedDate, viewMode);

  // Requête séparée pour la vue liste avec filtres de date
  const { data: listEvents = [], error: listError, refetch: refetchList } = useListEventsQuery(
    listViewStartDate, 
    listViewEndDate, 
    events
  );

  // Préparer les options pour les filtres multi-select
  const gmOptions: MultiSelectOption[] = useMemo(() => {
    if (!gameMasters || !Array.isArray(gameMasters)) return [];
    return gameMasters
      .filter(gm => gm.is_active)
      .map(gm => ({
        value: gm.id,
        label: gm.first_name && gm.last_name 
          ? `${gm.first_name} ${gm.last_name}`
          : gm.name
      }));
  }, [gameMasters]);

  const gameOptions: MultiSelectOption[] = useMemo(() => {
    if (!games || !Array.isArray(games)) return [];
    return games
      .filter(game => game.is_active)
      .map(game => ({
        value: game.id,
        label: game.name
      }));
  }, [games]);

  // Rafraîchir automatiquement les données toutes les 30 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading && !isFetching) {
        refetch();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [refetch, isLoading, isFetching]);

  // Log pour déboguer
  console.log('📊 EventsManagement data:', {
    eventsCount: events?.length || 0,
    listEventsCount: listEvents?.length || 0,
    isLoading,
    isFetching,
    error: error?.message,
    listError: listError?.message,
    selectedDate: selectedDate.toISOString().split('T')[0],
    viewMode,
    currentWeekRange: `${new Date(selectedDate).toISOString().split('T')[0]} (${viewMode})`,
    filterStatus
  });
  
  // Log des créneaux du 11 octobre spécifiquement
  const oct11Events = events?.filter(e => e.date === '2025-10-11');
  if (oct11Events && oct11Events.length > 0) {
    console.log('🎯 [OCT-11] Créneaux du 11 octobre détectés:', oct11Events.map(e => ({
      title: e.title,
      time: `${e.start_time}-${e.end_time}`,
      gm: e.assigned_gm_id,
      status: e.status,
      is_assigned: e.is_assigned
    })));
  }

  const filteredEvents = (events || []).filter(event => {
    // Filtrage par statut
    if (filterStatus === 'assigned' && !event.is_assigned) return false;
    if (filterStatus === 'unassigned' && event.is_assigned) return false;
    
    // Filtrage par GM
    if (selectedGMIds.length > 0 && !selectedGMIds.includes(event.assigned_gm_id)) return false;
    
    // Filtrage par Jeu
    if (selectedGameIds.length > 0 && !selectedGameIds.includes(event.game_id)) return false;
    
    return true;
  });

  const filteredListEvents = (listViewStartDate || listViewEndDate ? listEvents : events || []).filter(event => {
    // Filtrage par statut
    if (filterStatus === 'assigned' && !event.is_assigned) return false;
    if (filterStatus === 'unassigned' && event.is_assigned) return false;
    
    // Filtrage par GM
    if (selectedGMIds.length > 0 && !selectedGMIds.includes(event.assigned_gm_id)) return false;
    
    // Filtrage par Jeu
    if (selectedGameIds.length > 0 && !selectedGameIds.includes(event.game_id)) return false;
    
    return true;
  });

  const handleFilterChange = (value: string) => {
    setFilterStatus(value as 'all' | 'assigned' | 'unassigned');
  };

  const handleEventClick = (event: any) => {
    setSelectedEvent(event);
    setIsDialogOpen(true);
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setSelectedDate(newDate);
  };

  const handleViewModeChange = () => {
    setViewMode(viewMode === 'week' ? 'month' : 'week');
  };

  const handleResetDateRange = () => {
    setListViewStartDate('');
    setListViewEndDate('');
  };

  const handleManualRefresh = () => {
    refetch();
    if (listViewStartDate || listViewEndDate) {
      refetchList();
    }
  };

  // Realtime: keep events in sync instantly
  useEffect(() => {
    const channel = supabase
      .channel('activities-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activities' }, () => {
        queryClient.invalidateQueries({ queryKey: ['all-events'] });
        queryClient.invalidateQueries({ queryKey: ['list-events'] });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'activities' }, () => {
        queryClient.invalidateQueries({ queryKey: ['all-events'] });
        queryClient.invalidateQueries({ queryKey: ['list-events'] });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'activities' }, () => {
        queryClient.invalidateQueries({ queryKey: ['all-events'] });
        queryClient.invalidateQueries({ queryKey: ['list-events'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { toast } = useToast();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div>Chargement des événements...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="font-medium text-red-800">Erreur de chargement des événements</div>
                <div className="text-sm text-red-700">{error.message}</div>
                <Button 
                  onClick={handleManualRefresh} 
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Réessayer
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Gestion des Événements
                  {isFetching && <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />}
                </CardTitle>
                <CardDescription>
                  Vue d'ensemble de tous les événements synchronisés ({(events || []).length} événements)
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <AddActivitySlotDialog />
                <AdminEventsFilter
                  filterStatus={filterStatus}
                  onFilterChange={handleFilterChange}
                  viewMode={viewMode}
                  onViewModeChange={handleViewModeChange}
                  startDate={listViewStartDate}
                  endDate={listViewEndDate}
                  onStartDateChange={setListViewStartDate}
                  onEndDateChange={setListViewEndDate}
                  onResetDateRange={handleResetDateRange}
                  gmOptions={gmOptions}
                  selectedGMs={selectedGMIds}
                  onGMsChange={setSelectedGMIds}
                  gameOptions={gameOptions}
                  selectedGames={selectedGameIds}
                  onGamesChange={setSelectedGameIds}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <EventsNavigation 
              viewMode={viewMode}
              selectedDate={selectedDate}
              onNavigate={navigateDate}
            />

            <Tabs defaultValue="calendar" className="space-y-4">
              <TabsList>
                <TabsTrigger value="calendar">Vue Calendrier</TabsTrigger>
                <TabsTrigger value="list">Vue Liste</TabsTrigger>
              </TabsList>

              <TabsContent value="calendar">
                {filteredEvents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Aucun événement trouvé pour cette période</p>
                  </div>
                ) : (
                  <EventsCalendarView 
                    viewMode={viewMode}
                    selectedDate={selectedDate}
                    filteredEvents={filteredEvents}
                    onEventClick={handleEventClick}
                  />
                )}
              </TabsContent>

              <TabsContent value="list">
                {filteredListEvents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>Aucun événement trouvé</p>
                  </div>
                ) : (
                  <EventsListView 
                    filteredEvents={filteredListEvents}
                    onEventClick={handleEventClick}
                  />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <EventDetailsDialog 
        event={selectedEvent}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        showAssignmentEditor={true}
      />
    </>
  );
};

export default EventsManagement;
