
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, RotateCcw } from 'lucide-react';

interface EventsFilterOptions {
  showPastEvents: boolean;
  startDate?: string;
  endDate?: string;
  filterStatus?: 'all' | 'assigned' | 'unassigned';
}

interface EventsFilterProps {
  filterOptions: EventsFilterOptions;
  onFilterChange: (updates: Partial<EventsFilterOptions>) => void;
  showStatusFilter?: boolean;
}

const EventsFilter = ({ filterOptions, onFilterChange, showStatusFilter = true }: EventsFilterProps) => {
  const hasActiveFilters = filterOptions.startDate || filterOptions.endDate;

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg border">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">Filtres :</span>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">Du :</label>
        <input
          type="date"
          value={filterOptions.startDate || ''}
          onChange={(e) => onFilterChange({ startDate: e.target.value || undefined })}
          className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-gray-600">Au :</label>
        <input
          type="date"
          value={filterOptions.endDate || ''}
          onChange={(e) => onFilterChange({ endDate: e.target.value || undefined })}
          className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {showStatusFilter && (
        <Select 
          value={filterOptions.filterStatus || 'all'} 
          onValueChange={(value) => onFilterChange({ filterStatus: value as 'all' | 'assigned' | 'unassigned' })}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les événements</SelectItem>
            <SelectItem value="assigned">Assignés</SelectItem>
            <SelectItem value="unassigned">Non assignés</SelectItem>
          </SelectContent>
        </Select>
      )}

      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onFilterChange({ startDate: undefined, endDate: undefined })}
          className="flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          Réinitialiser
        </Button>
      )}
    </div>
  );
};

export default EventsFilter;
