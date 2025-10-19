
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Edit, Trash2, AlertTriangle, Ban } from 'lucide-react';
import { GameMaster, useUpdateGameMaster, useDeleteGameMaster } from '@/hooks/useGameMasters';
import { useGMDependencies, useAdvancedGMDeletion } from '@/hooks/useAdvancedGMDeletion';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface GMPersonalInfoProps {
  selectedGM: GameMaster;
}

const GMPersonalInfo = ({ selectedGM }: GMPersonalInfoProps) => {
  const { toast } = useToast();
  const { isAdmin, profile } = useAuth();
  const updateGM = useUpdateGameMaster();
  const deleteGM = useDeleteGameMaster();
  const { data: dependencies, isLoading: loadingDeps } = useGMDependencies(selectedGM.id);
  const advancedDelete = useAdvancedGMDeletion();
  const [editingGM, setEditingGM] = useState<string>('');
  const [showTerminationForm, setShowTerminationForm] = useState<string>('');
  const [terminationData, setTerminationData] = useState({
    termination_date: '',
    termination_reason: ''
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAdvancedDelete, setShowAdvancedDelete] = useState(false);

  // Check if current profile has auto-creation disabled for this GM
  const isAutoCreateDisabled = profile?.gm_id === selectedGM.id && profile?.gm_auto_create_disabled;

  const handleUpdateGM = (field: string, value: any) => {
    console.log('Updating GM field:', field, 'with value:', value);
    
    updateGM.mutate({ id: selectedGM.id, [field]: value }, {
      onSuccess: () => {
        console.log('GM update successful');
        toast({
          title: "Mise à jour réussie",
          description: "Les informations du GM ont été mises à jour",
        });
        setEditingGM('');
      },
      onError: (error) => {
        console.error('Error updating GM:', error);
        toast({
          title: "Erreur",
          description: "Impossible de mettre à jour le GM",
          variant: "destructive"
        });
      }
    });
  };

  const handleStatusChange = () => {
    console.log('Current GM status:', selectedGM.is_active);
    
    if (selectedGM.is_active) {
      setShowTerminationForm(selectedGM.id);
    } else {
      console.log('Reactivating GM...');
      const updateData = { 
        id: selectedGM.id, 
        is_active: true,
        termination_date: null,
        termination_reason: null
      };
      
      console.log('Reactivation data:', updateData);
      
      updateGM.mutate(updateData, {
        onSuccess: (result) => {
          console.log('GM reactivation successful:', result);
          toast({
            title: "GM réactivé",
            description: "Le GM est maintenant actif",
          });
        },
        onError: (error) => {
          console.error('Error reactivating GM:', error);
          toast({
            title: "Erreur",
            description: "Impossible de réactiver le GM",
            variant: "destructive"
          });
        }
      });
    }
  };

  const handleTermination = () => {
    if (!terminationData.termination_date || !terminationData.termination_reason) {
      toast({
        title: "Erreur",
        description: "Veuillez renseigner la date de sortie et le motif",
        variant: "destructive"
      });
      return;
    }

    console.log('Terminating GM with data:', terminationData);
    
    const updateData = { 
      id: selectedGM.id, 
      is_active: false,
      termination_date: terminationData.termination_date,
      termination_reason: terminationData.termination_reason
    };
    
    console.log('Termination update data:', updateData);

    updateGM.mutate(updateData, {
      onSuccess: (result) => {
        console.log('GM termination successful:', result);
        toast({
          title: "GM désactivé",
          description: "Le GM a été marqué comme inactif",
        });
        setShowTerminationForm('');
        setTerminationData({ termination_date: '', termination_reason: '' });
      },
      onError: (error) => {
        console.error('Error terminating GM:', error);
        toast({
          title: "Erreur",
          description: "Impossible de désactiver le GM",
          variant: "destructive"
        });
      }
    });
  };

  const handleDeleteGM = () => {
    // Check if advanced deletion is needed
    if (dependencies && (dependencies.notifications > 0 || dependencies.documents > 0 || 
        dependencies.competencies > 0 || dependencies.availabilities > 0 || dependencies.profiles > 0)) {
      if (dependencies.activities > 0) {
        toast({
          title: "Suppression impossible",
          description: `Ce GM a encore ${dependencies.activities} activité(s) assignée(s). Veuillez d'abord les réassigner ou les supprimer.`,
          variant: "destructive"
        });
        return;
      }
      setShowAdvancedDelete(true);
      setShowDeleteConfirm(false);
      return;
    }

    // Simple deletion if no dependencies
    deleteGM.mutate(selectedGM.id, {
      onSuccess: () => {
        toast({
          title: "GM supprimé",
          description: "Le GM a été supprimé définitivement",
        });
        setShowDeleteConfirm(false);
      },
      onError: (error) => {
        console.error('Error deleting GM:', error);
        toast({
          title: "Erreur",
          description: "Impossible de supprimer le GM. Vérifiez qu'il n'a pas de données liées.",
          variant: "destructive"
        });
      }
    });
  };

  const handleAdvancedDelete = () => {
    advancedDelete.mutate(selectedGM.id, {
      onSuccess: (data) => {
        toast({
          title: "GM supprimé",
          description: `GM supprimé avec ${Object.values(data.deletedItems).reduce((a: number, b: number) => a + b, 0)} éléments liés nettoyés`,
        });
        setShowAdvancedDelete(false);
      },
      onError: (error) => {
        console.error('Error in advanced deletion:', error);
        let errorMessage = "Une erreur est survenue lors de la suppression";
        
        console.error('🔍 Advanced deletion error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
        
        if (error.message?.includes('Failed to send a request') || error.message?.includes('FunctionsRelayError')) {
          errorMessage = "Fonction indisponible (404). Veuillez réessayer dans quelques instants.";
        } else if (error.message?.includes('Authorization required')) {
          errorMessage = "Authentification requise. Veuillez vous reconnecter.";
        } else if (error.message?.includes('Admin access required')) {
          errorMessage = "Accès administrateur requis pour cette action.";
        } else if (error.message?.includes('assigned activities')) {
          errorMessage = "Impossible de supprimer un GM avec des activités assignées.";
        } else if (error.message?.includes('NetworkError') || error.message?.includes('fetch')) {
          errorMessage = "Erreur de connexion au serveur. Vérifiez votre connexion.";
        }
        
        toast({
          title: "Erreur lors de la suppression avancée",
          description: errorMessage,
          variant: "destructive"
        });
      }
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              Informations personnelles
              {isAutoCreateDisabled && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Ban className="w-3 h-3" />
                  Auto-création GM désactivée
                </Badge>
              )}
            </div>
            {isAdmin && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingGM(editingGM === selectedGM.id ? '' : selectedGM.id)}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  {editingGM === selectedGM.id ? 'Annuler' : 'Modifier'}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Supprimer
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Prénom</Label>
            {editingGM === selectedGM.id && isAdmin ? (
              <Input
                defaultValue={selectedGM.first_name || ''}
                onBlur={(e) => handleUpdateGM('first_name', e.target.value)}
              />
            ) : (
              <p className="text-sm text-gray-600">{selectedGM.first_name || 'Non renseigné'}</p>
            )}
          </div>
          <div>
            <Label>Nom</Label>
            {editingGM === selectedGM.id && isAdmin ? (
              <Input
                defaultValue={selectedGM.last_name || ''}
                onBlur={(e) => handleUpdateGM('last_name', e.target.value)}
              />
            ) : (
              <p className="text-sm text-gray-600">{selectedGM.last_name || 'Non renseigné'}</p>
            )}
          </div>
          <div>
            <Label>Date de naissance</Label>
            {editingGM === selectedGM.id && isAdmin ? (
              <Input
                type="date"
                defaultValue={selectedGM.birth_date || ''}
                onBlur={(e) => handleUpdateGM('birth_date', e.target.value)}
              />
            ) : (
              <p className="text-sm text-gray-600">
                {selectedGM.birth_date 
                  ? new Date(selectedGM.birth_date).toLocaleDateString('fr-FR')
                  : 'Non renseigné'
                }
              </p>
            )}
          </div>
          <div>
            <Label>Numéro AVS</Label>
            {editingGM === selectedGM.id && isAdmin ? (
              <Input
                defaultValue={selectedGM.avs_number || ''}
                onBlur={(e) => handleUpdateGM('avs_number', e.target.value)}
              />
            ) : (
              <p className="text-sm text-gray-600">{selectedGM.avs_number || 'Non renseigné'}</p>
            )}
          </div>
          <div>
            <Label>Date d'entrée</Label>
            {editingGM === selectedGM.id && isAdmin ? (
              <Input
                type="date"
                defaultValue={selectedGM.hire_date || ''}
                onBlur={(e) => handleUpdateGM('hire_date', e.target.value)}
              />
            ) : (
              <p className="text-sm text-gray-600">
                {selectedGM.hire_date 
                  ? new Date(selectedGM.hire_date).toLocaleDateString('fr-FR')
                  : 'Non renseigné'
                }
              </p>
            )}
          </div>
          
          <div>
            <Label>Statut</Label>
            <div className="flex items-center gap-2">
              <Badge variant={selectedGM.is_active ? "default" : "secondary"}>
                {selectedGM.is_active ? "Actif" : "Inactif"}
              </Badge>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStatusChange}
                  disabled={updateGM.isPending}
                >
                  {updateGM.isPending ? 'Traitement...' : selectedGM.is_active ? 'Désactiver' : 'Réactiver'}
                </Button>
              )}
            </div>
          </div>

          <div>
            <Label>Téléphone</Label>
            {editingGM === selectedGM.id && isAdmin ? (
              <Input
                defaultValue={selectedGM.phone || ''}
                onBlur={(e) => handleUpdateGM('phone', e.target.value)}
              />
            ) : (
              <p className="text-sm text-gray-600">{selectedGM.phone || 'Non renseigné'}</p>
            )}
          </div>
          <div>
            <Label>Email</Label>
            {editingGM === selectedGM.id && isAdmin ? (
              <Input
                type="email"
                defaultValue={selectedGM.email || ''}
                onBlur={(e) => handleUpdateGM('email', e.target.value)}
              />
            ) : (
              <p className="text-sm text-gray-600">{selectedGM.email || 'Non renseigné'}</p>
            )}
          </div>
          <div>
            <Label>Adresse</Label>
            {editingGM === selectedGM.id && isAdmin ? (
              <Textarea
                defaultValue={selectedGM.address || ''}
                onBlur={(e) => handleUpdateGM('address', e.target.value)}
              />
            ) : (
              <p className="text-sm text-gray-600">{selectedGM.address || 'Non renseigné'}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedGM.is_active && selectedGM.termination_date && (
        <Card>
          <CardHeader>
            <CardTitle>Informations de sortie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Date de sortie</Label>
                <p className="text-sm text-gray-600">
                  {new Date(selectedGM.termination_date).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div>
                <Label>Motif de sortie</Label>
                <p className="text-sm text-gray-600">
                  {selectedGM.termination_reason === 'resignation' && 'Démission'}
                  {selectedGM.termination_reason === 'dismissal' && 'Licenciement'}
                  {selectedGM.termination_reason === 'end_contract' && 'Fin de contrat'}
                  {selectedGM.termination_reason === 'retirement' && 'Retraite'}
                  {selectedGM.termination_reason === 'other' && 'Autre'}
                  {!['resignation', 'dismissal', 'end_contract', 'retirement', 'other'].includes(selectedGM.termination_reason || '') && selectedGM.termination_reason}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {showTerminationForm === selectedGM.id && isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Désactivation du GM</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Date de sortie</Label>
              <Input
                type="date"
                value={terminationData.termination_date}
                onChange={(e) => setTerminationData({
                  ...terminationData,
                  termination_date: e.target.value
                })}
              />
            </div>
            <div>
              <Label>Motif de sortie</Label>
              <Select 
                value={terminationData.termination_reason} 
                onValueChange={(value) => setTerminationData({
                  ...terminationData,
                  termination_reason: value
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un motif" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="resignation">Démission</SelectItem>
                  <SelectItem value="dismissal">Licenciement</SelectItem>
                  <SelectItem value="end_contract">Fin de contrat</SelectItem>
                  <SelectItem value="retirement">Retraite</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleTermination}
                disabled={updateGM.isPending}
              >
                {updateGM.isPending ? 'Traitement...' : 'Confirmer la désactivation'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowTerminationForm('')}
              >
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le GM</AlertDialogTitle>
            <AlertDialogDescription>
              {loadingDeps ? (
                "Vérification des dépendances..."
              ) : dependencies && (dependencies.notifications > 0 || dependencies.documents > 0 || 
                  dependencies.competencies > 0 || dependencies.availabilities > 0 || dependencies.profiles > 0) ? (
                "Ce GM a des données liées qui seront également supprimées. Continuer ?"
              ) : (
                "Êtes-vous sûr de vouloir supprimer définitivement ce GM ? Cette action est irréversible."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteGM}
              className="bg-red-600 hover:bg-red-700"
              disabled={loadingDeps}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showAdvancedDelete} onOpenChange={setShowAdvancedDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Suppression avancée requise
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <p>Ce GM a des données liées qui seront supprimées :</p>
                {dependencies && (
                  <ul className="text-sm space-y-1 bg-orange-50 p-3 rounded">
                    {dependencies.notifications > 0 && <li>• {dependencies.notifications} notification(s)</li>}
                    {dependencies.documents > 0 && <li>• {dependencies.documents} document(s)</li>}
                    {dependencies.competencies > 0 && <li>• {dependencies.competencies} compétence(s)</li>}
                    {dependencies.availabilities > 0 && <li>• {dependencies.availabilities} disponibilité(s)</li>}
                    {dependencies.profiles > 0 && <li>• {dependencies.profiles} profil(s) utilisateur seront déliés</li>}
                  </ul>
                )}
                <p className="font-medium text-red-600">Cette action est irréversible !</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleAdvancedDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={advancedDelete.isPending}
            >
              {advancedDelete.isPending ? 'Suppression...' : 'Supprimer définitivement'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default GMPersonalInfo;
