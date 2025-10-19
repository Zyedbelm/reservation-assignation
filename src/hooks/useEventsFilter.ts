
import { useState, useMemo } from 'react';

export interface EventsFilterOptions {
  showPastEvents: boolean;
  startDate?: string;
  endDate?: string;
  filterStatus?: 'all' | 'assigned' | 'unassigned';
  selectedGMIds?: string[];
  selectedGameIds?: string[];
}

export const useEventsFilter = () => {
  const [filterOptions, setFilterOptions] = useState<EventsFilterOptions>({
    showPastEvents: false,
    startDate: undefined,
    endDate: undefined,
    filterStatus: 'all',
    selectedGMIds: [],
    selectedGameIds: []
  });

  const today = new Date().toISOString().split('T')[0];

  const getDateRange = () => {
    const { showPastEvents, startDate, endDate } = filterOptions;
    
    // Si on ne montre pas le passé et qu'aucune date n'est spécifiée
    if (!showPastEvents && !startDate && !endDate) {
      return {
        start: today,
        end: undefined // Pas de limite dans le futur
      };
    }
    
    // Si des dates spécifiques sont définies
    if (startDate || endDate) {
      return {
        start: startDate,
        end: endDate
      };
    }
    
    // Si on veut tout afficher (passé inclus)
    return {
      start: undefined,
      end: undefined
    };
  };

  const filterEvents = (events: any[]) => {
    const { start, end } = getDateRange();
    const { filterStatus, selectedGMIds, selectedGameIds } = filterOptions;
    
    return events.filter(event => {
      // Filtrage par date
      if (start && event.date < start) return false;
      if (end && event.date > end) return false;
      
      // Filtrage par statut d'assignation
      if (filterStatus === 'assigned' && !event.is_assigned) return false;
      if (filterStatus === 'unassigned' && event.is_assigned) return false;
      
      // Filtrage par GM (si des GMs sont sélectionnés)
      if (selectedGMIds && selectedGMIds.length > 0) {
        const hasSelectedGM = selectedGMIds.includes(event.assigned_gm_id);
        if (!hasSelectedGM) return false;
      }
      
      // Filtrage par Jeu (si des jeux sont sélectionnés)
      if (selectedGameIds && selectedGameIds.length > 0) {
        const hasSelectedGame = selectedGameIds.includes(event.game_id);
        if (!hasSelectedGame) return false;
      }
      
      return true;
    });
  };

  const updateFilter = (updates: Partial<EventsFilterOptions>) => {
    setFilterOptions(prev => ({
      ...prev,
      ...updates
    }));
  };

  const hasCustomDateRange = Boolean(filterOptions.startDate || filterOptions.endDate);

  return {
    filterOptions,
    updateFilter,
    filterEvents,
    getDateRange,
    hasCustomDateRange,
    today
  };
};
