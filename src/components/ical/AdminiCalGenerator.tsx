import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar, Link2, Copy, AlertCircle } from 'lucide-react';
import { useActivities } from '@/hooks/useActivities';
import { useToast } from '@/hooks/use-toast';

const AdminiCalGenerator = () => {
  const { data: activities = [] } = useActivities();
  const { toast } = useToast();

  const assignedActivities = activities.filter(activity => activity.assigned_gm_id !== null);

  // URL d'abonnement iCal pour tous les événements
  const subscriptionUrl = `https://dnxyidnkmtrmkxucqrry.supabase.co/functions/v1/admin-ical-feed`;
  const webcalUrl = subscriptionUrl.replace(/^https:\/\//, 'webcal://');
  
  const copySubscriptionUrl = async () => {
    try {
      await navigator.clipboard.writeText(subscriptionUrl);
      toast({
        title: "URL copiée",
        description: "L'URL d'abonnement a été copiée dans le presse-papiers",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier l'URL",
        variant: "destructive"
      });
    }
  };

  const copyWebcalUrl = async () => {
    try {
      await navigator.clipboard.writeText(webcalUrl);
      toast({
        title: "URL copiée",
        description: "L'URL webcal a été copiée dans le presse-papiers",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier l'URL webcal",
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-600" />
          Abonnement iCal - Planning Général Admin
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
          <div>
            <h3 className="font-medium text-purple-900">Statistiques</h3>
            <p className="text-sm text-purple-700">
              {assignedActivities.length} événement{assignedActivities.length !== 1 ? 's' : ''} assigné{assignedActivities.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Badge variant="secondary" className="bg-purple-100 text-purple-800">
            Admin
          </Badge>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              URL d'abonnement automatique
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              Utilisez cette URL pour vous abonner au planning général dans votre application de calendrier.
              Tous les événements assignés à des GMs seront synchronisés.
            </p>
            
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input 
                  value={subscriptionUrl}
                  readOnly 
                  className="flex-1 font-mono text-sm"
                />
                <Button 
                  variant="outline"
                  onClick={() => window.open(subscriptionUrl, '_blank', 'noopener,noreferrer')}
                  className="flex items-center gap-2"
                >
                  <Link2 className="w-4 h-4" />
                  Tester dans le navigateur
                </Button>
                <Button 
                  variant="outline" 
                  onClick={copySubscriptionUrl}
                  className="flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copier
                </Button>
              </div>

              <div className="flex gap-2">
                <Input 
                  value={webcalUrl}
                  readOnly 
                  className="flex-1 font-mono text-sm"
                />
                <Button 
                  variant="outline" 
                  onClick={copyWebcalUrl}
                  className="flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copier (webcal)
                </Button>
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Instructions d'utilisation
            </h4>
            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>iPhone/iPad :</strong> Réglages → Calendrier → Comptes → Ajouter un compte → Autre → S'abonner à un calendrier</p>
              <p><strong>Android :</strong> Google Calendar → + → À partir de l'URL</p>
              <p><strong>Outlook :</strong> Fichier → Paramètres du compte → Calendriers Internet</p>
              <p><strong>Autres :</strong> Cherchez "S'abonner à un calendrier" ou "Ajouter un calendrier par URL"</p>
            </div>
          </div>
        </div>

        {assignedActivities.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Aucun événement assigné à synchroniser</p>
            <p className="text-xs mt-2">L'URL fonctionnera dès qu'un événement sera assigné</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminiCalGenerator;
