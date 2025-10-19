import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useGameMasters } from '@/hooks/useGameMasters';
import { useCreateActivity } from '@/hooks/useActivities';
import { toast } from '@/hooks/use-toast';
import { formatGMName } from '@/utils/gmNameFormatter';

const AddActivitySlotDialog = () => {
  const [open, setOpen] = useState(false);
  const [selectedGM, setSelectedGM] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [activityType, setActivityType] = useState<'gaming' | 'formation' | 'maintenance' | 'admin' | 'travaux_informatiques' | 'menage'>('menage');
  const [title, setTitle] = useState('Créneau Ménage'); // Auto-généré
  const [description, setDescription] = useState('');

  const { data: gameMasters = [] } = useGameMasters();
  const createActivity = useCreateActivity();

  // Activity type labels and default durations in minutes
  const activityTypes = {
    gaming: { label: 'Gaming', defaultDuration: 120 },
    formation: { label: 'Formation', defaultDuration: 60 },
    maintenance: { label: 'Maintenance', defaultDuration: 60 },
    admin: { label: 'Administratif', defaultDuration: 60 },
    travaux_informatiques: { label: 'Travaux informatiques', defaultDuration: 60 },
    menage: { label: 'Ménage', defaultDuration: 25 }
  };

  // Calculate end time based on activity type when start time or activity type changes
  const updateEndTime = (start: string, type: string) => {
    if (!start) return '';
    
    const startDate = new Date(`1970-01-01T${start}:00`);
    const duration = activityTypes[type as keyof typeof activityTypes]?.defaultDuration || 60;
    const endDate = new Date(startDate.getTime() + duration * 60000);
    
    return endDate.toTimeString().slice(0, 5);
  };

  const handleStartTimeChange = (time: string) => {
    setStartTime(time);
    const calculatedEndTime = updateEndTime(time, activityType);
    setEndTime(calculatedEndTime);
  };

  const handleActivityTypeChange = (type: any) => {
    setActivityType(type);
    if (startTime) {
      const calculatedEndTime = updateEndTime(startTime, type);
      setEndTime(calculatedEndTime);
    }
    
    // Auto-generate title based on activity type
    const typeLabel = activityTypes[type as keyof typeof activityTypes]?.label || type;
    setTitle(`Créneau ${typeLabel}`);
  };

  const calculateDuration = (start: string, end: string): number => {
    if (!start || !end) return 0;
    
    const startDate = new Date(`1970-01-01T${start}:00`);
    const endDate = new Date(`1970-01-01T${end}:00`);
    
    return Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedGM || !selectedDate || !startTime || !endTime) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    if (startTime >= endTime) {
      toast({
        title: "Erreur",
        description: "L'heure de fin doit être après l'heure de début",
        variant: "destructive"
      });
      return;
    }

    const duration = calculateDuration(startTime, endTime);

    try {
      const newActivity = await createActivity.mutateAsync({
        title: title, // Titre auto-généré
        description: description.trim() || undefined,
        date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: startTime,
        end_time: endTime,
        duration,
        activity_type: activityType,
        assigned_gm_id: selectedGM,
        is_assigned: true,
        status: 'assigned', // Statut cohérent avec is_assigned
        required_skills: [],
        event_source: 'admin'
      });

      console.log('✅ [ADD-SLOT] Créneau créé:', {
        id: newActivity?.id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: `${startTime}-${endTime}`,
        gm: selectedGM,
        status: 'assigned'
      });

      const selectedGMData = gameMasters.find(gm => gm.id === selectedGM);

      // Envoyer notification au GM assigné
      if (selectedGMData?.email && newActivity) {
        try {
          const { supabase } = await import('@/integrations/supabase/client');
          await supabase.functions.invoke('create-gm-notification', {
            body: {
              gmId: selectedGM,
              notificationType: 'assignment',
              title: `Nouveau créneau assigné: ${title}`,
              message: `Vous avez été assigné(e) à un nouveau créneau "${title}" le ${format(selectedDate, 'dd/MM/yyyy', { locale: fr })} de ${startTime} à ${endTime}.`,
              eventData: {
                id: newActivity.id,
                title,
                date: format(selectedDate, 'yyyy-MM-dd'),
                start_time: startTime,
                end_time: endTime,
                activity_type: activityType,
                description: description.trim() || null
              },
              eventId: newActivity.id
            }
          });
        } catch (notificationError) {
          console.error('Erreur lors de l\'envoi de la notification:', notificationError);
        }
      }

      toast({
        title: "Créneau ajouté",
        description: `Créneau créé avec succès pour ${formatGMName(selectedGMData || {})}. Notification envoyée.`
      });

      // Reset form
      setSelectedGM('');
      setSelectedDate(undefined);
      setStartTime('');
      setEndTime('');
      setActivityType('menage');
      setTitle('Créneau Ménage');
      setDescription('');
      setOpen(false);

    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le créneau",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Ajouter un créneau
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ajouter un créneau d'activité</DialogTitle>
          <DialogDescription>
            Créez un nouveau créneau d'activité et assignez-le à un GM
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gm">Game Master *</Label>
            <Select value={selectedGM} onValueChange={setSelectedGM}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un GM" />
              </SelectTrigger>
              <SelectContent>
                {gameMasters.filter(gm => gm.is_active).map((gm) => (
                  <SelectItem key={gm.id} value={gm.id}>
                    {formatGMName(gm)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: fr }) : "Sélectionner une date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  locale={fr}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Heure de début *</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">Heure de fin *</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type d'activité *</Label>
            <Select value={activityType} onValueChange={handleActivityTypeChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(activityTypes).map(([value, { label, defaultDuration }]) => (
                  <SelectItem key={value} value={value}>
                    {label} ({defaultDuration}min par défaut)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnel)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description détaillée..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" disabled={createActivity.isPending} className="flex-1">
              {createActivity.isPending ? 'Création...' : 'Créer le créneau'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddActivitySlotDialog;