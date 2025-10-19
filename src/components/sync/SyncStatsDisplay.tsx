
import { Clock, TrendingUp, Zap } from 'lucide-react';

interface SyncStatsDisplayProps {
  syncPeriodMonths: number;
}

const SyncStatsDisplay = ({ syncPeriodMonths }: SyncStatsDisplayProps) => {
  return (
    <div className="space-y-4">
      {/* Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="text-sm text-gray-600">
            Période de synchronisation : {syncPeriodMonths} mois
          </div>
          <p className="text-xs text-gray-500">
            Récupérer les événements des {syncPeriodMonths} prochains mois
          </p>
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium">Nouvelles fonctionnalités v2.0</div>
          <div className="text-sm space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-green-600" />
              <span><strong>Sync différentielle :</strong> Ne traite que les changements</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-green-600" />
              <span><strong>Détection intelligente :</strong> Comparaison par ID et propriétés</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-green-600" />
              <span><strong>Gestion suppressions :</strong> Supprime les événements supprimés</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-orange-600" />
              <span><strong>Désassignation ciblée :</strong> Uniquement si créneau change</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3 h-3 text-purple-600" />
              <span><strong>Attribution conditionnelle :</strong> Seulement si changements</span>
            </div>
          </div>
        </div>
      </div>

      {/* Informations techniques v2.0 */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          🚀 Synchronisation intelligente v2.0
        </h4>
        <div className="text-sm text-blue-700 space-y-2">
          <div><strong>✅ Synchronisation différentielle :</strong> Compare chaque événement avec la base existante</div>
          <div><strong>✅ Détection précise des changements :</strong> Analyse titre, description, date, heure et durée</div>
          <div><strong>✅ Gestion des suppressions :</strong> Supprime automatiquement les événements supprimés du calendrier</div>
          <div><strong>✅ Désassignation ciblée :</strong> Désassigne les GM uniquement si le créneau horaire change</div>
          <div><strong>✅ Attribution conditionnelle :</strong> Lance l'auto-assignment seulement si des changements sont détectés</div>
          <div><strong>✅ Statistiques détaillées :</strong> Compteurs séparés pour créations, mises à jour, suppressions et événements inchangés</div>
          <div><strong>🆕 Performance optimisée :</strong> Évite les désassignations/réassignations inutiles</div>
          <div><strong>🆕 Logs enrichis :</strong> Suivi précis de chaque type de changement</div>
        </div>
      </div>

      {/* Bloc d'information sur la stabilité */}
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <h4 className="font-medium text-green-800 mb-2 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          🔒 Stabilité et performance
        </h4>
        <div className="text-sm text-green-700 space-y-1">
          <p><strong>Événements inchangés :</strong> Ne sont plus traités, conservent leur assignation GM</p>
          <p><strong>Nouveaux événements :</strong> Sont créés et automatiquement proposés pour attribution</p>
          <p><strong>Événements modifiés :</strong> Mis à jour, GM désassigné seulement si créneau change</p>
          <p><strong>Événements supprimés :</strong> Supprimés de la base, GM automatiquement libéré</p>
          <p><strong>Résultat :</strong> Système stable qui préserve les assignations et évite les perturbations inutiles</p>
        </div>
      </div>
    </div>
  );
};

export default SyncStatsDisplay;
