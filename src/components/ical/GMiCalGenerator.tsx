
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar, Link2, Copy, AlertCircle } from 'lucide-react';
import { useActivities } from '@/hooks/useActivities';
import { useAuth } from '@/hooks/useAuth';
import { useGameMasters } from '@/hooks/useGameMasters';
import { useToast } from '@/hooks/use-toast';

const GMiCalGenerator = () => {
  const { profile } = useAuth();
  const { data: activities = [] } = useActivities();
  const { data: gameMasters = [] } = useGameMasters();
  const { toast } = useToast();

  const currentGM = gameMasters.find(gm => gm.id === profile?.gm_id);
  const gmId = profile?.gm_id || profile?.id;
  const myActivities = activities.filter(activity => activity.assigned_gm_id === gmId);

  // URL d'abonnement iCal
  const subscriptionUrl = `https://dnxyidnkmtrmkxucqrry.supabase.co/functions/v1/gm-ical-feed?gm_id=${gmId}`;

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Abonnement iCal - Mon Planning
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
          <div>
            <h3 className="font-medium text-blue-900">Statistiques</h3>
            <p className="text-sm text-blue-700">
              {myActivities.length} événement{myActivities.length !== 1 ? 's' : ''} assigné{myActivities.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            {currentGM?.name || profile?.first_name || 'GM'}
          </Badge>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              URL d'abonnement automatique
            </h4>
            <p className="text-sm text-gray-600 mb-3">
              Utilisez cette URL pour vous abonner à votre planning dans votre application de calendrier.
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
                  onClick={copySubscriptionUrl}
                  className="flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copier
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

        {myActivities.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>Aucun événement assigné à synchroniser</p>
            <p className="text-xs mt-2">L'URL fonctionnera dès qu'un événement vous sera assigné</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GMiCalGenerator;
