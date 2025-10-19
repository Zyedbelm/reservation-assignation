import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Award, Plus, Calendar, Trash2 } from 'lucide-react';
import { useGMCompetencies, useCreateGMCompetency, useDeleteGMCompetency } from '@/hooks/useGMCompetencies';
import { useGames } from '@/hooks/useGames';
import { useToast } from '@/hooks/use-toast';

interface GMCompetenciesProps {
  gmId: string;
}

const GMCompetencies = ({ gmId }: GMCompetenciesProps) => {
  const { toast } = useToast();
  const { data: competencies = [] } = useGMCompetencies(gmId);
  const { data: games = [] } = useGames();
  const createCompetency = useCreateGMCompetency();
  const deleteCompetency = useDeleteGMCompetency();
  
  const [newCompetency, setNewCompetency] = useState({
    game_id: '',
    competency_level: 1,
    training_date: '',
    notes: ''
  });

  const handleCreateCompetency = () => {
    if (!gmId || !newCompetency.game_id) return;
    
    createCompetency.mutate({
      gm_id: gmId,
      ...newCompetency,
      training_date: newCompetency.training_date || undefined
    }, {
      onSuccess: () => {
        toast({
          title: "Compétence ajoutée",
          description: "La compétence a été ajoutée avec succès",
        });
        setNewCompetency({ game_id: '', competency_level: 1, training_date: '', notes: '' });
      }
    });
  };

  const handleDeleteCompetency = (competencyId: string, gameName: string) => {
    deleteCompetency.mutate(competencyId, {
      onSuccess: () => {
        toast({
          title: "Compétence supprimée",
          description: `La compétence pour ${gameName} a été supprimée`,
        });
      },
      onError: () => {
        toast({
          title: "Erreur",
          description: "Impossible de supprimer la compétence",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5" />
            Ajouter une compétence
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Jeu</Label>
            <Select value={newCompetency.game_id} onValueChange={(value) => 
              setNewCompetency({...newCompetency, game_id: value})
            }>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un jeu" />
              </SelectTrigger>
              <SelectContent>
                {games.map((game) => (
                  <SelectItem key={game.id} value={game.id}>
                    {game.name} ({game.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Niveau de compétence (1-6)</Label>
            <Select value={newCompetency.competency_level.toString()} onValueChange={(value) => 
              setNewCompetency({...newCompetency, competency_level: parseInt(value)})
            }>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6].map((level) => (
                  <SelectItem key={level} value={level.toString()}>
                    Niveau {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Date de formation</Label>
            <Input
              type="date"
              value={newCompetency.training_date}
              onChange={(e) => setNewCompetency({...newCompetency, training_date: e.target.value})}
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Input
              value={newCompetency.notes}
              onChange={(e) => setNewCompetency({...newCompetency, notes: e.target.value})}
              placeholder="Notes"
            />
          </div>
          <div className="md:col-span-2">
            <Button onClick={handleCreateCompetency} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter la compétence
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compétences existantes</CardTitle>
        </CardHeader>
        <CardContent>
          {competencies.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Aucune compétence enregistrée</p>
          ) : (
            <div className="space-y-2">
              {competencies.map((comp) => (
                <div key={comp.id} className="flex justify-between items-center p-3 border rounded">
                  <div>
                    <p className="font-medium">{comp.games?.name}</p>
                    <p className="text-sm text-gray-500">
                      {comp.games?.category} - Niveau {comp.competency_level}/6
                      {comp.training_date && (
                        <span className="ml-2">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {new Date(comp.training_date).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={comp.competency_level >= 4 ? "default" : "secondary"}
                    >
                      {comp.competency_level >= 5 ? "Expert" : 
                       comp.competency_level >= 4 ? "Confirmé" : 
                       comp.competency_level >= 2 ? "Intermédiaire" : "Débutant"}
                    </Badge>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Supprimer la compétence</AlertDialogTitle>
                          <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer la compétence "{comp.games?.name}" ? 
                            Cette action est irréversible.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuler</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteCompetency(comp.id, comp.games?.name || 'ce jeu')}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Supprimer
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GMCompetencies;
