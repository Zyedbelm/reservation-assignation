
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RotateCcw } from 'lucide-react';
import { MultiSelect, MultiSelectOption } from '@/components/ui/multi-select';

interface AdminEventsFilterProps {
  filterStatus: 'all' | 'assigned' | 'unassigned';
  onFilterChange: (value: string) => void;
  viewMode: 'week' | 'month';
  onViewModeChange: () => void;
  startDate?: string;
  endDate?: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onResetDateRange: () => void;
  gmOptions: MultiSelectOption[];
  selectedGMs: string[];
  onGMsChange: (selected: string[]) => void;
  gameOptions: MultiSelectOption[];
  selectedGames: string[];
  onGamesChange: (selected: string[]) => void;
}

const AdminEventsFilter = ({ 
  filterStatus, 
  onFilterChange, 
  viewMode, 
  onViewModeChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onResetDateRange,
  gmOptions,
  selectedGMs,
  onGMsChange,
  gameOptions,
  selectedGames,
  onGamesChange
}: AdminEventsFilterProps) => {
  const hasDateFilter = startDate || endDate;
  const hasGMFilter = selectedGMs.length > 0;
  const hasGameFilter = selectedGames.length > 0;
  const hasAnyFilter = hasDateFilter || hasGMFilter || hasGameFilter;

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <Select value={filterStatus} onValueChange={onFilterChange}>
        <SelectTrigger className="w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les événements</SelectItem>
          <SelectItem value="assigned">Assignés</SelectItem>
          <SelectItem value="unassigned">Non assignés</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Label className="text-sm text-muted-foreground">GMs :</Label>
        <MultiSelect
          options={gmOptions}
          selected={selectedGMs}
          onChange={onGMsChange}
          placeholder="Tous les GMs"
          className="w-[180px]"
        />
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-sm text-muted-foreground">Jeux :</Label>
        <MultiSelect
          options={gameOptions}
          selected={selectedGames}
          onChange={onGamesChange}
          placeholder="Tous les jeux"
          className="w-[180px]"
        />
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-sm text-muted-foreground">Du :</Label>
        <input
          type="date"
          value={startDate || ''}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="px-2 py-1 border border-input rounded text-sm focus:ring-2 focus:ring-ring focus:border-ring bg-background"
        />
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-sm text-muted-foreground">Au :</Label>
        <input
          type="date"
          value={endDate || ''}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="px-2 py-1 border border-input rounded text-sm focus:ring-2 focus:ring-ring focus:border-ring bg-background"
        />
      </div>

      {hasAnyFilter && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onResetDateRange();
            onGMsChange([]);
            onGamesChange([]);
          }}
          className="flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          Réinitialiser
        </Button>
      )}
    </div>
  );
};

export default AdminEventsFilter;
