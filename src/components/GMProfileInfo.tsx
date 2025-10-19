
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Save, Edit, X } from 'lucide-react';
import { useUpdateGameMaster } from '@/hooks/useGameMasters';
import { useToast } from '@/hooks/use-toast';

interface GameMaster {
  id: string;
  first_name?: string;
  last_name?: string;
  birth_date?: string;
  avs_number?: string;
  email?: string;
  hire_date?: string;
}

interface GMProfileInfoProps {
  currentGM: GameMaster;
}

const GMProfileInfo = ({ currentGM }: GMProfileInfoProps) => {
  const { toast } = useToast();
  const updateGM = useUpdateGameMaster();
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    birth_date: '',
    avs_number: ''
  });

  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (currentGM) {
      console.log('Setting form data from currentGM:', currentGM);
      setFormData({
        first_name: currentGM.first_name || '',
        last_name: currentGM.last_name || '',
        birth_date: currentGM.birth_date || '',
        avs_number: currentGM.avs_number || ''
      });
    }
  }, [currentGM]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('Submitting form with data:', formData);

    try {
      await updateGM.mutateAsync({ id: currentGM.id, ...formData });
      console.log('Profile updated successfully');
      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été mises à jour avec succès",
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating GM profile:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la mise à jour",
        variant: "destructive"
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    console.log('Input changed:', field, value);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCancel = () => {
    console.log('Cancelling edit, resetting form data');
    setIsEditing(false);
    if (currentGM) {
      setFormData({
        first_name: currentGM.first_name || '',
        last_name: currentGM.last_name || '',
        birth_date: currentGM.birth_date || '',
        avs_number: currentGM.avs_number || ''
      });
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('Edit button clicked, setting editing mode to true');
    setIsEditing(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-purple-600" />
          Mon Profil
        </CardTitle>
        <CardDescription>
          Gérez vos informations personnelles
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="first_name">Prénom</Label>
              {isEditing ? (
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  placeholder="Votre prénom"
                />
              ) : (
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                  {formData.first_name || 'Non renseigné'}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="last_name">Nom</Label>
              {isEditing ? (
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  placeholder="Votre nom"
                />
              ) : (
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                  {formData.last_name || 'Non renseigné'}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="birth_date">Date de naissance</Label>
              {isEditing ? (
                <Input
                  id="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => handleInputChange('birth_date', e.target.value)}
                />
              ) : (
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                  {formData.birth_date 
                    ? new Date(formData.birth_date).toLocaleDateString('fr-FR')
                    : 'Non renseigné'
                  }
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="avs_number">Numéro AVS</Label>
              {isEditing ? (
                <Input
                  id="avs_number"
                  value={formData.avs_number}
                  onChange={(e) => handleInputChange('avs_number', e.target.value)}
                  placeholder="756.XXXX.XXXX.XX"
                />
              ) : (
                <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                  {formData.avs_number || 'Non renseigné'}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button type="submit" disabled={updateGM.isPending}>
                  <Save className="w-4 h-4 mr-2" />
                  {updateGM.isPending ? 'Sauvegarde...' : 'Enregistrer'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  <X className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
              </>
            ) : (
              <Button type="button" onClick={handleEditClick}>
                <Edit className="w-4 h-4 mr-2" />
                Modifier
              </Button>
            )}
          </div>
        </form>

        <div className="mt-6 pt-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <Label className="text-gray-600">Email</Label>
              <p className="text-gray-900">{currentGM.email}</p>
            </div>
            <div>
              <Label className="text-gray-600">Date d'entrée</Label>
              <p className="text-gray-900">
                {currentGM.hire_date 
                  ? new Date(currentGM.hire_date).toLocaleDateString('fr-FR')
                  : 'Non renseigné'
                }
              </p>
              <p className="text-xs text-gray-500">Modifiable par l'admin uniquement</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GMProfileInfo;
