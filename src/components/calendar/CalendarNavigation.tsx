
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarNavigationProps {
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onToday: () => void;
}

const CalendarNavigation = ({ onPreviousWeek, onNextWeek, onToday }: CalendarNavigationProps) => {
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <Button variant="outline" size="sm" onClick={onPreviousWeek} className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3">
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={onToday} className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm">
        Aujourd'hui
      </Button>
      <Button variant="outline" size="sm" onClick={onNextWeek} className="h-8 w-8 p-0 sm:h-9 sm:w-auto sm:px-3">
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default CalendarNavigation;
