
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useActivities } from '@/hooks/useActivities';
import { useAuth } from '@/hooks/useAuth';
import { useGameMasters } from '@/hooks/useGameMasters';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const GMEventsDiagnostic = () => {
  const { profile } = useAuth();
  const { data: activities = [] } = useActivities();
  const { data: gameMasters = [] } = useGameMasters();

  const gmId = profile?.gm_id;
  const currentGM = gameMasters.find(gm => gm.id === gmId);

  // Analyse détaillée des événements
  const eventAnalysis = activities.map(activity => {
    const isAssignedToMe = activity.assigned_gm_id === gmId;
    const assignedGM = gameMasters.find(gm => gm.id === activity.assigned_gm_id);
    
    return {
      ...activity,
      isAssignedToMe,
      assignedGMName: assignedGM?.name || 'Non assigné'
    };
  });

  const myEvents = eventAnalysis.filter(e => e.isAssignedToMe);
  const otherEvents = eventAnalysis.filter(e => !e.isAssignedToMe);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          Diagnostic des Événements GM
        </CardTitle>
        <CardDescription>
          Analyse complète de l'assignation des événements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Informations du profil */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                Informations du Profil
              </h3>
              <div className="text-sm space-y-1">
                <p><strong>Profile ID:</strong> {profile?.id || 'MANQUANT'}</p>
                <p><strong>GM ID:</strong> {gmId || 'MANQUANT'}</p>
                <p><strong>Email:</strong> {profile?.email || 'MANQUANT'}</p>
                <p><strong>Rôle:</strong> {profile?.role || 'MANQUANT'}</p>
                <p><strong>GM Nom:</strong> {currentGM?.name || 'MANQUANT'}</p>
              </div>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Statistiques Événements
              </h3>
              <div className="text-sm space-y-1">
                <p><strong>Total événements:</strong> {activities.length}</p>
                <p><strong>Mes événements:</strong> {myEvents.length}</p>
                <p><strong>Autres événements:</strong> {otherEvents.length}</p>
                <p><strong>Non assignés:</strong> {otherEvents.filter(e => !e.assigned_gm_id).length}</p>
              </div>
            </div>
          </div>

          {/* Mes événements */}
          {myEvents.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Mes Événements ({myEvents.length})
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {myEvents.map(event => (
                  <div key={event.id} className="flex items-center justify-between p-2 bg-green-50 rounded border">
                    <div>
                      <span className="font-medium">{event.title}</span>
                      <span className="text-sm text-gray-600 ml-2">
                        {new Date(event.date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <Badge variant="outline" className="bg-green-100 text-green-800">
                      Assigné à moi
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Événements d'autres GMs */}
          {otherEvents.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-600" />
                Autres Événements ({otherEvents.length})
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {otherEvents.slice(0, 10).map(event => (
                  <div key={event.id} className="flex items-center justify-between p-2 bg-red-50 rounded border">
                    <div>
                      <span className="font-medium">{event.title}</span>
                      <span className="text-sm text-gray-600 ml-2">
                        {new Date(event.date).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <Badge variant="outline" className="bg-red-100 text-red-800">
                      Assigné à: {event.assignedGMName}
                    </Badge>
                  </div>
                ))}
                {otherEvents.length > 10 && (
                  <p className="text-sm text-gray-500 text-center">
                    ... et {otherEvents.length - 10} autres événements
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Problèmes identifiés */}
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              Diagnostic des Problèmes
            </h3>
            <div className="text-sm space-y-1">
              {!gmId && (
                <p className="text-red-600">❌ GM ID manquant dans le profil</p>
              )}
              {activities.length === 0 && (
                <p className="text-red-600">❌ Aucune activité dans la base de données</p>
              )}
              {myEvents.length === 0 && activities.length > 0 && gmId && (
                <p className="text-red-600">❌ Aucun événement assigné à ce GM</p>
              )}
              {myEvents.length > 0 && (
                <p className="text-green-600">✅ {myEvents.length} événement(s) correctement assigné(s)</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GMEventsDiagnostic;
