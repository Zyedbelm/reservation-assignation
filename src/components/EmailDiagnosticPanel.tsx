import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { runSMTPDiagnostic } from '@/utils/smtpDiagnostic';
import { runNotificationDiagnostic } from '@/utils/notificationDiagnostic';
import { CheckCircle2, XCircle, AlertTriangle, Mail, Database, Settings } from 'lucide-react';

interface DiagnosticResult {
  success: boolean;
  issues: string[];
  recommendations: string[];
  details?: any;
}

export const EmailDiagnosticPanel = () => {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [smtpResult, setSmtpResult] = useState<any>(null);
  const [notificationResult, setNotificationResult] = useState<any>(null);
  const [gmDataResult, setGmDataResult] = useState<DiagnosticResult | null>(null);

  const runFullDiagnostic = async () => {
    setIsRunning(true);
    
    // Timeout de sécurité pour éviter que le bouton reste bloqué
    const timeoutId = setTimeout(() => {
      setIsRunning(false);
      toast({
        title: "⏱️ Timeout",
        description: "Le diagnostic a pris trop de temps - arrêt forcé",
        variant: "destructive",
      });
    }, 60000); // 60 secondes

    try {
      toast({
        title: "🔍 Démarrage du diagnostic",
        description: "Analyse complète du système d'emails en cours...",
      });

      // Phase 1: SMTP Diagnostic
      console.log('📧 Phase 1: Test SMTP');
      try {
        const smtp = await Promise.race([
          runSMTPDiagnostic(testEmail),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('SMTP timeout après 30s')), 30000)
          )
        ]);
        setSmtpResult(smtp);
      } catch (smtpError) {
        console.error('❌ Erreur SMTP:', smtpError);
        setSmtpResult({
          success: false,
          smtpConfigured: false,
          testEmailSent: false,
          errors: [`Erreur SMTP: ${smtpError}`],
          recommendations: ['Vérifier la configuration SMTP', 'Tester manuellement la connexion']
        });
      }

      // Phase 2: Notification System Diagnostic
      console.log('📨 Phase 2: Test Notifications');
      try {
        const notifications = await Promise.race([
          runNotificationDiagnostic(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Notifications timeout après 20s')), 20000)
          )
        ]);
        setNotificationResult(notifications);
      } catch (notifError) {
        console.error('❌ Erreur Notifications:', notifError);
        setNotificationResult({
          success: false,
          totalNotifications: 0,
          emailsSent: 0,
          pendingEmails: 0,
          issues: [`Erreur notifications: ${notifError}`],
        });
      }

      // Phase 3: GM Data Consistency
      console.log('👥 Phase 3: Vérification GM Data');
      try {
        await checkGMDataConsistency();
      } catch (gmError) {
        console.error('❌ Erreur GM Data:', gmError);
        setGmDataResult({
          success: false,
          issues: [`Erreur GM Data: ${gmError}`],
          recommendations: ['Vérifier la connectivité à la base de données'],
        });
      }

      clearTimeout(timeoutId);
      
      const hasErrors = !smtpResult?.success || !notificationResult?.success || !gmDataResult?.success;
      
      toast({
        title: hasErrors ? "⚠️ Diagnostic terminé avec des problèmes" : "✅ Diagnostic terminé",
        description: hasErrors ? 
          "Des problèmes ont été identifiés - voir les détails" : 
          "Tous les tests ont réussi",
      });

    } catch (error) {
      clearTimeout(timeoutId);
      console.error('❌ Erreur diagnostic générale:', error);
      toast({
        title: "❌ Erreur",
        description: "Erreur lors du diagnostic: " + error,
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const checkGMDataConsistency = async () => {
    try {
      const result = await fetch('/api/check-gm-consistency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (result.ok) {
        const data = await result.json();
        setGmDataResult({
          success: data.success,
          issues: data.issues || [],
          recommendations: data.recommendations || [],
          details: data.details
        });
      }
    } catch (error) {
      console.error('Erreur check GM consistency:', error);
      setGmDataResult({
        success: false,
        issues: ['Erreur lors de la vérification des données GM'],
        recommendations: ['Vérifier la connectivité à la base de données'],
      });
    }
  };

  const repairGMData = async () => {
    try {
      toast({
        title: "🔧 Réparation en cours",
        description: "Correction des mappings GM...",
      });

      const result = await fetch('/api/repair-gm-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (result.ok) {
        toast({
          title: "✅ Réparation terminée",
          description: "Les mappings GM ont été corrigés",
        });
        await checkGMDataConsistency(); // Re-check after repair
      }
    } catch (error) {
      toast({
        title: "❌ Erreur réparation",
        description: "Impossible de réparer les données GM",
        variant: "destructive",
      });
    }
  };

  const resendFailedEmails = async () => {
    try {
      toast({
        title: "📧 Renvoi des emails",
        description: "Renvoi des notifications en attente...",
      });

      const result = await fetch('/api/resend-failed-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (result.ok) {
        const data = await result.json();
        toast({
          title: "✅ Emails renvoyés",
          description: `${data.sent} emails renvoyés avec succès`,
        });
      }
    } catch (error) {
      toast({
        title: "❌ Erreur renvoi",
        description: "Impossible de renvoyer les emails",
        variant: "destructive",
      });
    }
  };

  const StatusIcon = ({ success }: { success: boolean }) => 
    success ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Diagnostic Système d'Emails
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="testEmail">Email de test (optionnel)</Label>
              <Input
                id="testEmail"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                type="email"
              />
            </div>
            <Button 
              onClick={runFullDiagnostic} 
              disabled={isRunning}
              className="px-6"
            >
              {isRunning ? "🔍 Diagnostic..." : "🚀 Lancer Audit Complet"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {(smtpResult || notificationResult || gmDataResult) && (
        <Tabs defaultValue="smtp" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="smtp" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              SMTP
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Données GM
            </TabsTrigger>
          </TabsList>

          <TabsContent value="smtp" className="space-y-4">
            {smtpResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <StatusIcon success={smtpResult.success} />
                    Configuration SMTP
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Badge variant={smtpResult.smtpConfigured ? "default" : "destructive"}>
                        {smtpResult.smtpConfigured ? "✅ Configuré" : "❌ Non configuré"}
                      </Badge>
                    </div>
                    <div>
                      <Badge variant={smtpResult.testEmailSent ? "default" : "secondary"}>
                        {smtpResult.testEmailSent ? "✅ Email envoyé" : "⏸️ Non testé"}
                      </Badge>
                    </div>
                  </div>

                  {smtpResult.errors.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          <strong>Erreurs détectées:</strong>
                          <ul className="list-disc pl-5">
                            {smtpResult.errors.map((error: string, i: number) => (
                              <li key={i}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {smtpResult.recommendations.length > 0 && (
                    <Alert>
                      <AlertDescription>
                        <div className="space-y-1">
                          <strong>Recommandations:</strong>
                          <ul className="list-disc pl-5">
                            {smtpResult.recommendations.map((rec: string, i: number) => (
                              <li key={i}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="notifications" className="space-y-4">
            {notificationResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <StatusIcon success={notificationResult.success} />
                    Système de Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Total notifications:</span> {notificationResult.totalNotifications}
                    </div>
                    <div>
                      <span className="font-medium">Emails envoyés:</span> {notificationResult.emailsSent}
                    </div>
                    <div>
                      <span className="font-medium">En attente:</span> {notificationResult.pendingEmails}
                    </div>
                  </div>

                  {notificationResult.issues.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          <strong>Problèmes identifiés:</strong>
                          <ul className="list-disc pl-5">
                            {notificationResult.issues.map((issue: string, i: number) => (
                              <li key={i}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {notificationResult.pendingEmails > 0 && (
                    <div className="flex gap-2">
                      <Button onClick={resendFailedEmails} variant="outline">
                        📧 Renvoyer les emails en attente
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            {gmDataResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <StatusIcon success={gmDataResult.success} />
                    Cohérence des Données GM
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {gmDataResult.issues.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          <strong>Problèmes détectés:</strong>
                          <ul className="list-disc pl-5">
                            {gmDataResult.issues.map((issue: string, i: number) => (
                              <li key={i}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {gmDataResult.recommendations.length > 0 && (
                    <Alert>
                      <AlertDescription>
                        <div className="space-y-1">
                          <strong>Actions recommandées:</strong>
                          <ul className="list-disc pl-5">
                            {gmDataResult.recommendations.map((rec: string, i: number) => (
                              <li key={i}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {!gmDataResult.success && (
                    <div className="flex gap-2">
                      <Button onClick={repairGMData} variant="outline">
                        🔧 Réparer les mappings GM
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};