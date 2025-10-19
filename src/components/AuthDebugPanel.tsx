import { useAuth } from '@/hooks/useAuth';
import { useGameMasters } from '@/hooks/useGameMasters';
import { useGames } from '@/hooks/useGames';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, LogOut, AlertCircle, CheckCircle, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const AuthDebugPanel = () => {
  const { user, profile, loading, isAdmin, signOut } = useAuth();
  const { data: gameMasters = [], isLoading: gmLoading, error: gmError } = useGameMasters();
  const { data: games = [], isLoading: gamesLoading, error: gamesError } = useGames();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleRefreshCache = () => {
    console.log('🔄 Refreshing all caches...');
    queryClient.invalidateQueries();
    toast({
      title: "Cache actualisé",
      description: "Toutes les données ont été rechargées",
    });
  };

  const handleSignOut = async () => {
    console.log('🚪 Déconnexion forcée...');
    await signOut();
  };

  return (
    <Card className="mb-6 border-blue-200 bg-blue-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <User className="w-5 h-5" />
          Diagnostic d'Authentification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statut d'authentification */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="font-medium">Authentification</h3>
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <Badge variant="default">Connecté</Badge>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <Badge variant="destructive">Non connecté</Badge>
                </>
              )}
            </div>
            {user && (
              <div className="text-sm text-gray-600">
                <p>Email: {user.email}</p>
                <p>Rôle: {profile?.role || 'Non défini'}</p>
                <p>Admin: {isAdmin ? 'Oui' : 'Non'}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">Données chargées</h3>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {gmLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                ) : gmError ? (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
                <span className="text-sm">
                  Game Masters: {gmLoading ? 'Chargement...' : `${gameMasters.length} éléments`}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                {gamesLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                ) : gamesError ? (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
                <span className="text-sm">
                  Jeux: {gamesLoading ? 'Chargement...' : `${games.length} éléments`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Erreurs */}
        {(gmError || gamesError) && (
          <div className="bg-red-50 border border-red-200 rounded p-3">
            <h4 className="font-medium text-red-800 mb-2">Erreurs détectées:</h4>
            {gmError && (
              <p className="text-sm text-red-700">Game Masters: {gmError.message}</p>
            )}
            {gamesError && (
              <p className="text-sm text-red-700">Jeux: {gamesError.message}</p>
            )}
          </div>
        )}

        {/* Actions de diagnostic */}
        <div className="flex gap-2 pt-2 border-t">
          <Button onClick={handleRefreshCache} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser Cache
          </Button>
          
          <Button onClick={handleSignOut} variant="outline" size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Reconnexion
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};