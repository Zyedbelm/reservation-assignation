
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Mail, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw,
  Bug,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { runNotificationDiagnostic, testAutomaticNotificationCreation, NotificationDiagnosticResult } from '@/utils/notificationDiagnostic';
import { runSMTPDiagnostic, SMTPDiagnosticResult } from '@/utils/smtpDiagnostic';
import { supabase } from '@/integrations/supabase/client';

const SystemDiagnostic = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [notificationResult, setNotificationResult] = useState<NotificationDiagnosticResult | null>(null);
  const [smtpResult, setSmtpResult] = useState<SMTPDiagnosticResult | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [testGmId, setTestGmId] = useState('');
  const { toast } = useToast();

  const runFullDiagnostic = async () => {
    setIsRunning(true);
    setNotificationResult(null);
    setSmtpResult(null);

    try {
      toast({
        title: "Diagnostic en cours",
        description: "Analyse complète du système en cours...",
      });

      // Phase 1: Diagnostic des notifications
      console.log('🔍 Démarrage diagnostic notifications...');
      const notifResult = await runNotificationDiagnostic();
      setNotificationResult(notifResult);

      // Phase 2: Diagnostic SMTP
      console.log('📧 Démarrage diagnostic SMTP...');
      const emailResult = await runSMTPDiagnostic(testEmail || undefined);
      setSmtpResult(emailResult);

      const totalIssues = notifResult.issues.length + emailResult.errors.length;
      
      if (totalIssues === 0) {
        toast({
          title: "✅ Diagnostic terminé",
          description: "Aucun problème détecté dans le système",
        });
      } else {
        toast({
          title: "⚠️ Diagnostic terminé",
          description: `${totalIssues} problème(s) détecté(s)`,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Erreur diagnostic:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'effectuer le diagnostic complet",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const testNotificationCreation = async () => {
    if (!testGmId) {
      toast({
        title: "GM ID requis",
        description: "Veuillez saisir un GM ID pour le test",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    try {
      const success = await testAutomaticNotificationCreation(testGmId);
      
      if (success) {
        toast({
          title: "✅ Test réussi",
          description: "Notification automatique créée avec succès",
        });
      } else {
        toast({
          title: "❌ Test échoué",
          description: "Impossible de créer la notification automatique",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erreur de test",
        description: "Erreur lors du test de création de notification",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getAvailableGMs = async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('gm_id, email')
        .not('gm_id', 'is', null)
        .limit(5);

      if (profiles && profiles.length > 0) {
        console.log('GMs disponibles pour test:', profiles);
        toast({
          title: "GMs disponibles",
          description: `${profiles.length} GM(s) trouvé(s) - voir console`,
        });
      }
    } catch (error) {
      console.error('Erreur récupération GMs:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5" />
            Diagnostic Système Complet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email de test (optionnel)</label>
              <Input
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">GM ID pour test notif</label>
              <div className="flex gap-2">
                <Input
                  placeholder="GM UUID"
                  value={testGmId}
                  onChange={(e) => setTestGmId(e.target.value)}
                />
                <Button variant="outline" size="sm" onClick={getAvailableGMs}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={runFullDiagnostic}
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              {isRunning ? 'Diagnostic en cours...' : 'Lancer Diagnostic Complet'}
            </Button>

            <Button 
              onClick={testNotificationCreation}
              disabled={isRunning || !testGmId}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Test Notification Auto
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Résultats Diagnostic Notifications */}
      {notificationResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {notificationResult.success && notificationResult.issues.length === 0 ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-orange-500" />
              )}
              Diagnostic Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {notificationResult.details.profilesCount}
                </div>
                <div className="text-sm text-muted-foreground">Profils</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {notificationResult.details.gameMastersCount}
                </div>
                <div className="text-sm text-muted-foreground">Game Masters</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {notificationResult.details.notificationsCount}
                </div>
                <div className="text-sm text-muted-foreground">Notifications</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {notificationResult.issues.length}
                </div>
                <div className="text-sm text-muted-foreground">Problèmes</div>
              </div>
            </div>

            {notificationResult.issues.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-600">Problèmes détectés:</h4>
                {notificationResult.issues.map((issue, index) => (
                  <Alert key={index} className="border-red-200">
                    <AlertTriangle className="w-4 h-4" />
                    <AlertDescription>{issue}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <h4 className="font-medium">Recommandations:</h4>
              {notificationResult.recommendations.map((rec, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Badge variant="outline">{rec}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Résultats Diagnostic SMTP */}
      {smtpResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {smtpResult.success ? (
                <CheckCircle className="w-5 h-5 text-green-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              )}
              Diagnostic SMTP
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <Badge variant={smtpResult.smtpConfigured ? "secondary" : "destructive"}>
                  {smtpResult.smtpConfigured ? "✅ Configuré" : "❌ Non configuré"}
                </Badge>
                <div className="text-sm text-muted-foreground mt-1">Configuration</div>
              </div>
              <div className="text-center">
                <Badge variant={smtpResult.testEmailSent ? "secondary" : "outline"}>
                  {smtpResult.testEmailSent ? "✅ Envoyé" : "⏳ Non testé"}
                </Badge>
                <div className="text-sm text-muted-foreground mt-1">Email Test</div>
              </div>
              <div className="text-center">
                <Badge variant={smtpResult.errors.length === 0 ? "secondary" : "destructive"}>
                  {smtpResult.errors.length} Erreur(s)
                </Badge>
                <div className="text-sm text-muted-foreground mt-1">Status</div>
              </div>
            </div>

            {smtpResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-600">Erreurs SMTP:</h4>
                {smtpResult.errors.map((error, index) => (
                  <Alert key={index} className="border-red-200">
                    <Mail className="w-4 h-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <h4 className="font-medium">Recommandations:</h4>
              {smtpResult.recommendations.map((rec, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Badge variant="outline">{rec}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SystemDiagnostic;
