
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import EventAssignmentEditor from './EventAssignmentEditor';
import EventStatusBadges from './event-details/EventStatusBadges';
import EventBasicInfo from './event-details/EventBasicInfo';
import EventDescriptionFormatter from './event-details/EventDescriptionFormatter';
import GMSelfUnassignment from './event-details/GMSelfUnassignment';
import EventMetadata from './event-details/EventMetadata';
import EventSalesSummary from './event-details/EventSalesSummary';
import AdminNotesEditor from './event-details/AdminNotesEditor';
import AdminNotesDisplay from './event-details/AdminNotesDisplay';

import { EventDetailsDialogProps } from './event-details/types';
import { useProfile } from '@/hooks/auth/useProfile';
import { useAuth } from '@/hooks/useAuth';

const EventDetailsDialog = ({ event, open, onOpenChange, showAssignmentEditor = false, isReadOnly = false }: EventDetailsDialogProps) => {
  const [currentEvent, setCurrentEvent] = useState(event);
  
  const { user } = useAuth();
  const { profile } = useProfile(user);
  const queryClient = useQueryClient();

  // Mettre à jour l'événement local quand l'événement parent change
  useEffect(() => {
    setCurrentEvent(event);
  }, [event]);

  // Écouter les changements du cache pour cet événement spécifique
  useEffect(() => {
    if (!event?.id || !currentEvent) return;
    
    const updateEventFromCache = () => {
      // Chercher dans toutes les queries d'activités
      const allQueries = queryClient.getQueriesData({ queryKey: ['activities'] });
      
      for (const [_, data] of allQueries) {
        if (data && Array.isArray(data)) {
          const updatedEvent = data.find((e: any) => e.id === event.id);
          if (updatedEvent && (
            updatedEvent.admin_notes !== currentEvent?.admin_notes ||
            updatedEvent.is_assigned !== currentEvent?.is_assigned ||
            updatedEvent.status !== currentEvent?.status ||
            updatedEvent.assigned_gm_id !== currentEvent?.assigned_gm_id ||
            updatedEvent.duration !== currentEvent?.duration ||
            updatedEvent.end_time !== currentEvent?.end_time
          )) {
            console.log('📊 EventDetailsDialog: Mise à jour depuis le cache', {
              old: { duration: currentEvent?.duration, end_time: currentEvent?.end_time },
              new: { duration: updatedEvent.duration, end_time: updatedEvent.end_time }
            });
            setCurrentEvent(updatedEvent);
            return;
          }
        }
      }
    };

    // Vérifier périodiquement les changements du cache (réduit la fréquence)
    const interval = setInterval(updateEventFromCache, 200);

    return () => clearInterval(interval);
  }, [event?.id, queryClient, currentEvent?.admin_notes, currentEvent?.is_assigned, currentEvent?.status, currentEvent?.assigned_gm_id, currentEvent?.duration, currentEvent?.end_time]);

  if (!currentEvent) return null;

  const handleEventChange = (updatedEvent: any) => {
    setCurrentEvent(updatedEvent);
  };

  const handleDurationUpdated = (payload: { duration: number; end_time: string }) => {
    console.log('📊 EventDetailsDialog: Durée mise à jour', payload);
    setCurrentEvent(prev => prev ? { ...prev, ...payload } : prev);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            {currentEvent.title}
            {isReadOnly && (
              <span className="text-sm bg-gray-100 text-gray-600 px-2 py-1 rounded">
                Lecture seule
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Détails de l'événement
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <EventStatusBadges event={currentEvent} />
          
          <EventBasicInfo 
            event={currentEvent} 
            isReadOnly={isReadOnly}
            isAdmin={profile?.role === 'admin'}
            onDurationUpdated={handleDurationUpdated}
          />

          {/* Éditeur d'assignation pour l'admin - masqué en lecture seule */}
          {showAssignmentEditor && !isReadOnly && (
            <EventAssignmentEditor 
              event={currentEvent} 
              onUpdate={() => {
                // L'événement sera mis à jour via les queries
              }}
              onEventChange={handleEventChange}
            />
          )}

          {/* Notes Admin - section unifiée */}
          {(profile?.role === 'admin' || profile?.role === 'gm') && !isReadOnly && (
            <AdminNotesEditor 
              event={currentEvent} 
              currentNotes={currentEvent.admin_notes}
              isReadOnly={profile?.role === 'gm'}
              onNotesUpdate={(updatedNotes) => {
                setCurrentEvent(prev => prev ? { ...prev, admin_notes: updatedNotes } : prev);
              }}
            />
          )}

          {/* Résumé des ventes - accessible aux admins et GMs */}
          {(profile?.role === 'admin' || profile?.role === 'gm') && (
            <EventSalesSummary 
              eventId={currentEvent.id}
              eventTitle={currentEvent.title}
              assignedGmId={currentEvent.assigned_gm_id}
            />
          )}

          {currentEvent.description && (
            <EventDescriptionFormatter description={currentEvent.description} />
          )}

          <EventMetadata event={currentEvent} />
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default EventDetailsDialog;
