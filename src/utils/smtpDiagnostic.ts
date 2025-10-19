
import { supabase } from '@/integrations/supabase/client';

export interface SMTPDiagnosticResult {
  success: boolean;
  smtpConfigured: boolean;
  testEmailSent: boolean;
  errors: string[];
  recommendations: string[];
}

/**
 * Diagnostic du système SMTP et test d'envoi d'email
 */
export const runSMTPDiagnostic = async (testEmail?: string): Promise<SMTPDiagnosticResult> => {
  console.log('📧 [SMTP-DIAGNOSTIC] Démarrage du diagnostic SMTP...');
  
  const result: SMTPDiagnosticResult = {
    success: true,
    smtpConfigured: false,
    testEmailSent: false,
    errors: [],
    recommendations: []
  };

  try {
    // Test de configuration SMTP basique
    console.log('🔧 [SMTP-DIAGNOSTIC] Test de la configuration SMTP...');
    
    const { data: configTest, error: configError } = await supabase.functions.invoke('test-smtp-config', {
      body: { test: true }
    });

    if (configError) {
      result.errors.push(`Configuration SMTP: ${configError.message}`);
      result.recommendations.push('Vérifier les variables SMTP dans les secrets Supabase');
    } else {
      result.smtpConfigured = true;
      console.log('✅ [SMTP-DIAGNOSTIC] Configuration SMTP OK');
    }

    // Test d'envoi d'email si une adresse est fournie
    if (testEmail && result.smtpConfigured) {
      console.log(`📤 [SMTP-DIAGNOSTIC] Test d'envoi vers ${testEmail}...`);
      
      const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-assignment-notification', {
        body: {
          gmEmail: testEmail,
          gmName: 'Test User',
          eventTitle: 'Test - Diagnostic SMTP',
          eventDate: new Date().toISOString().split('T')[0],
          eventTime: '14:00 - 16:00',
          eventDescription: 'Test du système d\'envoi d\'emails',
          assignmentType: 'new'
        }
      });

      if (emailError) {
        result.errors.push(`Erreur envoi email: ${emailError.message}`);
        result.recommendations.push('Vérifier la fonction send-assignment-notification');
      } else {
        result.testEmailSent = true;
        console.log('✅ [SMTP-DIAGNOSTIC] Email de test envoyé avec succès');
      }
    }

    // Générer des recommandations
    if (result.errors.length === 0) {
      result.recommendations.push('✅ Système SMTP fonctionnel');
    } else {
      result.success = false;
      
      if (!result.smtpConfigured) {
        result.recommendations.push('Configurer les variables SMTP dans Supabase');
      }
      
      if (result.smtpConfigured && !result.testEmailSent && testEmail) {
        result.recommendations.push('Déboguer la fonction d\'envoi d\'emails');
      }
    }

    console.log('✅ [SMTP-DIAGNOSTIC] Diagnostic SMTP terminé:', result);
    return result;

  } catch (error) {
    console.error('❌ [SMTP-DIAGNOSTIC] Erreur:', error);
    result.success = false;
    result.errors.push(`Erreur inattendue: ${error}`);
    return result;
  }
};
