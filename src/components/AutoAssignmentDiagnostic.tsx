
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Clock, 
  User, 
  Calendar, 
  GamepadIcon,
  RefreshCw,
  Search,
  Target
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getBestGMCandidate } from '@/utils/gmAssignmentUtils';
import { useGameMasters } from '@/hooks/useGameMasters';
import { useGMCompetencies } from '@/hooks/useGMCompetencies';
import { useEventGameMappings } from '@/hooks/useEventGameMappings';
import { useAvailabilities } from '@/hooks/useAvailabilities';

interface DiagnosticProps {
  eventId?: string;
  eventTitle: string;
  eventDate: string;
  eventStartTime: string;
  eventEndTime: string;
}

const AutoAssignmentDiagnostic: React.FC<DiagnosticProps> = ({
  eventTitle,
  eventDate,
  eventStartTime,
  eventEndTime
}) => {
  const { toast } = useToast();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  
  const { data: gameMasters = [] } = useGameMasters();
  const { data: competencies = [] } = useGMCompetencies();
  const { data: mappings = [] } = useEventGameMappings();
  const { data: availabilities = [] } = useAvailabilities();

  const runDiagnostic = async () => {
    setIsAnalyzing(true);
    try {
      console.log('🔍 [DIAGNOSTIC] Démarrage analyse événement:', eventTitle);
      
      const result = await getBestGMCandidate(
        gameMasters,
        eventTitle,
        eventDate,
        eventStartTime,
        eventEndTime,
        mappings,
        competencies,
        availabilities
      );

      console.log('📊 [DIAGNOSTIC] Résultat analyse:', result);
      setAnalysisResult(result);
      
      toast({
        title: "Diagnostic terminé",
        description: `Analyse effectuée avec la logique simplifiée`,
      });
    } catch (error) {
      console.error('❌ [DIAGNOSTIC] Erreur:', error);
      toast({
        title: "Erreur diagnostic",
        description: "Impossible d'analyser l'événement",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getAvailabilityStatus = (availability: any) => {
    if (!availability) {
      return { status: 'NON_DECLAREE', color: 'red', text: 'Aucune disponibilité déclarée' };
    }
    
    if (availability.time_slots?.includes('indisponible-toute-la-journee')) {
      return { status: 'INDISPONIBLE', color: 'red', text: 'Indisponible toute la journée' };
    }
    
    if (availability.time_slots?.includes('toute-la-journee')) {
      return { status: 'DISPONIBLE', color: 'green', text: 'Disponible toute la journée' };
    }
    
    if (availability.time_slots?.length > 0) {
      return { status: 'CRENEAUX', color: 'blue', text: `Créneaux: ${availability.time_slots.join(', ')}` };
    }
    
    return { status: 'INCONNU', color: 'gray', text: 'Statut inconnu' };
  };

  const StatusBadge = ({ status, children }: { status: 'success' | 'error' | 'warning' | 'info', children: React.ReactNode }) => {
    const colors = {
      success: 'bg-green-100 text-green-800 border-green-200',
      error: 'bg-red-100 text-red-800 border-red-200',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      info: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    
    return (
      <Badge className={`${colors[status]} border`}>
        {children}
      </Badge>
    );
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5 text-blue-600" />
          Diagnostic d'Auto-Assignation
        </CardTitle>
        <CardDescription>
          Analyse détaillée avec la nouvelle logique simplifiée
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Button 
            onClick={runDiagnostic}
            disabled={isAnalyzing}
            className="flex items-center gap-2"
          >
            {isAnalyzing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Target className="w-4 h-4" />
            )}
            {isAnalyzing ? 'Analyse en cours...' : 'Analyser cet événement'}
          </Button>
        </div>

        {analysisResult && (
          <div className="space-y-6">
            <Separator />
            
            {/* Informations sur l'événement */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                Événement Analysé (Nouvelle Logique Simplifiée)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="font-medium">Titre:</p>
                  <p className="text-blue-700">{eventTitle}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="font-medium">Date:</p>
                  <p className="text-green-700">{eventDate}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <p className="font-medium">Heure:</p>
                  <p className="text-purple-700">{eventStartTime} - {eventEndTime}</p>
                </div>
              </div>
            </div>

            {/* Correspondance de jeu */}
            {analysisResult.selectionDetails?.gameMatch && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <GamepadIcon className="w-4 h-4 text-green-600" />
                  Correspondance de Jeu
                </h4>
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-green-800">
                        {analysisResult.selectionDetails.gameMatch.gameName || 'Jeu non identifié'}
                      </p>
                      <p className="text-sm text-green-600">
                        Confiance: {analysisResult.selectionDetails.gameMatch.confidence}%
                      </p>
                    </div>
                    <StatusBadge status="success">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Identifié
                    </StatusBadge>
                  </div>
                </div>
              </div>
            )}

            {/* Résultat de sélection */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                Résultat de Sélection
              </h4>
              
              {analysisResult.selectedGM ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h5 className="font-medium text-green-800">
                      GM Sélectionné: {analysisResult.selectedGM.name}
                    </h5>
                    <StatusBadge status="success">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Assignable
                    </StatusBadge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-green-600">
                        <strong>Niveau de compétence:</strong> {analysisResult.selectionDetails.selectedGMDetails?.competencyLevel || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-green-600">
                        <strong>Poids:</strong> {analysisResult.selectionDetails.selectedGMDetails?.weight || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <Alert>
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Aucun GM assignable</strong> - Aucun GM ne répond aux critères simplifiés
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Candidats éligibles */}
            {analysisResult.selectionDetails?.eligibleCount > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  Candidats Éligibles ({analysisResult.selectionDetails.eligibleCount})
                </h4>
                <div className="space-y-2">
                  {analysisResult.selectionDetails.allEligibleGMs?.map((gm: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div>
                        <p className="font-medium text-green-800">{gm.name}</p>
                        <p className="text-sm text-green-600">
                          Niveau {gm.competencyLevel} • Poids: {gm.weight}
                        </p>
                      </div>
                      <StatusBadge status="success">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Éligible
                      </StatusBadge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Analyse détaillée des GMs */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <User className="w-4 h-4 text-gray-600" />
                Analyse Détaillée des GMs
              </h4>
              <div className="space-y-4">
                {gameMasters.filter(gm => gm.is_active).map((gm) => {
                  const availability = availabilities.find(av => av.gm_id === gm.id && av.date === eventDate);
                  const availabilityStatus = getAvailabilityStatus(availability);
                  const competency = competencies.find(comp => 
                    comp.gm_id === gm.id && 
                    comp.game_id === analysisResult.selectionDetails?.gameMatch?.gameId
                  );

                  return (
                    <div key={gm.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h5 className="font-medium">{gm.name}</h5>
                        {analysisResult.selectionDetails?.allEligibleGMs?.some((eligibleGM: any) => eligibleGM.name === gm.name) ? (
                          <StatusBadge status="success">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            ÉLIGIBLE
                          </StatusBadge>
                        ) : (
                          <StatusBadge status="error">
                            <XCircle className="w-3 h-3 mr-1" />
                            NON ÉLIGIBLE
                          </StatusBadge>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            {gm.is_active ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span>Actif: {gm.is_active ? 'Oui' : 'Non'}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {gm.is_available ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span>Disponible: {gm.is_available ? 'Oui' : 'Non'}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            {availabilityStatus.status === 'DISPONIBLE' ? (
                              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                            ) : availabilityStatus.status === 'INDISPONIBLE' ? (
                              <XCircle className="w-4 h-4 text-red-600 mt-0.5" />
                            ) : availabilityStatus.status === 'NON_DECLAREE' ? (
                              <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
                            ) : (
                              <Clock className="w-4 h-4 text-blue-600 mt-0.5" />
                            )}
                            <div>
                              <p className="font-medium">Statut de disponibilité:</p>
                              <p className={`text-sm ${
                                availabilityStatus.status === 'DISPONIBLE' ? 'text-green-600' :
                                availabilityStatus.status === 'INDISPONIBLE' ? 'text-red-600' :
                                availabilityStatus.status === 'NON_DECLAREE' ? 'text-yellow-600' :
                                'text-blue-600'
                              }`}>
                                {availabilityStatus.text}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        {competency && (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm">
                              Compétence: Niveau {competency.competency_level}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Nouvelle logique expliquée */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                Nouvelle Logique Simplifiée
              </h4>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="font-medium text-blue-800 mb-2">Critères d'éligibilité :</p>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• GM actif et disponible dans le système</li>
                  <li>• Disponibilités déclarées pour la date (et non "indisponible")</li>
                  <li>• Créneaux horaires compatibles</li>
                  <li>• Compétence niveau 1 minimum pour le jeu (si identifié)</li>
                  <li>• Pas de conflit d'assignation existant</li>
                </ul>
                <p className="font-medium text-blue-800 mt-3 mb-1">Sélection :</p>
                <p className="text-sm text-blue-700">
                  Aléatoire pondérée basée sur le niveau de compétence
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AutoAssignmentDiagnostic;
