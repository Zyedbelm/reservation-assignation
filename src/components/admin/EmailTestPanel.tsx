
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Send, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const EmailTestPanel = () => {
  const [testEmail, setTestEmail] = useState('');
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
    error?: any;
  } | null>(null);
  
  const { toast } = useToast();

  const testEmailService = async () => {
    if (!testEmail.trim()) {
      toast({
        title: "Email requis",
        description: "Veuillez entrer une adresse email pour le test",
        variant: "destructive",
      });
      return;
    }

    setIsTestingEmail(true);
    setTestResult(null);
    
    try {
      console.log('📧 [EMAIL-TEST] Démarrage du test d\'email vers:', testEmail);
      
      // Test de l'edge function send-assignment-notification
      const { data, error } = await supabase.functions.invoke('send-assignment-notification', {
        body: {
          testMode: true,
          testEmail: testEmail.trim(),
          notificationType: 'assignment',
          eventData: {
            id: 'test-event-id',
            title: 'Test d\'assignation',
            date: new Date().toISOString().split('T')[0],
            start_time: '14:00',
            end_time: '16:00',
            description: 'Ceci est un test d\'envoi d\'email'
          }
        }
      });

      console.log('📧 [EMAIL-TEST] Réponse de l\'edge function:', { data, error });

      if (error) {
        console.error('❌ [EMAIL-TEST] Erreur edge function:', error);
        setTestResult({
          success: false,
          message: 'Erreur lors de l\'appel à l\'edge function',
          details: error.message,
          error: error
        });
        
        toast({
          title: "Erreur de test",
          description: `Erreur edge function: ${error.message}`,
          variant: "destructive",
        });
      } else {
        console.log('✅ [EMAIL-TEST] Test réussi:', data);
        setTestResult({
          success: true,
          message: 'Test d\'email réussi',
          details: `Email envoyé à ${testEmail}`
        });
        
        toast({
          title: "Test réussi",
          description: `Email de test envoyé à ${testEmail}`,
        });
      }

    } catch (error) {
      console.error('💥 [EMAIL-TEST] Exception durant le test:', error);
      
      setTestResult({
        success: false,
        message: 'Exception durant le test',
        details: error.message,
        error: error
      });
      
      toast({
        title: "Erreur de test",
        description: `Exception: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsTestingEmail(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Test du Service d'Email
        </CardTitle>
        <CardDescription>
          Testez la configuration du service d'envoi d'emails
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="test-email">Email de test</Label>
            <Input
              id="test-email"
              type="email"
              placeholder="test@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              disabled={isTestingEmail}
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={testEmailService}
              disabled={isTestingEmail || !testEmail.trim()}
              className="w-full"
            >
              {isTestingEmail ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Test en cours...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Tester l'envoi
                </>
              )}
            </Button>
          </div>
        </div>

        {testResult && (
          <Alert className={testResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <div className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              <AlertDescription>
                <div className="space-y-2">
                  <div className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {testResult.message}
                  </div>
                  {testResult.details && (
                    <div className={`text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                      {testResult.details}
                    </div>
                  )}
                  {testResult.error && (
                    <details className="text-xs text-red-600 mt-2">
                      <summary className="cursor-pointer font-medium">Détails de l'erreur</summary>
                      <pre className="mt-1 p-2 bg-red-100 rounded text-red-800 overflow-x-auto">
                        {JSON.stringify(testResult.error, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </AlertDescription>
            </div>
          </Alert>
        )}

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            Diagnostic
          </h4>
          <div className="space-y-2 text-sm text-gray-600">
            <div>• Vérifiez que le secret RESEND_API_KEY est configuré</div>
            <div>• Assurez-vous que le domaine email est validé sur Resend</div>
            <div>• Consultez les logs de l'edge function pour plus de détails</div>
            <div>• Vérifiez que l'edge function send-assignment-notification est déployée</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EmailTestPanel;
