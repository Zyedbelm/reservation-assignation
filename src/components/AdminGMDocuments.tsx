
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Folder } from 'lucide-react';
import { useGameMasters } from '@/hooks/useGameMasters';
import GMDocumentManager from './GMDocumentManager';

const AdminGMDocuments = () => {
  const { data: gameMasters = [] } = useGameMasters();
  const [selectedGMId, setSelectedGMId] = useState<string>('');

  // Fonction pour formater l'affichage du nom du GM
  const getGMDisplayName = (gameMaster: any) => {
    if (!gameMaster) return 'GM inconnu';
    
    // Si on a prénom et nom, les utiliser
    if (gameMaster.first_name && gameMaster.last_name) {
      return `${gameMaster.first_name} ${gameMaster.last_name}`;
    }
    
    // Si on a juste le prénom ou le nom, l'utiliser
    if (gameMaster.first_name) return gameMaster.first_name;
    if (gameMaster.last_name) return gameMaster.last_name;
    
    // Sinon utiliser le nom complet si disponible
    if (gameMaster.name && gameMaster.name !== gameMaster.email) {
      return gameMaster.name;
    }
    
    // En dernier recours, utiliser l'email tronqué
    if (gameMaster.email) {
      const emailPart = gameMaster.email.split('@')[0];
      return emailPart.length > 15 ? `${emailPart.substring(0, 15)}...` : emailPart;
    }
    
    return 'GM inconnu';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Folder className="w-5 h-5 text-blue-600" />
          Gestion des Documents GM
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Sélectionner un GM pour voir ses documents
          </label>
          <Select value={selectedGMId} onValueChange={setSelectedGMId}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir un GM..." />
            </SelectTrigger>
            <SelectContent>
              {gameMasters.map((gm) => (
                <SelectItem key={gm.id} value={gm.id}>
                  {getGMDisplayName(gm)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {selectedGMId && (
          <div className="mt-6">
            <GMDocumentManager gmId={selectedGMId} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminGMDocuments;
