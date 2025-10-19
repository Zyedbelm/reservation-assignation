
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Link, Plus, Edit, Trash2, GamepadIcon } from 'lucide-react';
import { useEventGameMappings, useCreateEventGameMapping, useUpdateEventGameMapping, useDeleteEventGameMapping } from '@/hooks/useEventGameMappings';
import { useGames } from '@/hooks/useGames';
import { useToast } from '@/hooks/use-toast';

const EventGameMappings = () => {
  const { toast } = useToast();
  const { data: mappings = [], isLoading: mappingsLoading } = useEventGameMappings();
  const { data: games = [], isLoading: gamesLoading } = useGames();
  const createMapping = useCreateEventGameMapping();
  const updateMapping = useUpdateEventGameMapping();
  const deleteMapping = useDeleteEventGameMapping();
  
  const [editingMappingId, setEditingMappingId] = useState<string>('');
  const [editingData, setEditingData] = useState({ event_name_pattern: '', game_id: '' });
  const [newMapping, setNewMapping] = useState({
    event_name_pattern: '',
    game_id: '',
    is_active: true
  });

  const handleCreateMapping = async () => {
    if (!newMapping.event_name_pattern.trim() || !newMapping.game_id) {
      toast({
        title: "Erreur",
        description: "Le pattern et le jeu sont requis",
        variant: "destructive"
      });
      return;
    }

    try {
      await createMapping.mutateAsync(newMapping);
      toast({
        title: "Correspondance créée",
        description: "La correspondance a été créée avec succès",
      });
      setNewMapping({ event_name_pattern: '', game_id: '', is_active: true });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer la correspondance",
        variant: "destructive"
      });
    }
  };

  const handleEditMapping = (mapping: any) => {
    setEditingMappingId(mapping.id);
    setEditingData({
      event_name_pattern: mapping.event_name_pattern,
      game_id: mapping.game_id
    });
  };

  const handleSaveEdit = async () => {
    if (!editingData.event_name_pattern.trim() || !editingData.game_id) {
      toast({
        title: "Erreur",
        description: "Le pattern et le jeu sont requis",
        variant: "destructive"
      });
      return;
    }

    try {
      await updateMapping.mutateAsync({ id: editingMappingId, ...editingData });
      toast({
        title: "Correspondance mise à jour",
        description: "Les modifications ont été sauvegardées",
      });
      setEditingMappingId('');
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la correspondance",
        variant: "destructive"
      });
    }
  };

  const handleDeleteMapping = async (mappingId: string, pattern: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la correspondance "${pattern}" ?`)) {
      return;
    }

    try {
      await deleteMapping.mutateAsync(mappingId);
      toast({
        title: "Correspondance supprimée",
        description: "La correspondance a été supprimée avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la correspondance",
        variant: "destructive"
      });
    }
  };

  if (mappingsLoading || gamesLoading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="w-5 h-5 text-green-600" />
            Correspondance Jeux-Événements
          </CardTitle>
          <CardDescription>
            Mappez les noms d'événements aux jeux pour améliorer l'attribution automatique des GMs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="list" className="space-y-4">
            <TabsList>
              <TabsTrigger value="list">Liste des Correspondances</TabsTrigger>
              <TabsTrigger value="add">Ajouter une Correspondance</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-4">
              {mappings.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucune correspondance configurée</p>
              ) : (
                <div className="grid gap-4">
                  {mappings.map((mapping) => (
                    <div key={mapping.id} className="p-4 border rounded-lg">
                      {editingMappingId === mapping.id ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label>Pattern d'événement</Label>
                              <Input
                                value={editingData.event_name_pattern}
                                onChange={(e) => setEditingData({...editingData, event_name_pattern: e.target.value})}
                                placeholder="Mot clé à chercher dans les titres"
                              />
                            </div>
                            <div>
                              <Label>Jeu associé</Label>
                              <Select 
                                value={editingData.game_id} 
                                onValueChange={(value) => setEditingData({...editingData, game_id: value})}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner un jeu" />
                                </SelectTrigger>
                                <SelectContent>
                                  {games.map((game) => (
                                    <SelectItem key={game.id} value={game.id}>
                                      {game.name} {game.category && `(${game.category})`}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleSaveEdit} disabled={updateMapping.isPending}>
                              Sauvegarder
                            </Button>
                            <Button variant="outline" onClick={() => setEditingMappingId('')}>
                              Annuler
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="font-mono">
                                {mapping.event_name_pattern}
                              </Badge>
                              <span>→</span>
                              <Badge variant="default">
                                <GamepadIcon className="w-3 h-3 mr-1" />
                                {mapping.games?.name}
                              </Badge>
                              {mapping.games?.category && (
                                <Badge variant="secondary">{mapping.games.category}</Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              Les événements contenant "<strong>{mapping.event_name_pattern}</strong>" seront associés au jeu "<strong>{mapping.games?.name}</strong>"
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditMapping(mapping)}
                            >
                              <Edit className="w-4 h-4 mr-1" />
                              Modifier
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteMapping(mapping.id, mapping.event_name_pattern)}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Supprimer
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="add" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Nouvelle Correspondance</CardTitle>
                  <CardDescription>
                    Créez un lien entre un pattern de nom d'événement et un jeu spécifique
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Pattern d'événement *</Label>
                      <Input
                        value={newMapping.event_name_pattern}
                        onChange={(e) => setNewMapping({...newMapping, event_name_pattern: e.target.value})}
                        placeholder="ex: Half-Life, Beat Saber, VR..."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Mot clé ou phrase à chercher dans les titres d'événements (insensible à la casse)
                      </p>
                    </div>
                    <div>
                      <Label>Jeu associé *</Label>
                      <Select 
                        value={newMapping.game_id} 
                        onValueChange={(value) => setNewMapping({...newMapping, game_id: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un jeu" />
                        </SelectTrigger>
                        <SelectContent>
                          {games.map((game) => (
                            <SelectItem key={game.id} value={game.id}>
                              {game.name} {game.category && `(${game.category})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button 
                    onClick={handleCreateMapping} 
                    className="w-full"
                    disabled={createMapping.isPending}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {createMapping.isPending ? 'Création...' : 'Créer la correspondance'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default EventGameMappings;
