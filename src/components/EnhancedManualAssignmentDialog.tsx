
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Clock, GamepadIcon, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { useGameMasters } from '@/hooks/useGameMasters';
import { useGMCompetencies } from '@/hooks/useGMCompetencies';
import { useEventGameMappings } from '@/hooks/useEventGameMappings';
import { useAvailabilities } from '@/hooks/useAvailabilities';
import { getGMAssignmentCandidates, getEligibleGMs, AssignmentCandidate } from '@/utils/gmAssignmentUtils';
import { Activity } from '@/hooks/useActivities';

interface EnhancedManualAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event: Activity | null;
  onAssign: (gmId: string) => void;
}

const EnhancedManualAssignmentDialog = ({ isOpen, onClose, event, onAssign }: EnhancedManualAssignmentDialogProps) => {
  const [selectedGM, setSelectedGM] = useState<string>('');
  const [assignmentCandidates, setAssignmentCandidates] = useState<AssignmentCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { data: gameMasters = [] } = useGameMasters();
  const { data: competencies = [] } = useGMCompetencies();
  const { data: mappings = [] } = useEventGameMappings();
  const { data: availabilities = [] } = useAvailabilities();

  // Calculer les candidats d'attribution de façon asynchrone
  useEffect(() => {
    const loadCandidates = async () => {
      if (!event || !isOpen) {
        setAssignmentCandidates([]);
        return;
      }

      setIsLoading(true);
      try {
        const candidates = await getGMAssignmentCandidates(
          gameMasters,
          event.title,
          event.date,
          event.start_time,
          event.end_time,
          mappings,
          competencies,
          availabilities
        );
        setAssignmentCandidates(candidates);
      } catch (error) {
        console.error('Error loading assignment candidates:', error);
        setAssignmentCandidates([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadCandidates();
  }, [event, isOpen, gameMasters, competencies, mappings, availabilities]);

  const eligibleGMs = getEligibleGMs(assignmentCandidates);

  useEffect(() => {
    if (isOpen) {
      setSelectedGM('');
    }
  }, [isOpen]);

  const handleAssign = () => {
    if (selectedGM) {
      onAssign(selectedGM);
      setSelectedGM('');
    }
  };

  if (!event) return null;

  const getStatusIcon = (candidate: AssignmentCandidate) => {
    if (candidate.isAvailable && candidate.hasCompetency) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    } else if (candidate.isAvailable) {
      return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    } else {
      return <XCircle className="w-4 h-4 text-red-600" />;
    }
  };

  const getStatusText = (candidate: AssignmentCandidate) => {
    if (candidate.isAvailable && candidate.hasCompetency) {
      return 'Disponible et compétent';
    } else if (candidate.isAvailable) {
      return 'Disponible mais pas de compétence spécifique';
    } else if (candidate.hasCompetency) {
      return 'Compétent mais non disponible';
    } else {
      return 'Non disponible et pas de compétence';
    }
  };

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Attribution manuelle - {event.title}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Analyse des candidats en cours...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Attribution manuelle - {event.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations sur l'événement */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">Détails de l'événement</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span>{event.date} de {event.start_time} à {event.end_time}</span>
              </div>
              <div className="flex items-center gap-2">
                <GamepadIcon className="w-4 h-4 text-gray-500" />
                <span>{event.activity_type}</span>
              </div>
            </div>
          </div>

          {/* Résumé des candidats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{eligibleGMs.length}</div>
              <div className="text-sm text-green-800">GMs éligibles</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">
                {assignmentCandidates.filter(c => c.isAvailable && !c.hasCompetency).length}
              </div>
              <div className="text-sm text-yellow-800">Disponibles sans compétence</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {assignmentCandidates.filter(c => !c.isAvailable).length}
              </div>
              <div className="text-sm text-red-800">Non disponibles</div>
            </div>
          </div>

          {/* Sélection du GM */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Sélectionner un Game Master
            </label>
            <Select value={selectedGM} onValueChange={setSelectedGM}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un GM..." />
              </SelectTrigger>
              <SelectContent>
                {assignmentCandidates.map((candidate) => (
                  <SelectItem 
                    key={candidate.gm.id} 
                    value={candidate.gm.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 w-full">
                      {getStatusIcon(candidate)}
                      <span>{candidate.gm.name}</span>
                      {candidate.hasCompetency && candidate.competencyLevel && (
                        <Badge variant="outline" className="ml-auto">
                          Niveau {candidate.competencyLevel}/6
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Détails du GM sélectionné */}
          {selectedGM && (
            <div className="p-4 border rounded-lg">
              {(() => {
                const selectedCandidate = assignmentCandidates.find(c => c.gm.id === selectedGM);
                if (!selectedCandidate) return null;
                
                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedCandidate)}
                      <span className="font-medium">{selectedCandidate.gm.name}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {getStatusText(selectedCandidate)}
                    </p>
                    {selectedCandidate.hasCompetency && selectedCandidate.competencyLevel && (
                      <Badge variant="default">
                        Compétence: {selectedCandidate.competencyLevel}/6
                      </Badge>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button 
              onClick={handleAssign} 
              disabled={!selectedGM}
            >
              Assigner le GM
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EnhancedManualAssignmentDialog;
