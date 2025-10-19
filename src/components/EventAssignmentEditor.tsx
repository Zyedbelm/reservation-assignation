import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { User, UserX, Users, AlertCircle, CheckCircle, AlertTriangle, Plus } from 'lucide-react';
import { useGameMasters } from '@/hooks/useGameMasters';
import { useAvailabilities } from '@/hooks/useAvailabilities';
import { useGMCompetencies } from '@/hooks/useGMCompetencies';
import { useGames } from '@/hooks/useGames';
import { checkGMAvailabilityConflicts } from '@/utils/assignmentValidation';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { createGMNotificationWithEmail, createNotificationContent } from '@/utils/unifiedNotificationService';
import { findMatchingGame, type GameMatch } from '@/utils/unifiedGameMappingService';
import { useQuery } from '@tanstack/react-query';


interface EventAssignmentEditorProps {
  event: any;
  onUpdate: () => void;
  onEventChange?: (updatedEvent: any) => void;
}

const EventAssignmentEditor = ({ event, onUpdate, onEventChange }: EventAssignmentEditorProps) => {
  const [selectedGmId, setSelectedGmId] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [isUnassigning, setIsUnassigning] = useState(false);
  const [matchedGame, setMatchedGame] = useState<GameMatch | null>(null);
  const [isResolvingGame, setIsResolvingGame] = useState(true);
  const [availabilityStatus, setAvailabilityStatus] = useState<{
    hasConflict: boolean;
    conflicts: any[];
    minimumBreakViolations: any[];
  } | null>(null);
  const [showAddGM, setShowAddGM] = useState(false);
  
  const { data: gameMasters = [] } = useGameMasters();
  const { data: competencies = [] } = useGMCompetencies();
  const { data: availabilities = [] } = useAvailabilities();
  const { data: games = [] } = useGames();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Récupérer les GMs assignés depuis event_assignments
  const { data: eventAssignments = [] } = useQuery({
    queryKey: ['event-assignments', event?.id],
    queryFn: async () => {
      if (!event?.id) return [];
      const { data, error } = await supabase
        .from('event_assignments')
        .select('*')
        .eq('activity_id', event.id)
        .order('assignment_order');
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!event?.id
  });

  // Détecter le jeu associé à l'événement
  useEffect(() => {
    if (event?.title) {
      setIsResolvingGame(true);
      findMatchingGame(event.title)
        .then(result => {
          setMatchedGame(result);
          console.log(`🎮 Game detection for "${event.title}":`, result);
        })
        .catch(error => {
          console.error('Error detecting game:', error);
          setMatchedGame({ gameId: null, gameName: null, averageDuration: null, confidence: 0 });
        })
        .finally(() => {
          setIsResolvingGame(false);
        });
    }
  }, [event?.title, games]);

  // Fonction pour formater l'affichage du nom du GM
  const getGMDisplayName = (gameMaster: any) => {
    if (!gameMaster) return 'GM inconnu';
    
    // Si on a prénom et nom, les utiliser
    if (gameMaster.first_name && gameMaster.last_name) {
      return `${gameMaster.first_name} ${gameMaster.last_name}`;
    }
    
    // Si on a juste le prénom ou le nom, l'utiliser
    if (gameMaster.first_name) return gameMaster.first_name;
    if (gameMaster.last_name) return gameMaster.last_name;
    
    // Sinon utiliser le nom complet si disponible
    if (gameMaster.name && gameMaster.name !== gameMaster.email) {
      return gameMaster.name;
    }
    
    // En dernier recours, utiliser l'email tronqué
    if (gameMaster.email) {
      const emailPart = gameMaster.email.split('@')[0];
      return emailPart.length > 15 ? `${emailPart.substring(0, 15)}...` : emailPart;
    }
    
    return 'GM inconnu';
  };

  // Fonction pour récupérer tous les GMs assignés
  const getAssignedGMs = () => {
    if (!eventAssignments || eventAssignments.length === 0) {
      // Fallback rétrocompatibilité: afficher le GM principal si présent
      if (event?.assigned_gm_id) {
        const gm = gameMasters.find(g => g.id === event.assigned_gm_id);
        return gm ? [gm] : [];
      }
      return [];
    }
    
    return eventAssignments
      .map(assignment => gameMasters.find(gm => gm.id === assignment.gm_id))
      .filter(Boolean);
  };

  const getPrimaryGM = () => {
    const assignedGMs = getAssignedGMs();
    return assignedGMs[0] || null;
  };

  // Vérifier les conflits quand un GM est sélectionné
  useEffect(() => {
    if (selectedGmId && event && !isResolvingGame) {
      checkAvailabilityConflicts();
    }
  }, [selectedGmId, event, isResolvingGame, matchedGame]);

  const checkAvailabilityConflicts = async () => {
    if (!selectedGmId || !event) return;

    try {
      const conflicts = await checkGMAvailabilityConflicts(
        selectedGmId,
        event.date,
        event.start_time,
        event.end_time,
        matchedGame?.gameId || event.game_id,
        event.id
      );
      setAvailabilityStatus(conflicts);
    } catch (error) {
      console.error('Error checking availability conflicts:', error);
    }
  };

  const getCompetencyLevel = (gmId: string) => {
    const gameId = matchedGame?.gameId || event.game_id;
    if (!gameId) return 0;
    const competency = competencies.find(c => c.gm_id === gmId && c.game_id === gameId);
    return competency ? competency.competency_level : 0;
  };

  const getStatusColor = (level: number) => {
    if (level >= 3) return 'bg-green-100 text-green-800';
    if (level >= 1) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getGMAvailabilityStatus = (gmId: string) => {
    const gmAvailability = availabilities.find(
      av => av.gm_id === gmId && av.date === event.date
    );
    
    if (!gmAvailability) {
      return { status: 'none', message: 'Aucune disponibilité déclarée' };
    }

    const eventTimeSlot = `${event.start_time.substring(0, 5)}-${event.end_time.substring(0, 5)}`;
    
    if (gmAvailability.time_slots.includes('toute-la-journee')) {
      return { status: 'full', message: 'Disponible toute la journée' };
    }
    
    if (gmAvailability.time_slots.includes(eventTimeSlot)) {
      return { status: 'exact', message: 'Créneaux compatible' };
    }
    
    // Vérifier si l'événement s'intègre dans un créneau plus large
    for (const slot of gmAvailability.time_slots) {
      if (slot.includes('-')) {
        const [slotStart, slotEnd] = slot.split('-');
        const slotStartMin = timeToMinutes(slotStart);
        const slotEndMin = timeToMinutes(slotEnd);
        const eventStartMin = timeToMinutes(event.start_time.substring(0, 5));
        const eventEndMin = timeToMinutes(event.end_time.substring(0, 5));
        
        if (slotStartMin <= eventStartMin && slotEndMin >= eventEndMin) {
          return { status: 'partial', message: `Compatible avec ${slot}` };
        }
      }
    }
    
    return { status: 'conflict', message: 'Créneau non compatible' };
  };

  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const handleAssignPrimary = async () => {
    if (!selectedGmId) return;

    // Vérifier s'il y a des conflits
    if (availabilityStatus?.hasConflict) {
      const confirmAssign = window.confirm(
        "⚠️ Attention ! Des conflits ont été détectés avec les disponibilités ou les autres assignations. Voulez-vous vraiment continuer cette assignation ?"
      );
      
      if (!confirmAssign) {
        return;
      }
    }

    setIsAssigning(true);
    try {
      const selectedGM = gameMasters.find(gm => gm.id === selectedGmId);
      
      // Si c'est le premier assignment, il devient l'ordre 1, sinon on maintient l'assignment_order basé sur l'ordre d'assignation
      const isFirstGM = eventAssignments.length === 0;
      const assignmentOrder = isFirstGM ? 1 : Math.max(...eventAssignments.map(assignment => assignment.assignment_order || 0), 0) + 1;
      
      // Mettre à jour l'activité principale seulement si c'est le premier GM
      let updatedActivity = event;
      if (isFirstGM) {
        const { data: activityUpdate, error: assignError } = await supabase
          .from('activities')
          .update({
            assigned_gm_id: selectedGmId,
            is_assigned: true,
            assignment_date: new Date().toISOString(),
            status: 'assigned'
          })
          .eq('id', event.id)
          .select()
          .single();

        if (assignError) throw assignError;
        updatedActivity = activityUpdate;
      } else {
        // Si ce n'est pas le premier GM, juste marquer l'activité comme assignée
        const { data: activityUpdate, error: assignError } = await supabase
          .from('activities')
          .update({
            is_assigned: true,
            status: 'assigned'
          })
          .eq('id', event.id)
          .select()
          .single();

        if (assignError) throw assignError;
        updatedActivity = activityUpdate;
      }

      // Assurer une entrée dans event_assignments (sans utiliser upsert)
      const { data: existingAssignment, error: fetchAssignErr } = await supabase
        .from('event_assignments')
        .select('id')
        .eq('activity_id', event.id)
        .eq('gm_id', selectedGmId)
        .maybeSingle();

      if (fetchAssignErr) throw fetchAssignErr;

      if (existingAssignment?.id) {
        const { error: updateAssignErr } = await supabase
          .from('event_assignments')
          .update({
            assignment_order: assignmentOrder,
            status: 'assigned'
          })
          .eq('id', existingAssignment.id);
        if (updateAssignErr) throw updateAssignErr;
      } else {
        const { error: insertAssignErr } = await supabase
          .from('event_assignments')
          .insert({
            activity_id: event.id,
            gm_id: selectedGmId,
            assignment_order: assignmentOrder,
            status: 'assigned'
          });
        if (insertAssignErr) throw insertAssignErr;
      }

      // Envoyer notification
      if (selectedGM) {
        console.log('📧 Sending assignment notification...');
        
        const { title, message } = createNotificationContent('assignment', updatedActivity);
        
        createGMNotificationWithEmail({
          gmId: selectedGM.id,
          gmEmail: selectedGM.email,
          gmName: selectedGM.name,
          notificationType: 'assignment',
          eventId: event.id,
          title,
          message,
          eventData: updatedActivity
        }).catch(error => {
          console.error('❌ Error sending assignment notification:', error);
        });
      }

      // Invalider les queries
      await queryClient.invalidateQueries({ queryKey: ['activities'] });
      await queryClient.invalidateQueries({ queryKey: ['all-events'] });
      await queryClient.invalidateQueries({ queryKey: ['unassigned-events'] });
      await queryClient.invalidateQueries({ queryKey: ['event-assignments'] });
      await queryClient.invalidateQueries({ queryKey: ['all-event-assignments'] });

      toast({
        title: "Assignation réussie",
        description: `Événement assigné à ${getGMDisplayName(selectedGM)}. Notification envoyée.`,
      });

      if (onEventChange && updatedActivity) {
        onEventChange(updatedActivity);
      }

      onUpdate();
      setSelectedGmId('');
      setAvailabilityStatus(null);
    } catch (error) {
      console.error('Error assigning GM:', error);
      toast({
        title: "Erreur d'assignation",
        description: "Impossible d'assigner le GM à cet événement",
        variant: "destructive"
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleAddGM = async () => {
    if (!selectedGmId) return;

    // Vérifier que le GM n'est pas déjà assigné
    const assignedGMs = getAssignedGMs();
    if (assignedGMs.some(gm => gm.id === selectedGmId)) {
      toast({
        title: "GM déjà assigné",
        description: "Ce GM est déjà assigné à cet événement",
        variant: "destructive"
      });
      return;
    }

    setIsAssigning(true);
    try {
      const selectedGM = gameMasters.find(gm => gm.id === selectedGmId);
      const nextOrder = Math.max(...eventAssignments.map(assignment => assignment.assignment_order || 0), 0) + 1;
      
      // Si c'est le premier GM, mettre à jour aussi la table activities
      if (assignedGMs.length === 0) {
        const { error: activityError } = await supabase
          .from('activities')
          .update({
            assigned_gm_id: selectedGmId,
            is_assigned: true,
            assignment_date: new Date().toISOString(),
            status: 'assigned'
          })
          .eq('id', event.id);

        if (activityError) throw activityError;
      }
      
      // Ajouter le GM aux assignments
      const { error: assignmentError } = await supabase
        .from('event_assignments')
        .insert({
          activity_id: event.id,
          gm_id: selectedGmId,
          assignment_order: nextOrder,
          status: 'assigned'
        });

      if (assignmentError) throw assignmentError;

      // Envoyer notification
      if (selectedGM) {
        console.log('📧 Sending assignment notification...');
        
        const { title, message } = createNotificationContent('assignment', event);
        
        createGMNotificationWithEmail({
          gmId: selectedGM.id,
          gmEmail: selectedGM.email,
          gmName: selectedGM.name,
          notificationType: 'assignment',
          eventId: event.id,
          title,
          message,
          eventData: event
        }).catch(error => {
          console.error('❌ Error sending assignment notification:', error);
        });
      }

      // Invalider les queries
      await queryClient.invalidateQueries({ queryKey: ['activities'] });
      await queryClient.invalidateQueries({ queryKey: ['all-events'] });
      await queryClient.invalidateQueries({ queryKey: ['unassigned-events'] });
      await queryClient.invalidateQueries({ queryKey: ['event-assignments'] });
      await queryClient.invalidateQueries({ queryKey: ['all-event-assignments'] });

      toast({
        title: "GM ajouté",
        description: `${getGMDisplayName(selectedGM)} ajouté à l'événement.`,
      });

      onUpdate();
      setSelectedGmId('');
      setShowAddGM(false);
      setAvailabilityStatus(null);
    } catch (error) {
      console.error('Error adding GM:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter le GM à cet événement",
        variant: "destructive"
      });
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassignGM = async (gmId: string) => {
    setIsUnassigning(true);
    try {
      const gmToUnassign = gameMasters.find(gm => gm.id === gmId);
      const assignedGMs = getAssignedGMs();
      
      // Supprimer l'assignment spécifique
      await supabase
        .from('event_assignments')
        .delete()
        .eq('activity_id', event.id)
        .eq('gm_id', gmId);

      // Si c'était le dernier GM, mettre à jour l'activité
      if (assignedGMs.length === 1) {
        await supabase
          .from('activities')
          .update({
            assigned_gm_id: null,
            is_assigned: false,
            assignment_date: null,
            status: 'pending'
          })
          .eq('id', event.id);
      } else if (gmId === event.assigned_gm_id) {
        // Si on désassigne le GM principal, promouvoir le suivant
        const remainingGMs = assignedGMs.filter(gm => gm.id !== gmId);
        if (remainingGMs.length > 0) {
          await supabase
            .from('activities')
            .update({
              assigned_gm_id: remainingGMs[0].id
            })
            .eq('id', event.id);
        }
      }

      // Envoyer notification de désassignation
      if (gmToUnassign) {
        console.log('📧 Sending unassignment notification...');
        
        const { title, message } = createNotificationContent('unassigned', event);
        
        createGMNotificationWithEmail({
          gmId: gmToUnassign.id,
          gmEmail: gmToUnassign.email,
          gmName: gmToUnassign.name,
          notificationType: 'unassigned',
          eventId: event.id,
          title,
          message,
          eventData: event
        }).catch(error => {
          console.error('❌ Error sending unassignment notification:', error);
        });
      }

      // Récupérer l'événement mis à jour
      const { data: updatedActivity } = await supabase
        .from('activities')
        .select('*')
        .eq('id', event.id)
        .single();

      // Invalider les queries
      await queryClient.invalidateQueries({ queryKey: ['activities'] });
      await queryClient.invalidateQueries({ queryKey: ['all-events'] });
      await queryClient.invalidateQueries({ queryKey: ['unassigned-events'] });
      await queryClient.invalidateQueries({ queryKey: ['event-assignments'] });
      await queryClient.invalidateQueries({ queryKey: ['all-event-assignments'] });

      toast({
        title: "GM désassigné",
        description: `${getGMDisplayName(gmToUnassign)} a été désassigné.`,
      });

      // Mettre à jour l'événement dans le composant parent
      if (onEventChange && updatedActivity) {
        onEventChange(updatedActivity);
      }

      onUpdate();
    } catch (error) {
      console.error('Error unassigning GM:', error);
      toast({
        title: "Erreur de désassignation",
        description: "Impossible de désassigner ce GM",
        variant: "destructive"
      });
    } finally {
      setIsUnassigning(false);
    }
  };

  const handleUnassignAll = async () => {
    const confirmUnassign = window.confirm(
      "Êtes-vous sûr de vouloir désassigner tous les GMs de cet événement ?"
    );
    
    if (!confirmUnassign) return;

    setIsUnassigning(true);
    try {
      const assignedGMs = getAssignedGMs();
      
      // Supprimer tous les assignments
      await supabase
        .from('event_assignments')
        .delete()
        .eq('activity_id', event.id);

      // Mettre à jour l'activité
      await supabase
        .from('activities')
        .update({
          assigned_gm_id: null,
          is_assigned: false,
          assignment_date: null,
          status: 'pending'
        })
        .eq('id', event.id);

      // Envoyer notifications à tous les GMs
      assignedGMs.forEach(gm => {
        if (gm) {
          const { title, message } = createNotificationContent('unassigned', event);
          
          createGMNotificationWithEmail({
            gmId: gm.id,
            gmEmail: gm.email,
            gmName: gm.name,
            notificationType: 'unassigned',
            eventId: event.id,
            title,
            message,
            eventData: event
          }).catch(error => {
            console.error('❌ Error sending unassignment notification:', error);
          });
        }
      });

      // Invalider les queries
      await queryClient.invalidateQueries({ queryKey: ['activities'] });
      await queryClient.invalidateQueries({ queryKey: ['all-events'] });
      await queryClient.invalidateQueries({ queryKey: ['unassigned-events'] });
      await queryClient.invalidateQueries({ queryKey: ['event-assignments'] });
      await queryClient.invalidateQueries({ queryKey: ['all-event-assignments'] });

      toast({
        title: "Tous les GMs désassignés",
        description: "L'événement a été complètement désassigné.",
      });

      onUpdate();
    } catch (error) {
      console.error('Error unassigning all GMs:', error);
      toast({
        title: "Erreur de désassignation",
        description: "Impossible de désassigner tous les GMs",
        variant: "destructive"
      });
    } finally {
      setIsUnassigning(false);
    }
  };

  const assignedGMs = getAssignedGMs();
  const primaryGM = getPrimaryGM();

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Users className="w-4 h-4 mr-2 inline-block" />
          Assigner un Game Master
          {matchedGame?.gameName && (
            <Badge variant="outline" className="ml-2">
              {matchedGame.gameName}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* GMs assignés */}
          {assignedGMs.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                GMs assignés ({assignedGMs.length})
              </h4>
              {assignedGMs.map((gm, index) => (
                <div key={gm.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-green-500" />
                    <div>
                      <span className="font-medium">{getGMDisplayName(gm)}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {index === 0 ? 'Principal' : `Secondaire ${index}`}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnassignGM(gm.id)}
                    disabled={isUnassigning}
                  >
                    <UserX className="w-3 h-3 mr-1" />
                    Retirer
                  </Button>
                </div>
              ))}
              
              {assignedGMs.length > 1 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleUnassignAll}
                  disabled={isUnassigning}
                  className="w-full"
                >
                  {isUnassigning ? 'Désassignation...' : 'Désassigner tous les GMs'}
                </Button>
              )}
            </div>
          )}

          {/* Interface d'ajout de GM */}
          {(assignedGMs.length === 0 || showAddGM) && (
            <div className="space-y-4">
            {/* Détection de jeu masquée pour fluidité */}

            {/* Message d'avertissement si jeu détecté mais aucun GM compétent */}
            {(() => {
              if (!matchedGame?.gameId) return null;
              
              const competentGMs = gameMasters.filter(gm => 
                gm.is_active !== false && getCompetencyLevel(gm.id) > 0
              );
              
              if (competentGMs.length === 0) {
                return (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-sm text-amber-800">
                      Aucun GM n'a de compétence déclarée pour ce jeu - Affichage de tous les GM actifs
                    </span>
                  </div>
                );
              }
              return null;
            })()}

            <Select onValueChange={setSelectedGmId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner un Game Master" />
              </SelectTrigger>
              <SelectContent>
                {(() => {
                  const activeGMs = gameMasters.filter(gm => gm.is_active !== false);
                  let gmList = activeGMs;
                  let competentCount = 0;

                  if (matchedGame?.gameId) {
                    const competentGMs = activeGMs.filter(gm => getCompetencyLevel(gm.id) > 0);
                    competentCount = competentGMs.length;
                    gmList = competentCount > 0 ? competentGMs : activeGMs;
                  }

                  console.log('[EventAssignmentEditor] GMs — total:', gameMasters.length, 'actifs:', activeGMs.length, 'compétents:', competentCount, 'affichés:', gmList.length);

                  if (gmList.length === 0) {
                    return (
                      <SelectItem value="none" disabled>
                        Aucun GM disponible
                      </SelectItem>
                    );
                  }

                  return gmList.map((gm) => {
                    const competencyLevel = getCompetencyLevel(gm.id);
                    const availabilityStatus = getGMAvailabilityStatus(gm.id);

                    return (
                      <SelectItem key={gm.id} value={gm.id}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <span>{getGMDisplayName(gm)}</span>
                            {competencyLevel > 0 ? (
                              <Badge variant="secondary" className="text-xs">
                                Niveau {competencyLevel}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-gray-500">
                                Sans compétence
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 ml-2">
                            {availabilityStatus.status === 'none' && (
                              <AlertTriangle className="w-3 h-3 text-red-500" />
                            )}
                            {availabilityStatus.status === 'conflict' && (
                              <AlertCircle className="w-3 h-3 text-orange-500" />
                            )}
                            {(availabilityStatus.status === 'exact' || availabilityStatus.status === 'full') && (
                              <CheckCircle className="w-3 h-3 text-green-500" />
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    );
                  });
                })()}
              </SelectContent>
            </Select>

            {selectedGmId && (
              <div className="space-y-3">
                {/* Affichage du statut de disponibilité */}
                {(() => {
                  const status = getGMAvailabilityStatus(selectedGmId);
                  return (
                    <div className={`p-3 rounded-lg border ${
                      status.status === 'none' || status.status === 'conflict' 
                        ? 'bg-red-50 border-red-200' 
                        : status.status === 'partial'
                          ? 'bg-orange-50 border-orange-200'
                          : 'bg-green-50 border-green-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        {status.status === 'none' || status.status === 'conflict' ? (
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                        ) : status.status === 'partial' ? (
                          <AlertCircle className="w-4 h-4 text-orange-600" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        )}
                        <span className={`text-sm font-medium ${
                          status.status === 'none' || status.status === 'conflict' 
                            ? 'text-red-800' 
                            : status.status === 'partial'
                              ? 'text-orange-800'
                              : 'text-green-800'
                        }`}>
                          {status.message}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Affichage des conflits détectés */}
                {availabilityStatus?.hasConflict && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium text-red-800">Conflits détectés</span>
                    </div>
                    
                    {availabilityStatus.conflicts.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs text-red-700">Chevauchements d'horaires :</p>
                        {availabilityStatus.conflicts.map((conflict, idx) => (
                          <div key={idx} className="text-xs text-red-600">
                            • {conflict.eventTitle} ({conflict.startTime}-{conflict.endTime})
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {availabilityStatus.minimumBreakViolations.length > 0 && (
                      <div className="space-y-1 mt-2">
                        <p className="text-xs text-red-700">Délai minimum non respecté :</p>
                        {availabilityStatus.minimumBreakViolations.map((violation, idx) => (
                          <div key={idx} className="text-xs text-red-600">
                            • {violation.eventTitle} ({violation.startTime}-{violation.endTime})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {showAddGM && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddGM(false);
                    setSelectedGmId('');
                    setAvailabilityStatus(null);
                  }}
                  disabled={isAssigning}
                  className="flex-1"
                >
                  Annuler
                </Button>
              )}
              <Button
                className="flex-1"
                onClick={assignedGMs.length === 0 ? handleAssignPrimary : handleAddGM}
                disabled={isAssigning || !selectedGmId}
                variant={availabilityStatus?.hasConflict ? "destructive" : "default"}
              >
                {isAssigning ? 'Assignation...' : 
                 availabilityStatus?.hasConflict ? 'Assigner malgré les conflits' : 
                 assignedGMs.length === 0 ? 'Assigner' : 'Ajouter ce GM'}
              </Button>
            </div>
            </div>
          )}

          {/* Bouton d'ajout de GM supplémentaire */}
          {assignedGMs.length > 0 && !showAddGM && (
            <Button
              variant="outline"
              onClick={() => setShowAddGM(true)}
              className="w-full"
            >
              <Users className="w-4 h-4 mr-2" />
              Ajouter un GM
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default EventAssignmentEditor;
