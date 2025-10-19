
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertTriangle, Calendar, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const GoogleCalendarDiagnostic = () => {
  const { toast } = useToast();
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostic = async () => {
    setIsRunning(true);
    console.log('Starting Google Calendar diagnostic...');
    
    try {
      const { data, error } = await supabase.functions.invoke('test-google-calendar');
      
      if (error) {
        console.error('Diagnostic function error:', error);
        throw error;
      }
      
      console.log('Diagnostic result:', data);
      setDiagnosticResults(data);
      
      if (data.success) {
        toast({
          title: "Diagnostic terminé",
          description: "Le diagnostic Google Calendar a été exécuté avec succès",
        });
      } else {
        toast({
          title: "Problèmes détectés",
          description: data.error || "Des problèmes ont été identifiés",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error running diagnostic:', error);
      setDiagnosticResults({
        success: false,
        error: 'Impossible d\'exécuter le diagnostic',
        details: { error: error.message }
      });
      toast({
        title: "Erreur",
        description: "Impossible d'exécuter le diagnostic",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Settings className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'success':
        return 'default';
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Diagnostic Google Calendar
        </CardTitle>
        <CardDescription>
          Vérification de la configuration et des permissions Google Calendar API
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDiagnostic}
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? 'Diagnostic en cours...' : 'Lancer le diagnostic'}
        </Button>

        {diagnosticResults && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Statut général</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(diagnosticResults.status)}
                    <Badge variant={getStatusVariant(diagnosticResults.status)}>
                      {diagnosticResults.status?.toUpperCase() || 'INCONNU'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {diagnosticResults.checks && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Vérifications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(diagnosticResults.checks).map(([key, check]: [string, any]) => (
                        <div key={key} className="flex items-center gap-2">
                          {getStatusIcon(check.status)}
                          <span className="text-sm">{check.name}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {diagnosticResults.error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Erreur:</strong> {diagnosticResults.error}
                </AlertDescription>
              </Alert>
            )}

            {diagnosticResults.recommendations && diagnosticResults.recommendations.length > 0 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Recommandations:</strong>
                  <ul className="mt-2 list-disc list-inside">
                    {diagnosticResults.recommendations.map((rec: string, index: number) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {diagnosticResults.details && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Détails techniques</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-40">
                    {JSON.stringify(diagnosticResults.details, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoogleCalendarDiagnostic;
