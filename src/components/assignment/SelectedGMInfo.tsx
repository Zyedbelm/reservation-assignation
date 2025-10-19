
import { CheckCircle, AlertTriangle, Mail } from 'lucide-react';

interface SelectedGMInfoProps {
  selectedGM: any;
}

const SelectedGMInfo = ({ selectedGM }: SelectedGMInfoProps) => {
  if (!selectedGM) return null;

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
    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
      <h4 className="font-medium text-blue-900 flex items-center gap-2">
        <CheckCircle className="w-4 h-4" />
        GM Sélectionné
        <Mail className="w-4 h-4" />
      </h4>
      <div className="mt-2 space-y-1">
        <p className="text-sm font-medium text-blue-800">{getGMDisplayName(selectedGM)}</p>
        {selectedGM.email ? (
          <div className="flex items-center gap-2">
            <Mail className="w-3 h-3 text-green-600" />
            <p className="text-xs text-blue-600">{selectedGM.email}</p>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
              Email automatique ✓
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 text-orange-500" />
            <span className="text-xs text-orange-600">Aucun email configuré</span>
          </div>
        )}
        {selectedGM.specialties && selectedGM.specialties.length > 0 && (
          <div className="mt-2">
            <span className="text-xs text-blue-600">Spécialités: </span>
            <span className="text-xs text-blue-700 font-medium">
              {selectedGM.specialties.join(', ')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SelectedGMInfo;
