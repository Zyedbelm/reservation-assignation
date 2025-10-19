import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useGameMasters } from '@/hooks/useGameMasters';
import { useToast } from '@/hooks/use-toast';
import { diagnoseAvailabilityIssues, type AvailabilityDiagnostic } from '@/utils/availabilityErrorHandler';

const GMAvailabilityDiagnostic = () => {
  const { data: gameMasters = [], isLoading } = useGameMasters();
  const { toast } = useToast();
  const [selectedGM, setSelectedGM] = useState<string>('');
  const [diagnostic, setDiagnostic] = useState<AvailabilityDiagnostic | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostic = async () => {
    if (!selectedGM) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un GM",
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    try {
      const result = await diagnoseAvailabilityIssues(selectedGM);
      setDiagnostic(result);
      
      if (result.errors.length === 0) {
        toast({
          title: "Diagnostic réussi",
          description: "Aucun problème détecté",
          variant: "default"
        });
      } else {
        toast({
          title: "Problèmes détectés",
          description: `${result.errors.length} erreur(s) trouvée(s)`,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Erreur de diagnostic",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: boolean, hasErrors: boolean = false) => {
    if (hasErrors) return <XCircle className="w-4 h-4 text-red-500" />;
    return status ? 
      <CheckCircle className="w-4 h-4 text-green-500" /> : 
      <XCircle className="w-4 h-4 text-red-500" />;
  };

  const getStatusBadge = (status: boolean, hasErrors: boolean = false) => {
    if (hasErrors) return <Badge variant="destructive">Erreur</Badge>;
    return status ? 
      <Badge variant="default" className="bg-green-100 text-green-800">OK</Badge> : 
      <Badge variant="destructive">KO</Badge>;
  };

  if (isLoading) {
    return <div className="p-4">Chargement des GMs...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          Diagnostic Disponibilités GM
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Sélectionner un GM</label>
            <Select value={selectedGM} onValueChange={setSelectedGM}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un GM à diagnostiquer" />
              </SelectTrigger>
              <SelectContent>
                {gameMasters.map((gm) => (
                  <SelectItem key={gm.id} value={gm.id}>
                    {gm.name} ({gm.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button 
            onClick={runDiagnostic} 
            disabled={!selectedGM || isRunning}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Diagnostic...' : 'Lancer le diagnostic'}
          </Button>
        </div>

        {diagnostic && (
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-lg">Résultats du diagnostic</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-white rounded border">
                <span className="font-medium">Profil GM valide</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(diagnostic.hasProfile)}
                  {getStatusBadge(diagnostic.hasProfile)}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-white rounded border">
                <span className="font-medium">Permissions RLS</span>
                <div className="flex items-center gap-2">
                  {getStatusIcon(diagnostic.hasPermissions)}
                  {getStatusBadge(diagnostic.hasPermissions)}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-white rounded border">
                <span className="font-medium">Disponibilités existantes</span>
                <Badge variant="secondary">
                  {diagnostic.existingAvailabilitiesCount} entrée(s)
                </Badge>
              </div>

              {diagnostic.lastAvailabilityDate && (
                <div className="flex items-center justify-between p-3 bg-white rounded border">
                  <span className="font-medium">Dernière disponibilité</span>
                  <Badge variant="outline">
                    {new Date(diagnostic.lastAvailabilityDate).toLocaleDateString('fr-FR')}
                  </Badge>
                </div>
              )}
            </div>

            {diagnostic.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-600">Erreurs détectées :</h4>
                <div className="space-y-1">
                  {diagnostic.errors.map((error, index) => (
                    <div key={index} className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {diagnostic.errors.length === 0 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-green-700 font-medium">✅ Aucun problème détecté</p>
                <p className="text-green-600 text-sm mt-1">
                  Ce GM peut ajouter et modifier ses disponibilités normalement.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GMAvailabilityDiagnostic;