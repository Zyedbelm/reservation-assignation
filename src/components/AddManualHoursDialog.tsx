
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
import { useAddManualHours } from '@/hooks/useMonthlyReports';
import { toast } from '@/hooks/use-toast';
import { formatGMName } from '@/utils/gmNameFormatter';

interface AddManualHoursDialogProps {
  selectedMonthYear?: string;
}

const AddManualHoursDialog = ({ selectedMonthYear }: AddManualHoursDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedGM, setSelectedGM] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [hours, setHours] = useState('');
  const [activityType, setActivityType] = useState<'gaming' | 'formation' | 'maintenance' | 'admin' | 'travaux_informatiques'>('gaming');
  const [description, setDescription] = useState('');

  const { data: gameMasters = [] } = useGameMasters();
  const addManualHours = useAddManualHours();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedGM || !selectedDate || !hours) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez entrer un nombre d'heures valide",
        variant: "destructive"
      });
      return;
    }

    try {
      const monthYear = format(selectedDate, 'yyyy-MM');
      
      await addManualHours.mutateAsync({
        gm_id: selectedGM,
        month_year: monthYear,
        hours: hoursNum,
        activity_type: activityType,
        description: description || `Ajout manuel - ${activityType} - ${format(selectedDate, 'dd/MM/yyyy', { locale: fr })}`
      });

      toast({
        title: "Heures ajoutées",
        description: `${hoursNum}h ajoutées avec succès pour ${formatGMName(gameMasters.find(gm => gm.id === selectedGM) || {})}`
      });

      // Reset form
      setSelectedGM('');
      setSelectedDate(undefined);
      setHours('');
      setActivityType('gaming');
      setDescription('');
      setOpen(false);

    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter les heures",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Ajouter des heures manuellement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ajouter des heures manuellement</DialogTitle>
          <DialogDescription>
            Ajoutez des heures de travail pour un GM à une date spécifique
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
            <Label>Date de travail *</Label>
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
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hours">Nombre d'heures *</Label>
            <Input
              id="hours"
              type="number"
              step="0.5"
              min="0"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="Ex: 2.5"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type d'activité *</Label>
            <Select value={activityType} onValueChange={(value: any) => setActivityType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gaming">Gaming</SelectItem>
                <SelectItem value="formation">Formation</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="admin">Administratif</SelectItem>
                <SelectItem value="travaux_informatiques">Travaux informatiques</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optionnel)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description de l'activité..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" disabled={addManualHours.isPending} className="flex-1">
              {addManualHours.isPending ? 'Ajout...' : 'Ajouter'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddManualHoursDialog;
