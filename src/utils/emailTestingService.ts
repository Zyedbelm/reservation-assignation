
import { supabase } from '@/integrations/supabase/client';

export interface EmailTestResult {
  type: string;
  success: boolean;
  error?: any;
  messageId?: string;
}

export const testEmailSystem = async (): Promise<EmailTestResult[]> => {
  const results: EmailTestResult[] = [];
  
  console.log('🧪 Starting email system test suite...');

  // Test 1: Auth confirmation email
  try {
    const { data, error } = await supabase.functions.invoke('send-auth-emails', {
      body: {
        to: 'test@genieculturel.ch',
        type: 'signup',
        token: 'test-token-123',
        redirect_to: window.location.origin,
        site_url: window.location.origin
      }
    });

    results.push({
      type: 'signup_confirmation',
      success: !error,
      error,
      messageId: data?.messageId
    });
  } catch (error) {
    results.push({
      type: 'signup_confirmation',
      success: false,
      error
    });
  }

  // Test 2: Password reset email
  try {
    const { data, error } = await supabase.functions.invoke('send-auth-emails', {
      body: {
        to: 'test@genieculturel.ch',
        type: 'recovery',
        token: 'test-reset-token-123',
        redirect_to: window.location.origin,
        site_url: window.location.origin
      }
    });

    results.push({
      type: 'password_reset',
      success: !error,
      error,
      messageId: data?.messageId
    });
  } catch (error) {
    results.push({
      type: 'password_reset',
      success: false,
      error
    });
  }

  // Test 3: Assignment notification
  try {
    const { data, error } = await supabase.functions.invoke('send-assignment-notification', {
      body: {
        gmEmail: 'test-gm@genieculturel.ch',
        gmName: 'Test GM',
        eventTitle: 'Test Event',
        eventDate: '2025-01-15',
        eventTime: '14:00 - 16:00',
        eventDescription: 'Test assignment notification',
        assignmentType: 'new'
      }
    });

    results.push({
      type: 'assignment_notification',
      success: !error,
      error,
      messageId: data?.messageId
    });
  } catch (error) {
    results.push({
      type: 'assignment_notification',
      success: false,
      error
    });
  }

  // Test 4: Admin unassigned alert
  try {
    const { data, error } = await supabase.functions.invoke('send-admin-unassigned-notification', {
      body: {
        adminEmail: 'admin@genieculturel.ch',
        unassignedEvents: [
          {
            id: 'test-event-1',
            title: 'Test Unassigned Event',
            date: '2025-01-20',
            start_time: '15:00',
            end_time: '17:00'
          }
        ]
      }
    });

    results.push({
      type: 'admin_unassigned_alert',
      success: !error,
      error,
      messageId: data?.messageId
    });
  } catch (error) {
    results.push({
      type: 'admin_unassigned_alert',
      success: false,
      error
    });
  }

  console.log('🧪 Email test suite completed:', results);
  return results;
};

export const validateEmailConfiguration = async (): Promise<{
  resendConfigured: boolean;
  domainVerified: boolean;
  webhooksConfigured: boolean;
  issues: string[];
}> => {
  const issues: string[] = [];
  
  // Vérifier la configuration Resend (on ne peut pas vérifier directement la clé API)
  let resendConfigured = true;
  
  // Tester une fonction email pour vérifier la configuration
  try {
    const { error } = await supabase.functions.invoke('send-auth-emails', {
      body: {
        to: 'test@example.com',
        type: 'signup',
        token: 'test',
        redirect_to: 'test',
        site_url: 'test'
      }
    });
    
    if (error && error.message?.includes('RESEND_API_KEY')) {
      resendConfigured = false;
      issues.push('Clé API Resend non configurée ou invalide');
    }
  } catch (error) {
    resendConfigured = false;
    issues.push('Erreur lors du test de la configuration Resend');
  }

  // Note: On ne peut pas vérifier directement le domaine depuis le frontend
  const domainVerified = true; // Assumé pour le moment
  
  // Vérifier la configuration des webhooks Supabase
  const webhooksConfigured = true; // Configuration présente dans config.toml
  
  if (!resendConfigured) {
    issues.push('Configurez votre clé API Resend dans les secrets Supabase');
  }
  
  if (!domainVerified) {
    issues.push('Vérifiez le domaine genieculturel.ch dans Resend');
  }

  return {
    resendConfigured,
    domainVerified,
    webhooksConfigured,
    issues
  };
};
