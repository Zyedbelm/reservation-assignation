
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SignInForm from '@/components/auth/SignInForm';
import SignUpForm from '@/components/auth/SignUpForm';
import PasswordResetForm from '@/components/auth/PasswordResetForm';

const AuthPage = () => {
  const { signIn, signUp, loading } = useAuth();
  const [showResetForm, setShowResetForm] = useState(false);

  if (loading) {
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
            Gestion des Game Masters
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showResetForm ? (
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Connexion</TabsTrigger>
                <TabsTrigger value="signup">Inscription</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <SignInForm 
                  onSignIn={signIn}
                  onShowReset={() => setShowResetForm(true)}
                  loading={loading}
                />
              </TabsContent>
              
              <TabsContent value="signup">
                <SignUpForm 
                  onSignUp={signUp}
                  loading={loading}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <PasswordResetForm 
              onBack={() => setShowResetForm(false)}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;
