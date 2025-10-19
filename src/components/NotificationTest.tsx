
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { createGMNotificationWithEmail, createNotificationContent } from '@/utils/notificationServiceV2';
import { supabase } from '@/integrations/supabase/client';
import EmailTestPanel from './admin/EmailTestPanel';
import NotificationAuditPanel from './NotificationAuditPanel';
import SystemDiagnostic from './SystemDiagnostic';

const NotificationTest = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const { toast } = useToast();

  const testManualNotification = async () => {
    setIsLoading(true);
    setLastResult(null);
    
    try {
      // Récupérer un GM pour le test
      const { data: gms, error: gmError } = await supabase
        .from('game_masters')
        .select('id, name, email')
        .eq('is_active', true)
        .limit(1);

      if (gmError || !gms || gms.length === 0) {
        throw new Error('Aucun GM actif trouvé pour le test');
      }

      const testGM = gms[0];
      if (!testGM.email) {
        throw new Error('Le GM sélectionné n\'a pas d\'email configuré');
      }

      // Données de test avec UUID valide
      const eventData = {
        id: crypto.randomUUID(),
        title: 'TEST - Événement de notification',
        date: new Date().toISOString().split('T')[0],
        start_time: '14:00',
        end_time: '16:00',
        description: 'Ceci est un test du système de notification',
        autoAssigned: false
      };

      const { title, message } = createNotificationContent('assignment', eventData);

      console.log('🧪 [NOTIFICATION-TEST] Test notification manuelle...');
      console.log('🧪 [NOTIFICATION-TEST] GM:', testGM.name, testGM.email);
      console.log('🧪 [NOTIFICATION-TEST] Event:', eventData.title);

      const result = await createGMNotificationWithEmail({
        gmId: testGM.id,
        gmEmail: testGM.email,
        gmName: testGM.name,
        notificationType: 'assignment',
        eventId: eventData.id,
        title: `📧 TEST MANUEL - ${title}`,
        message: `${message}\n\nCeci est un test manuel du système de notification. Ignorez ce message.`,
        eventData
      });

      setLastResult(result);

      if (result.success) {
        toast({
          title: "✅ Test manuel réussi",
          description: `Notification${result.emailSent ? ' et email' : ''} envoyé${result.emailSent ? 's' : ''} à ${testGM.name}`
        });
      } else {
        toast({
          title: "❌ Test manuel échoué",
          description: `${result.errors.length} erreur(s) détectée(s)`,
          variant: "destructive"
        });
      }

    } catch (error: any) {
      console.error('❌ [NOTIFICATION-TEST] Erreur:', error);
      setLastResult({ success: false, errors: [{ type: 'exception', error }], emailSent: false });
      toast({
        title: "❌ Erreur de test",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testAutoUnassignmentNotification = async () => {
    setIsLoading(true);
    setLastResult(null);
    
    try {
      // Récupérer un GM pour le test
      const { data: gms, error: gmError } = await supabase
        .from('game_masters')
        .select('id, name, email')
        .eq('is_active', true)
        .limit(1);

      if (gmError || !gms || gms.length === 0) {
        throw new Error('Aucun GM actif trouvé pour le test');
      }

      const testGM = gms[0];
      if (!testGM.email) {
        throw new Error('Le GM sélectionné n\'a pas d\'email configuré');
      }

      // Données de test pour désassignation automatique
      const eventData = {
        id: crypto.randomUUID(),
        title: 'TEST - Désassignation automatique',
        date: new Date().toISOString().split('T')[0],
        start_time: '18:00',
        end_time: '20:00',
        description: 'Test du système de désassignation automatique',
        reason: 'missing_competency',
        gameName: 'Test Game',
        autoFixed: true
      };

      const { title, message } = createNotificationContent('unassigned', eventData);

      console.log('🧪 [NOTIFICATION-TEST] Test désassignation automatique...');
      console.log('🧪 [NOTIFICATION-TEST] GM:', testGM.name, testGM.email);

      const result = await createGMNotificationWithEmail({
        gmId: testGM.id,
        gmEmail: testGM.email,
        gmName: testGM.name,
        notificationType: 'unassigned',
        eventId: eventData.id,
        title: `🤖 TEST AUTO - ${title}`,
        message: `${message}\n\nCeci est un test de désassignation automatique. Ignorez ce message.`,
        eventData
      });

      setLastResult(result);

      if (result.success) {
        toast({
          title: "✅ Test auto réussi",
          description: `Notification de désassignation${result.emailSent ? ' et email' : ''} envoyé${result.emailSent ? 's' : ''} à ${testGM.name}`
        });
      } else {
        toast({
          title: "❌ Test auto échoué",
          description: `${result.errors.length} erreur(s) détectée(s)`,
          variant: "destructive"
        });
      }

    } catch (error: any) {
      console.error('❌ [NOTIFICATION-TEST] Erreur test désassignation:', error);
      setLastResult({ success: false, errors: [{ type: 'exception', error }], emailSent: false });
      toast({
        title: "❌ Erreur de test",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <SystemDiagnostic />
      
      <EmailTestPanel />
      
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>🧪 Test du Système de Notifications V2</CardTitle>
          <CardDescription>
            Tests améliorés avec diagnostic intégré et fallbacks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={testManualNotification}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? '⏳ Test en cours...' : '📧 Test Notification Manuelle'}
            </Button>
            
            <Button
              onClick={testAutoUnassignmentNotification}
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              {isLoading ? '⏳ Test en cours...' : '🤖 Test Désassignation Auto'}
            </Button>
          </div>

          {lastResult && (
            <Alert className={lastResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">
                    {lastResult.success ? '✅ Succès' : '❌ Échec'}
                  </div>
                  <div className="text-sm">
                    <strong>Notification créée:</strong> {lastResult.notificationId ? 'Oui' : 'Non'}
                  </div>
                  <div className="text-sm">
                    <strong>Email envoyé:</strong> {lastResult.emailSent ? 'Oui' : 'Non'}
                  </div>
                  <div className="text-sm">
                    <strong>Erreurs:</strong> {lastResult.errors?.length || 0}
                  </div>
                  {lastResult.errors && lastResult.errors.length > 0 && (
                    <div className="text-sm text-red-600 max-h-32 overflow-y-auto">
                      <strong>Détails erreurs:</strong>
                      {lastResult.errors.map((err: any, index: number) => (
                        <div key={index} className="ml-2">
                          • {err.type}: {JSON.stringify(err.error, null, 2)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Alert>
            <AlertDescription>
              <div className="text-sm">
                <strong>Version 2:</strong> Tests avec diagnostic intégré, fallbacks automatiques et gestion d'erreur améliorée.
                <br /><br />
                <strong>✅ Nouveautés:</strong> Détection automatique des problèmes, création de notifications avec fallback direct, envoi d'emails avec retry.
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
      
      <NotificationAuditPanel />
    </div>
  );
};

export default NotificationTest;
