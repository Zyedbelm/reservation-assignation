
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';

const PasswordResetPage = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('🔐 PasswordResetPage mounted - checking session...');
    
    const checkRecoverySession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔍 Current session on reset page:', session);
        
        if (session?.user) {
          console.log('✅ Valid recovery session found');
          setIsValidSession(true);
        } else {
          console.log('❌ No valid recovery session');
          setError('Session de récupération invalide ou expirée. Veuillez refaire une demande de réinitialisation.');
          setTimeout(() => {
            navigate('/');
          }, 3000);
        }
      } catch (err) {
        console.error('💥 Error checking recovery session:', err);
        setError('Erreur lors de la vérification de la session');
      }
    };

    checkRecoverySession();
  }, [navigate]);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔄 Starting password update...');
    
    if (!newPassword || newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const { data, error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        console.error('❌ Password update error:', error);
        setError(error.message || 'Erreur lors de la mise à jour du mot de passe');
        return;
      }

      console.log('✅ Password updated successfully');
      setSuccess('Mot de passe mis à jour avec succès ! Vous allez être redirigé vers la connexion...');
      
      // Attendre 2 secondes puis déconnecter et rediriger
      setTimeout(async () => {
        try {
          await supabase.auth.signOut();
          console.log('🚪 Signed out after password reset');
          navigate('/', { replace: true });
        } catch (err) {
          console.error('Error signing out:', err);
          navigate('/', { replace: true });
        }
      }, 2000);
      
    } catch (err) {
      console.error('💥 Unexpected error during password update:', err);
      setError('Erreur inattendue lors de la mise à jour du mot de passe');
    } finally {
      setLoading(false);
    }
  };

  if (!isValidSession && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">VR Center GM</CardTitle>
          <CardDescription className="text-center">
            Réinitialisation du mot de passe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-medium">Nouveau mot de passe</h3>
              <p className="text-sm text-gray-600 mt-1">
                Veuillez saisir votre nouveau mot de passe
              </p>
            </div>
            
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <Input
                  id="new-password"
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PasswordResetPage;
