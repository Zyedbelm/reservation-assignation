
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Calendar as CalendarIcon } from 'lucide-react';
import { format, addDays, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCreateAvailability, useAvailabilities } from '@/hooks/useAvailabilities';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import DateRangeSelector from './DateRangeSelector';
import { formatAvailabilityError } from '@/utils/availabilityErrorHandler';
import { supabase } from '@/integrations/supabase/client';

// Créneaux simplifiés selon les demandes
const timeSlots = [
  { value: 'indisponible-toute-la-journee', label: 'Indisponible toute la journée', color: 'bg-red-50 text-red-700 border-red-200' },
  { value: '09:00-12:00', label: 'Matin (9h00 - 12h00)', color: '' },
  { value: '14:00-18:00', label: 'Après-midi (14h00 - 18h00)', color: '' },
  { value: '18:00-21:00', label: 'Soir (18h00 - 21h00)', color: '' },
  { value: 'toute-la-journee', label: 'Disponible toute la journée', color: 'bg-green-50 text-green-700 border-green-200' },
];

const GMAvailabilityForm = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const createAvailability = useCreateAvailability();
  
  // Récupérer les disponibilités existantes pour vérification
  const { data: existingAvailabilities = [] } = useAvailabilities(profile?.gm_id);
  
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [currentSlot, setCurrentSlot] = useState<string>('');
  const [processing, setProcessing] = useState(false);

  const handleAddSlot = () => {
    if (currentSlot && !selectedSlots.includes(currentSlot)) {
      setSelectedSlots([...selectedSlots, currentSlot]);
      setCurrentSlot('');
    }
  };

  const handleRemoveSlot = (slot: string) => {
    setSelectedSlots(selectedSlots.filter(s => s !== slot));
  };

  // Fonction pour vérifier les conflits de dates
  const checkDateConflicts = (dates: Date[]) => {
    const existingDates = existingAvailabilities.map(avail => avail.date);
    const conflicts = dates.filter(date => 
      existingDates.includes(format(date, 'yyyy-MM-dd'))
    );
    return conflicts;
  };

  const handleSubmit = async () => {
    if (!startDate || !endDate || selectedSlots.length === 0) {
      toast({
        title: "Erreur de saisie",
        description: "Veuillez sélectionner une plage de dates et au moins un créneau",
        variant: "destructive"
      });
      return;
    }

    if (!profile?.gm_id) {
      toast({
        title: "Erreur d'authentification",
        description: "Profil GM non trouvé. Veuillez vous reconnecter.",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);

    try {
      // Générer toutes les dates de la plage
      const dates = eachDayOfInterval({ start: startDate, end: endDate });
      
      // Vérifier les conflits
      const conflicts = checkDateConflicts(dates);
      
      let successCount = 0;
      let updateCount = 0;
      let errorCount = 0;
      const errorMessages: string[] = [];

      // Traiter chaque date avec gestion d'erreur individuelle
      for (const date of dates) {
        try {
          const result = await createAvailability.mutateAsync({
            gm_id: profile.gm_id,
            date: format(date, 'yyyy-MM-dd'),
            time_slots: selectedSlots
          });
          
          if (result.action === 'updated') {
            updateCount++;
          } else {
            successCount++;
          }
        } catch (error: any) {
          errorCount++;
          const dateStr = format(date, 'dd/MM/yyyy', { locale: fr });
          
          const friendly = formatAvailabilityError(error);
          errorMessages.push(`${dateStr}: ${friendly}`);
        }
      }

      // Toast de résumé selon les résultats
      if (successCount > 0 || updateCount > 0) {
        let description = '';
        if (successCount > 0) description += `${successCount} nouvelles disponibilités ajoutées`;
        if (updateCount > 0) {
          if (description) description += ', ';
          description += `${updateCount} disponibilités mises à jour`;
        }
        
        toast({
          title: "Opération réussie",
          description: description,
          variant: "default"
        });
      }

      if (errorCount > 0) {
        toast({
          title: `${errorCount} erreur(s) détectée(s)`,
          description: errorMessages.slice(0, 3).join(', ') + (errorMessages.length > 3 ? '...' : ''),
          variant: "destructive"
        });
      }

      // Si tout s'est bien passé, réinitialiser le formulaire
      if (errorCount === 0) {
        setStartDate(undefined);
        setEndDate(undefined);
        setSelectedSlots([]);
      }

    } catch (error: any) {
      console.error('Erreur globale lors de l\'ajout:', error);
      toast({
        title: "Erreur système",
        description: `Impossible de traiter la demande: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const getSlotLabel = (value: string) => {
    return timeSlots.find(slot => slot.value === value)?.label || value;
  };

  const getSlotColor = (value: string) => {
    return timeSlots.find(slot => slot.value === value)?.color || '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-blue-600" />
          Ajouter des Disponibilités
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="text-base font-medium mb-4 block">Période</Label>
          <DateRangeSelector
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
          />
        </div>

        <div className="space-y-4">
          <Label className="text-base font-medium">Créneaux horaires</Label>
          
          <div className="flex gap-2">
            <Select value={currentSlot} onValueChange={setCurrentSlot}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Sélectionner un créneau" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((slot) => (
                  <SelectItem 
                    key={slot.value} 
                    value={slot.value}
                    className={slot.color}
                  >
                    {slot.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddSlot} variant="outline" size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {selectedSlots.length > 0 && (
            <div className="space-y-2">
              <Label>Créneaux sélectionnés :</Label>
              <div className="flex flex-wrap gap-2">
                {selectedSlots.map((slot) => (
                  <Badge 
                    key={slot} 
                    variant="secondary" 
                    className={`${getSlotColor(slot)} flex items-center gap-1`}
                  >
                    {getSlotLabel(slot)}
                    <X 
                      className="w-3 h-3 cursor-pointer hover:text-red-600" 
                      onClick={() => handleRemoveSlot(slot)}
                    />
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Affichage des conflits potentiels */}
        {startDate && endDate && (
          (() => {
            const dates = eachDayOfInterval({ start: startDate, end: endDate });
            const conflicts = checkDateConflicts(dates);
            if (conflicts.length > 0) {
              return (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800 font-medium">
                    ⚠️ {conflicts.length} date(s) ont déjà des disponibilités :
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    {conflicts.slice(0, 3).map(d => format(d, 'dd/MM', { locale: fr })).join(', ')}
                    {conflicts.length > 3 ? '...' : ''}
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    Elles seront mises à jour avec les nouveaux créneaux.
                  </p>
                </div>
              );
            }
            return null;
          })()
        )}

        <Button 
          onClick={handleSubmit} 
          className="w-full"
          disabled={!startDate || !endDate || selectedSlots.length === 0 || processing}
        >
          {processing ? 'Traitement en cours...' : 'Ajouter les disponibilités'}
        </Button>
      </CardContent>
    </Card>
  );
};

export default GMAvailabilityForm;
