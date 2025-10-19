
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { User, Save, RotateCcw, Calendar } from 'lucide-react';
import { useGMProfile } from '@/hooks/useGMProfile';

const GMProfileForm = () => {
  const { 
    formData, 
    setFormData, 
    updateGMProfile, 
    resetFormData, 
    isLoading, 
    dataLoaded 
  } = useGMProfile();

  const [hasChanges, setHasChanges] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await updateGMProfile(formData);
    if (success) {
      setHasChanges(false);
    }
  };

  const handleReset = () => {
    resetFormData();
    setHasChanges(false);
  };

  if (!dataLoaded) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Chargement du profil...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600" />
          Mon Profil
        </CardTitle>
        <CardDescription>
          Gérez vos informations personnelles et professionnelles
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations personnelles */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              Informations personnelles
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">Prénom *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  placeholder="Votre prénom"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="last_name">Nom *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  placeholder="Votre nom"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="votre.email@exemple.com"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+41 XX XXX XX XX"
                />
              </div>
              
              <div>
                <Label htmlFor="birth_date">Date de naissance</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => handleInputChange('birth_date', e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="address">Adresse complète</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Rue, numéro, code postal, ville"
              />
            </div>
          </div>

          <Separator />

          {/* Informations professionnelles */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Informations professionnelles
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="avs_number">Numéro AVS</Label>
                <Input
                  id="avs_number"
                  value={formData.avs_number}
                  onChange={(e) => handleInputChange('avs_number', e.target.value)}
                  placeholder="756.XXXX.XXXX.XX"
                />
              </div>
              
              <div>
                <Label htmlFor="hire_date">Date d'engagement</Label>
                <Input
                  id="hire_date"
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => handleInputChange('hire_date', e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isLoading || !hasChanges}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Annuler
            </Button>
            
            <Button
              type="submit"
              disabled={isLoading || !hasChanges}
            >
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default GMProfileForm;
