import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar, Users, Clock } from 'lucide-react';
import { useAvailabilities } from '@/hooks/useAvailabilities';
import { useGameMasters } from '@/hooks/useGameMasters';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useGMCompetencies } from '@/hooks/useGMCompetencies';
import { useGames } from '@/hooks/useGames';
import { MultiSelect } from '@/components/ui/multi-select';

const AdminAvailabilityCalendarView = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const { data: gameMasters } = useGameMasters();
  const { data: allCompetencies = [] } = useGMCompetencies();
  const { data: games = [] } = useGames();

  // Récupérer toutes les disponibilités (sans filtre GM)
  const { data: allAvailabilities = [] } = useAvailabilities();

  // Créer un map des compétences par GM pour un accès rapide
  const competenciesByGM = useMemo(() => {
    const map = new Map();
    allCompetencies.forEach(comp => {
      if (!map.has(comp.gm_id)) {
        map.set(comp.gm_id, []);
      }
      map.get(comp.gm_id).push(comp);
    });
    return map;
  }, [allCompetencies]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentDate(newDate);
  };

  const getDaysOfWeek = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    startOfWeek.setDate(diff);

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });
  };

  const getTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 22; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  };

  const formatWeekRange = () => {
    const days = getDaysOfWeek();
    const start = days[0];
    const end = days[6];
    return `${start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} - ${end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  };

  const getGMAvailabilitiesForDayAndTime = (day: Date, timeSlot: string) => {
    const dayStr = day.toISOString().split('T')[0];
    const availableGMs: Array<{ gm: any; slots: string[] }> = [];
    const targetHour = parseInt(timeSlot.split(':')[0]);

    if (gameMasters && allAvailabilities) {
      gameMasters.forEach(gm => {
        // Si un filtre de jeux est actif, vérifier que le GM a au moins une compétence dans ces jeux
        if (selectedGames.length > 0) {
          const gmCompetencies = competenciesByGM.get(gm.id) || [];
          const hasSelectedGameCompetency = gmCompetencies.some(comp => 
            comp.game_id && selectedGames.includes(comp.game_id)
          );
          if (!hasSelectedGameCompetency) {
            return; // Skip ce GM s'il n'a pas la compétence
          }
        }

        const gmAvailabilities = allAvailabilities.filter(av => av.gm_id === gm.id);
        const dayAvailability = gmAvailabilities.find(av => av.date === dayStr);
        
        if (dayAvailability) {
          // Vérifier si le GM est disponible pour ce créneau horaire
          const isAvailable = dayAvailability.time_slots.some(slot => {
            // Ignorer les indisponibilités
            if (slot.includes('indisponible')) {
              return false;
            }
            
            // Toute la journée
            if (slot === 'toute-la-journee') {
              return true;
            }
            
            // Plage horaire (ex: "14:00-18:00")
            if (slot.includes('-') && slot.match(/\d{2}:\d{2}/)) {
              const [start, end] = slot.split('-').map(t => parseInt(t.split(':')[0]));
              return targetHour >= start && targetHour < end;
            }
            
            // Correspondance exacte
            return slot === timeSlot;
          });
          
          if (isAvailable) {
            availableGMs.push({
              gm,
              slots: dayAvailability.time_slots
            });
          }
        }
      });
    }

    return availableGMs;
  };

  // Fonction helper pour obtenir le nom d'affichage d'un GM
  const getGMDisplayName = (gm: any) => {
    return gm.first_name && gm.last_name 
      ? `${gm.first_name} ${gm.last_name}`
      : gm.first_name 
        ? gm.first_name
        : gm.last_name 
          ? gm.last_name
          : gm.name && !gm.name.includes('@')
            ? gm.name
            : gm.email?.split('@')[0] || 'GM';
  };

  // Fonction helper pour obtenir les initiales d'un GM
  const getGMInitials = (gm: any) => {
    const displayName = getGMDisplayName(gm);
    return displayName.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getGMColor = (gmId: string) => {
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-green-100 text-green-800 border-green-200',
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-orange-100 text-orange-800 border-orange-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200',
      'bg-red-100 text-red-800 border-red-200',
      'bg-yellow-100 text-yellow-100 border-yellow-200',
    ];
    return colors[Math.abs(gmId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % colors.length];
  };

  const days = getDaysOfWeek();
  const timeSlots = getTimeSlots();

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          Disponibilités GM - Vue Globale
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Vue des disponibilités de tous les GMs pour identifier les créneaux non couverts
        </p>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-sm mb-3">Légende</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-50 border-2 border-red-200 rounded"></div>
              <span className="text-sm">Créneau non couvert</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-white border-2 border-gray-200 rounded"></div>
              <span className="text-sm">Créneau avec GMs disponibles</span>
            </div>
          </div>
          {gameMasters && gameMasters.length > 0 && (
            <div className="mt-3">
              <div className="text-sm font-medium mb-2">GMs actifs:</div>
              <div className="flex flex-wrap gap-2">
                {gameMasters.filter(gm => gm.is_active).map((gm) => {
                  const displayName = getGMDisplayName(gm);
                  const initials = getGMInitials(gm);
                  
                  return (
                    <Badge 
                      key={gm.id}
                      variant="outline"
                      className={`text-xs ${getGMColor(gm.id)}`}
                    >
                      {initials} - {displayName}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => navigateWeek('prev')}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="font-semibold text-lg px-6">
              {formatWeekRange()}
            </span>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={() => navigateWeek('next')}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Filtrer par jeu:</span>
            <MultiSelect
              options={games
                .filter(g => g.is_active !== false)
                .map(game => ({
                  label: game.name,
                  value: game.id
                }))}
              selected={selectedGames}
              onChange={setSelectedGames}
              placeholder="Tous les jeux"
              className="w-[250px]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Header with days */}
            <div className="grid grid-cols-8 gap-1 mb-2">
              <div className="p-2 text-sm font-medium text-center bg-gray-50 rounded">
                Heure
              </div>
              {days.map((day, index) => (
                <div key={index} className="p-2 text-sm font-medium text-center bg-gray-50 rounded">
                  <div>{day.toLocaleDateString('fr-FR', { weekday: 'short' })}</div>
                  <div className="text-xs text-gray-600">
                    {day.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>

            {/* Time slots grid */}
            <div className="space-y-1">
              {timeSlots.map((timeSlot) => (
                <div key={timeSlot} className="grid grid-cols-8 gap-1">
                  <div className="p-3 text-sm font-medium text-center bg-gray-50 rounded flex items-center justify-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {timeSlot}
                  </div>
                  {days.map((day, dayIndex) => {
                    const availableGMs = getGMAvailabilitiesForDayAndTime(day, timeSlot);
                    const isUncovered = availableGMs.length === 0;
                    
                    // Agréger toutes les compétences disponibles pour ce créneau
                    const allSlotCompetencies = useMemo(() => {
                      const competenciesSet = new Map();
                      availableGMs.forEach(gmData => {
                        const gmComps = competenciesByGM.get(gmData.gm.id) || [];
                        gmComps.forEach(comp => {
                          if (comp.games?.name) {
                            if (!competenciesSet.has(comp.games.name)) {
                              competenciesSet.set(comp.games.name, {
                                name: comp.games.name,
                                category: comp.games.category,
                                maxLevel: comp.competency_level
                              });
                            } else {
                              const existing = competenciesSet.get(comp.games.name);
                              if (comp.competency_level > existing.maxLevel) {
                                existing.maxLevel = comp.competency_level;
                              }
                            }
                          }
                        });
                      });
                      return Array.from(competenciesSet.values());
                    }, [availableGMs]);
                    
                    return (
                      <TooltipProvider key={dayIndex}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div 
                              className={`p-2 min-h-[60px] rounded border-2 cursor-help ${
                                isUncovered 
                                  ? 'bg-red-50 border-red-200' 
                                  : 'bg-white border-gray-200'
                              }`}
                            >
                              {isUncovered ? (
                                <div className="text-center text-xs text-red-600 font-medium">
                                  Non couvert
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {availableGMs.map((gmData, gmIndex) => {
                                    const gmCompetencies = competenciesByGM.get(gmData.gm.id) || [];
                                    const displayName = getGMDisplayName(gmData.gm);
                                    const initials = getGMInitials(gmData.gm);
                                    
                                    return (
                                      <TooltipProvider key={gmIndex}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Badge 
                                              variant="outline"
                                              className={`text-xs px-1 py-0 cursor-help ${getGMColor(gmData.gm.id)}`}
                                            >
                                              {initials}
                                            </Badge>
                                          </TooltipTrigger>
                                          <TooltipContent className="max-w-xs">
                                            <div className="space-y-2">
                                              <p className="font-semibold">{displayName}</p>
                                              {gmCompetencies.length > 0 ? (
                                                <div>
                                                  <p className="text-xs font-medium mb-1">Compétences:</p>
                                                  <ul className="text-xs space-y-1">
                                                    {gmCompetencies.map((comp, idx) => (
                                                      <li key={idx}>
                                                        • {comp.games?.name} (Niveau {comp.competency_level})
                                                      </li>
                                                    ))}
                                                  </ul>
                                                </div>
                                              ) : (
                                                <p className="text-xs text-muted-foreground">Aucune compétence enregistrée</p>
                                              )}
                                            </div>
                                          </TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </TooltipTrigger>
                          {!isUncovered && (
                            <TooltipContent className="max-w-md">
                              <div className="space-y-2">
                                <p className="font-semibold">Compétences disponibles pour ce créneau</p>
                                <p className="text-xs text-muted-foreground">{availableGMs.length} GM{availableGMs.length > 1 ? 's' : ''} disponible{availableGMs.length > 1 ? 's' : ''}</p>
                                {allSlotCompetencies.length > 0 ? (
                                  <ul className="text-xs space-y-1">
                                    {allSlotCompetencies.map((comp, idx) => (
                                      <li key={idx}>
                                        • {comp.name} {comp.category ? `(${comp.category})` : ''} - Niveau max: {comp.maxLevel}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-muted-foreground">Aucune compétence enregistrée pour ces GMs</p>
                                )}
                              </div>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminAvailabilityCalendarView;