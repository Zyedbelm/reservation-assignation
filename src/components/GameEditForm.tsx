
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Save, X } from 'lucide-react';
import { Game } from '@/hooks/useGames';

interface GameEditFormProps {
  game: Game;
  onSave: (gameData: Partial<Game>) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const GameEditForm: React.FC<GameEditFormProps> = ({ game, onSave, onCancel, isLoading }) => {
  const [formData, setFormData] = useState({
    name: game.name,
    category: game.category || '',
    description: game.description || '',
    location: game.location || '',
    average_duration: game.average_duration || 30,
    minimum_break_minutes: game.minimum_break_minutes || 30,
    is_active: game.is_active !== false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Modifier le jeu</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Nom du jeu *</Label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Nom du jeu VR"
                required
              />
            </div>
            <div>
              <Label>Catégorie</Label>
              <Input
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                placeholder="Action, Horror, Simulation..."
              />
            </div>
            <div>
              <Label>Emplacement</Label>
              <Input
                value={formData.location}
                onChange={(e) => handleChange('location', e.target.value)}
                placeholder="Salle VR 1, Salle VR 2..."
              />
            </div>
            <div>
              <Label>Durée moyenne (minutes)</Label>
              <Input
                type="number"
                value={formData.average_duration}
                onChange={(e) => handleChange('average_duration', parseInt(e.target.value) || 30)}
                min="1"
              />
            </div>
            <div>
              <Label>Délai minimum entre assignations (minutes)</Label>
              <Input
                type="number"
                value={formData.minimum_break_minutes}
                onChange={(e) => handleChange('minimum_break_minutes', parseInt(e.target.value) || 30)}
                min="0"
                placeholder="30"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => handleChange('is_active', checked)}
              />
              <Label>Jeu actif</Label>
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Description du jeu VR"
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Annuler
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default GameEditForm;
