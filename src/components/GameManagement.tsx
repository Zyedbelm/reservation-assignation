import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { GamepadIcon, Plus, Edit, MapPin, Clock, Trash2, Link, Timer, ChevronDown, ChevronRight, User, Mail, Phone } from 'lucide-react';
import { useGames, useCreateGame, useUpdateGame, useDeleteGame } from '@/hooks/useGames';
import { useGMCompetencies } from '@/hooks/useGMCompetencies';
import { useGameMasters } from '@/hooks/useGameMasters';
import { useToast } from '@/hooks/use-toast';
import GameEditForm from './GameEditForm';
import EventGameMappings from './EventGameMappings';

const GameManagement = () => {
  const { toast } = useToast();
  const { data: games = [], isLoading, error: gamesError } = useGames();
  const createGame = useCreateGame();
  const updateGame = useUpdateGame();
  const deleteGame = useDeleteGame();

  // Debug logs pour diagnostiquer le problème des jeux invisibles
  console.log('🎮 GameManagement Debug:', {
    gamesCount: games.length,
    isLoading: isLoading,
    error: gamesError,
    activeGames: games.filter(g => g.is_active !== false).length,
    games: games
  });
  
  const [editingGameId, setEditingGameId] = useState<string>('');
  const [expandedGameId, setExpandedGameId] = useState<string>('');
  const [newGame, setNewGame] = useState({
    name: '',
    category: '',
    description: '',
    location: '',
    average_duration: 30,
    minimum_break_minutes: 30,
    is_active: true
  });

  const { data: competencies = [] } = useGMCompetencies();
  const { data: gameMasters = [] } = useGameMasters();

  const handleCreateGame = async () => {
    if (!newGame.name.trim()) {
      toast({
        title: "Erreur",
        description: "Le nom du jeu est requis",
        variant: "destructive"
      });
      return;
    }

    try {
      await createGame.mutateAsync(newGame);
      toast({
        title: "Jeu créé",
        description: "Le jeu a été créé avec succès",
      });
      setNewGame({
        name: '',
        category: '',
        description: '',
        location: '',
        average_duration: 30,
        minimum_break_minutes: 30,
        is_active: true
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de créer le jeu",
        variant: "destructive"
      });
    }
  };

  const handleEditGame = (gameId: string) => {
    console.log('Starting edit for game:', gameId);
    setEditingGameId(gameId);
  };

  const handleSaveEdit = async (gameData: any) => {
    try {
      console.log('Saving game edit:', { id: editingGameId, ...gameData });
      await updateGame.mutateAsync({ id: editingGameId, ...gameData });
      toast({
        title: "Jeu mis à jour",
        description: "Les modifications ont été sauvegardées",
      });
      setEditingGameId('');
    } catch (error) {
      console.error('Error updating game:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le jeu",
        variant: "destructive"
      });
    }
  };

  const handleCancelEdit = () => {
    console.log('Cancelling edit');
    setEditingGameId('');
  };

  const handleDeleteGame = async (gameId: string, gameName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le jeu "${gameName}" ?`)) {
      return;
    }

    try {
      await deleteGame.mutateAsync(gameId);
      toast({
        title: "Jeu supprimé",
        description: "Le jeu a été supprimé avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le jeu",
        variant: "destructive"
      });
    }
  };

  const getGMsForGame = (gameId: string) => {
    const gameCompetencies = competencies.filter(comp => comp.game_id === gameId);
    return gameCompetencies.map(comp => {
      const gm = gameMasters.find(gm => gm.id === comp.gm_id);
      return {
        ...gm,
        competency_level: comp.competency_level,
        training_date: comp.training_date,
        notes: comp.notes
      };
    }).filter(gm => gm.id); // Filter out null GMs
  };

  const toggleGameExpansion = (gameId: string) => {
    setExpandedGameId(expandedGameId === gameId ? '' : gameId);
  };

  if (isLoading) {
    return <div className="text-center py-8">Chargement des jeux...</div>;
  }

  if (gamesError) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>Erreur lors du chargement des jeux:</p>
        <p className="text-sm">{gamesError.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GamepadIcon className="w-5 h-5 text-purple-600" />
            Gestion des Jeux VR
          </CardTitle>
          <CardDescription>
            Administrez les jeux, leurs emplacements et durées moyennes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="list" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="list">Liste des Jeux</TabsTrigger>
              <TabsTrigger value="add">Ajouter un Jeu</TabsTrigger>
              <TabsTrigger value="mappings">
                <Link className="w-4 h-4 mr-2" />
                Correspondances
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-4">
              <div className="mb-4 text-sm text-gray-600">
                Total: {games.length} jeux | Actifs: {games.filter(g => g.is_active !== false).length}
              </div>
              {games.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun jeu configuré</p>
              ) : (
                <div className="grid gap-4">
                  {games.map((game) => (
                    <div key={game.id} className="space-y-4">
                      {editingGameId === game.id ? (
                        <GameEditForm
                          game={game}
                          onSave={handleSaveEdit}
                          onCancel={handleCancelEdit}
                          isLoading={updateGame.isPending}
                        />
                      ) : (
                        <Collapsible 
                          open={expandedGameId === game.id} 
                          onOpenChange={() => toggleGameExpansion(game.id)}
                        >
                          <div className="p-4 border rounded-lg">
                            <CollapsibleTrigger asChild>
                              <div className="flex justify-between items-start mb-3 cursor-pointer hover:bg-blue-50 hover:border-blue-200 -m-2 p-2 rounded transition-colors">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded-md transition-colors">
                                      {expandedGameId === game.id ? (
                                        <ChevronDown className="w-5 h-5 text-blue-600" />
                                      ) : (
                                        <ChevronRight className="w-5 h-5 text-blue-600" />
                                      )}
                                      <span className="text-xs font-medium text-blue-700">
                                        {expandedGameId === game.id ? 'Masquer les GM' : 'Voir les GM'}
                                      </span>
                                    </div>
                                    <h3 className="font-medium text-lg">{game.name}</h3>
                                    <Badge variant={game.is_active !== false ? "default" : "secondary"}>
                                      {game.is_active !== false ? "Actif" : "Inactif"}
                                    </Badge>
                                  </div>
                                  {game.category && (
                                    <div className="flex gap-2 mt-1">
                                      <Badge variant="outline">{game.category}</Badge>
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditGame(game.id)}
                                  >
                                    <Edit className="w-4 h-4 mr-1" />
                                    Modifier
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleDeleteGame(game.id, game.name)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Supprimer
                                  </Button>
                                </div>
                              </div>
                            </CollapsibleTrigger>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-3">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-gray-500" />
                                <span className="text-sm">{game.location || 'Emplacement non défini'}</span>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-500" />
                                <span className="text-sm">{game.average_duration || 30} minutes</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <Timer className="w-4 h-4 text-gray-500" />
                                <span className="text-sm">Délai: {game.minimum_break_minutes || 30}min</span>
                              </div>

                              <div className="flex items-center gap-2">
                                <GamepadIcon className="w-4 h-4 text-gray-500" />
                                <span className="text-sm">{game.category || 'Catégorie non définie'}</span>
                              </div>
                            </div>

                            {game.description && (
                              <p className="text-gray-600 text-sm mt-2">{game.description}</p>
                            )}

                            <CollapsibleContent>
                              <div className="mt-4 pt-4 border-t">
                                <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                                  <User className="w-4 h-4" />
                                  Game Masters compétents pour ce jeu
                                </h4>
                                {(() => {
                                  const competentGMs = getGMsForGame(game.id);
                                  if (competentGMs.length === 0) {
                                    return (
                                      <p className="text-gray-500 text-sm italic">
                                        Aucun GM n'a déclaré de compétence pour ce jeu
                                      </p>
                                    );
                                  }
                                  return (
                                    <div className="grid gap-3">
                                      {competentGMs.map((gm) => (
                                        <div key={gm.id} className="p-3 bg-gray-50 rounded-lg border">
                                          <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-1">
                                                <h5 className="font-medium">
                                                  {gm.first_name && gm.last_name 
                                                    ? `${gm.first_name} ${gm.last_name}` 
                                                    : gm.name}
                                                </h5>
                                                <Badge variant="outline">
                                                  Niveau {gm.competency_level}/10
                                                </Badge>
                                              </div>
                                              <div className="space-y-1 text-sm text-gray-600">
                                                {gm.email && (
                                                  <div className="flex items-center gap-1">
                                                    <Mail className="w-3 h-3" />
                                                    {gm.email}
                                                  </div>
                                                )}
                                                {gm.phone && (
                                                  <div className="flex items-center gap-1">
                                                    <Phone className="w-3 h-3" />
                                                    {gm.phone}
                                                  </div>
                                                )}
                                                {gm.training_date && (
                                                  <div className="text-xs text-gray-500">
                                                    Formation: {new Date(gm.training_date).toLocaleDateString('fr-FR')}
                                                  </div>
                                                )}
                                                {gm.notes && (
                                                  <div className="text-xs text-gray-500 italic">
                                                    {gm.notes}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="add" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Nouveau Jeu VR</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Nom du jeu *</Label>
                      <Input
                        value={newGame.name}
                        onChange={(e) => setNewGame({...newGame, name: e.target.value})}
                        placeholder="Nom du jeu VR"
                      />
                    </div>
                    <div>
                      <Label>Catégorie</Label>
                      <Input
                        value={newGame.category}
                        onChange={(e) => setNewGame({...newGame, category: e.target.value})}
                        placeholder="Action, Horror, Simulation..."
                      />
                    </div>
                    <div>
                      <Label>Emplacement</Label>
                      <Input
                        value={newGame.location}
                        onChange={(e) => setNewGame({...newGame, location: e.target.value})}
                        placeholder="Salle VR 1, Salle VR 2..."
                      />
                    </div>
                    <div>
                      <Label>Durée moyenne (minutes)</Label>
                      <Input
                        type="number"
                        value={newGame.average_duration}
                        onChange={(e) => setNewGame({...newGame, average_duration: parseInt(e.target.value) || 30})}
                        placeholder="30"
                      />
                    </div>
                    <div>
                      <Label>Délai minimum entre assignations (minutes)</Label>
                      <Input
                        type="number"
                        value={newGame.minimum_break_minutes}
                        onChange={(e) => setNewGame({...newGame, minimum_break_minutes: parseInt(e.target.value) || 30})}
                        placeholder="30"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={newGame.description}
                      onChange={(e) => setNewGame({...newGame, description: e.target.value})}
                      placeholder="Description du jeu VR"
                    />
                  </div>
                  <Button 
                    onClick={handleCreateGame} 
                    className="w-full"
                    disabled={createGame.isPending}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {createGame.isPending ? 'Création...' : 'Créer le jeu'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="mappings">
              <EventGameMappings />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default GameManagement;
