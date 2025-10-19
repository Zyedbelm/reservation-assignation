
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users } from 'lucide-react';
import { useGameMasters } from '@/hooks/useGameMasters';
import GMPersonalInfo from './GMPersonalInfo';
import GMDocuments from './GMDocuments';
import GMCompetencies from './GMCompetencies';
import GMAvailabilitiesView from './GMAvailabilitiesView';
import GMAssignedGames from './GMAssignedGames';

const GMManagement = () => {
  const { data: gameMasters = [], isLoading: gmLoading, error: gmError } = useGameMasters();
  const [selectedGM, setSelectedGM] = useState<string>('');

  const selectedGMData = gameMasters.find(gm => gm.id === selectedGM);

  // Debug logs pour diagnostiquer le problème des listes vides
  console.log('📊 GMManagement Debug:', {
    gameMastersCount: gameMasters.length,
    isLoading: gmLoading,
    error: gmError,
    selectedGM,
    hasSelectedData: !!selectedGMData,
    gameMasters: gameMasters
  });

  if (gmLoading) {
    return <div className="text-center py-8">Chargement des Game Masters...</div>;
  }

  if (gmError) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>Erreur lors du chargement des Game Masters:</p>
        <p className="text-sm">{gmError.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Gestion RH des Game Masters
          </CardTitle>
          <CardDescription>
            Administration complète des informations personnelles et professionnelles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <Label htmlFor="gm-select">
                Sélectionner un GM ({gameMasters.length} disponibles)
              </Label>
              <Select disabled={gameMasters.length === 0} value={selectedGM} onValueChange={setSelectedGM}>
                <SelectTrigger>
                  <SelectValue placeholder={
                    gameMasters.length === 0 
                      ? "Aucun Game Master disponible" 
                      : "Choisir un Game Master"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {gameMasters.length === 0 ? (
                    <SelectItem value="no-results" disabled>
                      Aucun Game Master trouvé
                    </SelectItem>
                  ) : (
                    gameMasters.map((gm) => (
                      <SelectItem key={gm.id} value={gm.id}>
                        {(gm.first_name || gm.last_name ? `${gm.first_name ?? ''} ${gm.last_name ?? ''}`.trim() : gm.name)}{gm.email ? ` (${gm.email})` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedGMData && (
            <Tabs defaultValue="info" className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="info">Informations</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="competencies">Compétences</TabsTrigger>
                <TabsTrigger value="assigned-games">Jeux assignés</TabsTrigger>
                <TabsTrigger value="availabilities">Disponibilités</TabsTrigger>
              </TabsList>

              <TabsContent value="info">
                <GMPersonalInfo selectedGM={selectedGMData} />
              </TabsContent>

              <TabsContent value="documents">
                <GMDocuments gmId={selectedGM} />
              </TabsContent>

              <TabsContent value="competencies">
                <GMCompetencies gmId={selectedGM} />
              </TabsContent>

              <TabsContent value="availabilities">
                <GMAvailabilitiesView gmId={selectedGM} />
              </TabsContent>

              <TabsContent value="assigned-games">
                <GMAssignedGames gmId={selectedGM} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GMManagement;
