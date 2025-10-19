
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const EmailUpdateForm = () => {
  const { toast } = useToast();
  const { profile } = useAuth();
  
  const [newEmail, setNewEmail] = useState(profile?.email || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!profile) {
      toast({
        title: "Erreur",
        description: "Profil non trouvé",
        variant: "destructive"
      });
      return;
    }

    if (newEmail === profile.email) {
      toast({
        title: "Information",
        description: "L'adresse email est déjà la même",
      });
      setIsEditing(false);
      return;
    }

    setIsLoading(true);

    try {
      // Mettre à jour l'email dans Supabase Auth
      const { error: authError } = await supabase.auth.updateUser({
        email: newEmail
      });

      if (authError) {
        console.error('Error updating auth email:', authError);
        toast({
          title: "Erreur",
          description: authError.message,
          variant: "destructive"
        });
        return;
      }

      // Mettre à jour l'email dans la table profiles
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ email: newEmail })
        .eq('id', profile.id);

      if (profileError) {
        console.error('Error updating profile email:', profileError);
        toast({
          title: "Erreur",
          description: "Erreur lors de la mise à jour du profil",
          variant: "destructive"
        });
        return;
      }

      // Mettre à jour l'email dans la table game_masters si le profil a un gm_id
      if (profile.gm_id) {
        const { error: gmError } = await supabase
          .from('game_masters')
          .update({ email: newEmail })
          .eq('id', profile.gm_id);

        if (gmError) {
          console.error('Error updating GM email:', gmError);
          // Ne pas faire échouer complètement si cette mise à jour échoue
        }
      }

      toast({
        title: "Email mis à jour",
        description: "Votre adresse email a été mise à jour avec succès. Veuillez vérifier votre nouvelle adresse email.",
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Unexpected error updating email:', error);
      toast({
        title: "Erreur",
        description: "Une erreur inattendue est survenue",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setNewEmail(profile?.email || '');
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-blue-600" />
          Adresse Email
        </CardTitle>
        <CardDescription>
          Modifiez votre adresse email
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            {isEditing ? (
              <Input
                id="email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Votre nouvelle adresse email"
                required
              />
            ) : (
              <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                {profile?.email || 'Non renseigné'}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button type="submit" disabled={isLoading}>
                  <Save className="w-4 h-4 mr-2" />
                  {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
                  Annuler
                </Button>
              </>
            ) : (
              <Button type="button" onClick={() => setIsEditing(true)}>
                Modifier
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default EmailUpdateForm;
