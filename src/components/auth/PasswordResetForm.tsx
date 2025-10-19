
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

interface PasswordResetFormProps {
  onBack: () => void;
}

const PasswordResetForm: React.FC<PasswordResetFormProps> = ({ onBack }) => {
  const [resetEmail, setResetEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setError('Veuillez saisir votre adresse email');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('🔄 Sending password reset email to:', resetEmail);
      
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('❌ Reset password error:', error);
        setError(error.message);
      } else {
        console.log('✅ Password reset email sent successfully');
        setSuccess('Instructions de réinitialisation envoyées par email. Vérifiez votre boîte de réception.');
      }
    } catch (err) {
      console.error('💥 Unexpected error:', err);
      setError('Erreur lors de l\'envoi de l\'email de réinitialisation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-4">
        <h3 className="text-lg font-medium">Réinitialiser le mot de passe</h3>
        <p className="text-sm text-gray-600 mt-1">
          Saisissez votre adresse email pour recevoir les instructions
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reset-email">Email</Label>
          <Input
            id="reset-email"
            type="email"
            placeholder="votre@email.com"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            required
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
        
        <div className="space-y-2">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Envoi en cours...' : 'Envoyer les instructions'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onBack}
          >
            Retour à la connexion
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PasswordResetForm;
