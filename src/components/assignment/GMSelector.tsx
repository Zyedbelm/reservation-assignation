
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Mail } from 'lucide-react';

interface GMSelectorProps {
  availableGMs: any[];
  selectedGMId: string;
  onGMSelect: (gmId: string) => void;
}

const GMSelector = ({ availableGMs, selectedGMId, onGMSelect }: GMSelectorProps) => {
  if (availableGMs.length === 0) return null;

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
    <div className="space-y-3">
      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <User className="w-4 h-4" />
        Sélectionner un Game Master disponible
        <Mail className="w-3 h-3 text-blue-500" />
      </label>
      <Select value={selectedGMId} onValueChange={onGMSelect}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Choisir un GM parmi les disponibles..." />
        </SelectTrigger>
        <SelectContent>
          {availableGMs.map((gm) => (
            <SelectItem key={gm.id} value={gm.id}>
              <div className="flex items-center gap-3 py-1">
                <User className="w-4 h-4 text-blue-500" />
                <div className="flex items-center gap-2">
                  <span className="font-medium">{getGMDisplayName(gm)}</span>
                  {gm.email && <Mail className="w-3 h-3 text-green-500" />}
                  {gm.specialties && gm.specialties.length > 0 && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({gm.specialties.slice(0, 2).join(', ')})
                    </span>
                  )}
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default GMSelector;
