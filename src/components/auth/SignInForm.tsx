
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';

interface SignInFormProps {
  onSignIn: (email: string, password: string) => Promise<{ error?: any }>;
  onShowReset: () => void;
  loading: boolean;
}

const SignInForm: React.FC<SignInFormProps> = ({ onSignIn, onShowReset, loading }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const { error } = await onSignIn(email, password);
    if (error) {
      setError(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="signin-email">Email</Label>
        <Input
          id="signin-email"
          type="email"
          placeholder="votre@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signin-password">Mot de passe</Label>
        <Input
          id="signin-password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" className="w-full" disabled={loading}>
        Se connecter
      </Button>
      <div className="text-center">
        <Button
          type="button"
          variant="link"
          className="text-sm text-gray-600 hover:text-gray-800"
          onClick={onShowReset}
        >
          Mot de passe oublié ?
        </Button>
      </div>
    </form>
  );
};

export default SignInForm;
