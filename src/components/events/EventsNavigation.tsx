
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface EventsNavigationProps {
  viewMode: 'week' | 'month';
  selectedDate: Date;
  onNavigate: (direction: 'prev' | 'next') => void;
}

const EventsNavigation = ({ viewMode, selectedDate, onNavigate }: EventsNavigationProps) => {
  const getDateRange = () => {
    if (viewMode === 'week') {
      const startOfWeek = new Date(selectedDate);
      
      // Utiliser la même logique que dans EventsManagement.tsx
      const dayOfWeek = startOfWeek.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Si dimanche (0), reculer de 6 jours, sinon calculer offset vers lundi
      
      startOfWeek.setDate(startOfWeek.getDate() + mondayOffset);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Ajouter 6 jours pour arriver au dimanche
      
      return `${startOfWeek.toLocaleDateString('fr-FR')} - ${endOfWeek.toLocaleDateString('fr-FR')}`;
    } else {
      return selectedDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    }
  };

  return (
    <div className="flex items-center justify-between mb-4">
      <Button variant="outline" size="sm" onClick={() => onNavigate('prev')}>
        <ChevronLeft className="w-4 h-4" />
      </Button>
      <h3 className="text-lg font-semibold">{getDateRange()}</h3>
      <Button variant="outline" size="sm" onClick={() => onNavigate('next')}>
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default EventsNavigation;
