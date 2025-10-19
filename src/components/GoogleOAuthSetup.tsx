
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, CheckCircle, AlertTriangle, Key } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const GoogleOAuthSetup = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [config, setConfig] = useState<any>(null);

  const checkOAuthConfig = async () => {
    setIsLoading(true);
    
    try {
      console.log('Checking Google OAuth configuration...');
      
      const { data, error } = await supabase.functions.invoke('setup-google-oauth');

      if (error) {
        console.error('OAuth config error:', error);
        throw error;
      }

      console.log('OAuth config result:', data);
      setConfig(data);
      
      if (data.success) {
        toast({
          title: "Configuration OAuth validée",
          description: "Les identifiants Google OAuth sont correctement configurés",
        });
      } else {
        toast({
          title: "Configuration OAuth manquante",
          description: data.message || "Configurez les secrets GOOGLE_OAUTH_CLIENT_ID et GOOGLE_OAUTH_CLIENT_SECRET",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error checking OAuth config:', error);
      toast({
        title: "Erreur de vérification",
        description: "Impossible de vérifier la configuration OAuth",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!config) return null;
    
    if (config.success) {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Configuré
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Non configuré
        </Badge>
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          Configuration Google OAuth
        </CardTitle>
        <CardDescription>
          Gestion des identifiants OAuth pour l'authentification Google
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-3">
            <Key className="w-8 h-8 text-blue-600" />
            <div>
              <h3 className="font-medium">Google OAuth 2.0</h3>
              <p className="text-sm text-gray-600">Authentification sécurisée</p>
            </div>
          </div>
          {getStatusBadge()}
        </div>

        {config && (
          <div className="space-y-3">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Configuration détectée :</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Client ID :</span>
                  <span className={config.config?.hasClientId ? 'text-green-600' : 'text-red-600'}>
                    {config.config?.hasClientId ? '✓ Configuré' : '✗ Manquant'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Client Secret :</span>
                  <span className={config.config?.hasClientSecret ? 'text-green-600' : 'text-red-600'}>
                    {config.config?.hasClientSecret ? '✓ Configuré' : '✗ Manquant'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Redirect URI :</span>
                  <span className="text-blue-600 break-all">{config.config?.redirectUri}</span>
                </div>
              </div>
            </div>

            {!config.success && config.instructions && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-medium text-yellow-800 mb-2">Instructions de configuration :</h4>
                <div className="text-sm text-yellow-700 space-y-2">
                  <p><strong>1. Client ID à configurer :</strong></p>
                  <code className="block bg-white p-2 rounded text-xs break-all">
                    {config.instructions.clientId}
                  </code>
                  <p><strong>2. Client Secret à configurer :</strong></p>
                  <code className="block bg-white p-2 rounded text-xs break-all">
                    {config.instructions.clientSecret}
                  </code>
                  <p><strong>3. URI de redirection :</strong></p>
                  <code className="block bg-white p-2 rounded text-xs break-all">
                    {config.instructions.redirectUri}
                  </code>
                </div>
              </div>
            )}
          </div>
        )}

        <Button 
          onClick={checkOAuthConfig}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Settings className="w-4 h-4 mr-2 animate-spin" />
              Vérification...
            </>
          ) : (
            <>
              <Settings className="w-4 h-4 mr-2" />
              Vérifier la configuration
            </>
          )}
        </Button>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Pour configurer les secrets :</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Allez dans les paramètres Supabase &gt; Edge Functions</li>
              <li>Ajoutez le secret GOOGLE_OAUTH_CLIENT_ID</li>
              <li>Ajoutez le secret GOOGLE_OAUTH_CLIENT_SECRET</li>
              <li>Cliquez sur "Vérifier la configuration"</li>
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GoogleOAuthSetup;
