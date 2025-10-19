
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bug, Calendar, Clock, User, Zap, GamepadIcon, Target, AlertTriangle } from 'lucide-react';
import { useGameMasters } from '@/hooks/useGameMasters';
import { useGMCompetencies } from '@/hooks/useGMCompetencies';
import { useAvailabilities } from '@/hooks/useAvailabilities';
import { useEventGameMappings } from '@/hooks/useEventGameMappings';
import { getGMAssignmentCandidates, getEligibleGMs } from '@/utils/gmAssignmentUtils';
import { findMatchingGame } from '@/utils/unifiedGameMappingService';
import { timeToMinutes } from '@/utils/audit/availabilityChecker';
import { formatGMName } from '@/utils/gmNameFormatter';

interface AssignmentDebugDialogProps {
  event: any;
}

const AssignmentDebugDialog = ({ event }: AssignmentDebugDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [debugResults, setDebugResults] = useState<any>(null);
  
  const { data: gameMasters = [] } = useGameMasters();
  const { data: competencies = [] } = useGMCompetencies();
  const { data: availabilities = [] } = useAvailabilities();
  const { data: mappings = [] } = useEventGameMappings();

  const runDebugAnalysis = async () => {
    console.log('🔍 STARTING DEBUG ANALYSIS FOR EVENT:', event.title);
    
    // Tester la correspondance de jeu
    const gameMatch = await findMatchingGame(event.title);
    
    // Récupérer tous les événements assignés pour la même date
    const { data: assignedEvents, error: eventsError } = await supabase
      .from('activities')
      .select('*')
      .eq('date', event.date)
      .eq('status', 'assigned')
      .not('assigned_gm_id', 'is', null);
    
    if (eventsError) {
      console.error('❌ Erreur lors de la récupération des événements assignés:', eventsError);
    }
    
    // Pour le debug, on a besoin de TOUS les candidats avec leurs raisons
    const debugCandidates = [];
    
    for (const gm of gameMasters) {
      // Vérifier les disponibilités
      const gmAvailabilities = availabilities.filter(av => av.gm_id === gm.id && av.date === event.date);
      let isAvailable = false;
      let availabilityReason = "Aucune disponibilité déclarée";
      let matchingSlots = [];
      
      if (gmAvailabilities.length > 0) {
        const availability = gmAvailabilities[0];
        if (availability.time_slots.includes('indisponible-toute-la-journee')) {
          isAvailable = false;
          availabilityReason = "Déclaré indisponible toute la journée";
        } else {
          // Vérifier compatibilité des créneaux
          const eventStartMinutes = timeToMinutes(event.start_time);
          const eventEndMinutes = timeToMinutes(event.end_time);
          
          for (const slot of availability.time_slots) {
            if (slot === 'toute-la-journee' || 
                (slot === 'matin' && eventStartMinutes >= 480 && eventEndMinutes <= 720) ||
                (slot === 'apres-midi' && eventStartMinutes >= 840 && eventEndMinutes <= 1080) ||
                (slot === 'soir' && eventStartMinutes >= 1080 && eventEndMinutes <= 1320)) {
              matchingSlots.push(slot);
            }
          }
          
          if (matchingSlots.length > 0) {
            isAvailable = true;
            availabilityReason = `Disponible (${matchingSlots.join(', ')})`;
          } else {
            availabilityReason = "Créneau horaire non compatible";
          }
        }
      }
      
      // Vérifier les compétences
      let hasCompetency = true; // Par défaut
      let competencyLevel = 0;
      let competencyReason = "Pas de jeu spécifique identifié";
      
      if (gameMatch?.gameId) {
        const gmCompetency = competencies.find(c => c.gm_id === gm.id && c.game_id === gameMatch.gameId);
        hasCompetency = !!gmCompetency;
        competencyLevel = gmCompetency?.competency_level || 0;
        competencyReason = hasCompetency ? `Compétent niveau ${competencyLevel}` : "Pas de compétence pour ce jeu";
      }
      
      // Vérifier conflits d'assignation réels
      let hasAssignmentConflict = false;
      let conflictReason = "";
      let conflictingEvent = null;
      
      if (assignedEvents && assignedEvents.length > 0) {
        const eventStartMinutes = timeToMinutes(event.start_time);
        const eventEndMinutes = timeToMinutes(event.end_time);
        
        conflictingEvent = assignedEvents.find(assignedEvent => {
          if (assignedEvent.assigned_gm_id !== gm.id || assignedEvent.id === event.id) {
            return false;
          }
          
          const assignedStartMinutes = timeToMinutes(assignedEvent.start_time);
          const assignedEndMinutes = timeToMinutes(assignedEvent.end_time);
          
          // Vérifier s'il y a chevauchement horaire
          return !(eventEndMinutes <= assignedStartMinutes || eventStartMinutes >= assignedEndMinutes);
        });
        
        if (conflictingEvent) {
          hasAssignmentConflict = true;
          conflictReason = `Déjà assigné à "${conflictingEvent.title}" (${conflictingEvent.start_time}-${conflictingEvent.end_time})`;
        }
      }
      
      // Calculer le score (simplifié)
      let score = 0;
      if (isAvailable) score += 1;
      if (hasCompetency) score += competencyLevel * 0.2;
      if (hasAssignmentConflict) score = 0; // Score 0 si conflit
      
      // Vérifier si le GM est actif dans l'admin
      const isActiveInAdmin = gm.is_active;
      let adminStatusReason = isActiveInAdmin ? "Actif dans l'admin" : "Inactif dans l'admin";
      
      console.log(`🔍 GM ${gm.name}: is_active=${gm.is_active}, isActiveInAdmin=${isActiveInAdmin}, adminStatusReason=${adminStatusReason}`);
      
      debugCandidates.push({
        gm,
        isAvailable,
        availabilityReason,
        hasCompetency,
        competencyLevel,
        competencyReason,
        hasAssignmentConflict,
        conflictReason,
        conflictingEvent,
        score,
        matchingSlots,
        isActiveInAdmin,
        adminStatusReason
      });
    }
    
    const eligible = debugCandidates.filter(c => c.isAvailable && c.hasCompetency && !c.hasAssignmentConflict && c.isActiveInAdmin);
    
    setDebugResults({
      event,
      gameMatch,
      candidates: debugCandidates,
      eligible,
      gameMasters: gameMasters.length,
      availabilities: availabilities.filter(av => av.date === event.date).length,
      competencies: competencies.length,
      mappings: mappings.length
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          onClick={runDebugAnalysis}
        >
          <Bug className="w-4 h-4 mr-2" />
          Debug Assignment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5" />
            Debug Assignment - {event?.title}
          </DialogTitle>
        </DialogHeader>
        
        {debugResults && (
          <div className="space-y-6">
            {/* Event Info */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Informations de l'événement</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>{debugResults.event.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span>{debugResults.event.start_time} - {debugResults.event.end_time}</span>
                </div>
              </div>
            </div>

            {/* Game Match Results */}
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                <GamepadIcon className="w-4 h-4" />
                Correspondance de Jeu
              </h3>
              {debugResults.gameMatch.gameId ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      Jeu trouvé: {debugResults.gameMatch.gameName}
                    </Badge>
                    <Badge variant="outline" className={`${
                      debugResults.gameMatch.confidence >= 90 ? 'bg-green-100 text-green-800' :
                      debugResults.gameMatch.confidence >= 70 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      Confiance: {debugResults.gameMatch.confidence}%
                    </Badge>
                  </div>
                  {debugResults.gameMatch.averageDuration && (
                    <p className="text-sm text-purple-700">
                      Durée moyenne: {debugResults.gameMatch.averageDuration} minutes
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <p className="text-purple-700">Aucun jeu correspondant trouvé</p>
                </div>
              )}
            </div>

            {/* Candidates with Reasons */}
            <div className="bg-orange-50 p-4 rounded-lg">
              <h3 className="font-semibold text-orange-900 mb-2">Candidats Potentiels ({debugResults.candidates.length})</h3>
              {debugResults.candidates.length === 0 ? (
                <div className="flex items-center gap-2 text-orange-700">
                  <AlertTriangle className="w-4 h-4" />
                  <p>Aucun candidat trouvé</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {debugResults.candidates.map((candidate: any, index: number) => (
                    <div key={index} className="bg-white p-3 rounded border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span className="font-medium">{formatGMName(candidate.gm)}</span>
                            <span className="text-sm text-gray-600">Score: {candidate.score.toFixed(1)}</span>
                          </div>
                          {candidate.isAvailable && candidate.hasCompetency && !candidate.hasAssignmentConflict && candidate.isActiveInAdmin ? (
                            <Badge variant="outline" className="bg-green-100 text-green-800">
                              ✓ Éligible
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-red-100 text-red-800">
                              ✗ Non éligible
                            </Badge>
                          )}
                        </div>
                        
                        <div className="space-y-1 text-sm">
                          {/* Admin/GM Status */}
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700">Statut GM:</span>
                            {typeof candidate.isActiveInAdmin === 'boolean' ? (
                              candidate.isActiveInAdmin ? (
                                <Badge>Actif</Badge>
                              ) : (
                                <Badge variant="destructive">Inactif</Badge>
                              )
                            ) : (
                              <Badge variant="outline">Inconnu</Badge>
                            )}
                          </div>

                          {/* Availability Status */}
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700">Disponibilité:</span>
                            <span className="text-xs text-gray-600">{candidate.availabilityReason}</span>
                          </div>

                          {/* Competency Status */}
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700">Compétence:</span>
                            <span className="text-xs text-gray-600">{candidate.competencyReason}</span>
                          </div>

                          {/* Assignment Conflicts */}
                          {candidate.hasAssignmentConflict && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-700">Conflit:</span>
                              <span className="text-xs text-red-600">{candidate.conflictReason}</span>
                            </div>
                          )}
                        </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* No Match Summary */}
            {debugResults.eligible.length === 0 && (
              <div className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
                <h3 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Raisons de l'absence d'assignation
                </h3>
                <ul className="space-y-1 text-red-800 text-sm">
                  {debugResults.candidates.filter((c: any) => !c.isActiveInAdmin).length > 0 && (
                    <li>• {debugResults.candidates.filter((c: any) => !c.isActiveInAdmin).length} GM(s) inactif(s) dans l'admin</li>
                  )}
                  {debugResults.candidates.filter((c: any) => !c.isAvailable).length > 0 && (
                    <li>• {debugResults.candidates.filter((c: any) => !c.isAvailable).length} GM(s) indisponible(s) pour ce créneau</li>
                  )}
                  {debugResults.candidates.filter((c: any) => c.hasAssignmentConflict).length > 0 && (
                    <li>• {debugResults.candidates.filter((c: any) => c.hasAssignmentConflict).length} GM(s) déjà assigné(s) à un autre événement</li>
                  )}
                  {debugResults.candidates.filter((c: any) => !c.hasCompetency && debugResults.gameMatch.gameId).length > 0 && (
                    <li>• {debugResults.candidates.filter((c: any) => !c.hasCompetency && debugResults.gameMatch.gameId).length} GM(s) sans compétence pour ce jeu</li>
                  )}
                  {!debugResults.gameMatch.gameId && (
                    <li>• Aucun jeu correspondant trouvé - impossible de vérifier les compétences</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AssignmentDebugDialog;
