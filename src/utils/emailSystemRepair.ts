import { supabase } from '@/integrations/supabase/client';

export interface RepairResult {
  success: boolean;
  fixed: number;
  errors: string[];
  details: any[];
}

/**
 * Vérifie et répare la cohérence des données GM
 */
export const checkAndRepairGMData = async (): Promise<RepairResult> => {
  console.log('🔧 [GM-REPAIR] Démarrage de la vérification des données GM...');
  
  const result: RepairResult = {
    success: true,
    fixed: 0,
    errors: [],
    details: []
  };

  try {
    // 1. Vérifier les notifications avec GM IDs invalides
    const { data: orphanedNotifications, error: notifError } = await supabase
      .from('gm_notifications')
      .select(`
        id,
        gm_id,
        title,
        notification_type,
        email_sent,
        created_at
      `)
      .not('gm_id', 'in', `(SELECT gm_id FROM profiles WHERE gm_id IS NOT NULL)`);

    if (notifError) {
      result.errors.push(`Erreur lecture notifications: ${notifError.message}`);
      result.success = false;
      return result;
    }

    // 2. Vérifier les profiles sans email
    const { data: profilesWithoutEmail, error: profileError } = await supabase
      .from('profiles')
      .select('id, gm_id, email, role')
      .eq('role', 'gm')
      .or('email.is.null,email.eq.');

    if (profileError) {
      result.errors.push(`Erreur lecture profiles: ${profileError.message}`);
      result.success = false;
      return result;
    }

    // 3. Vérifier les GM sans profile correspondant
    const { data: gmWithoutProfile, error: gmError } = await supabase
      .from('game_masters')
      .select('id, name, email')
      .not('id', 'in', `(SELECT gm_id FROM profiles WHERE gm_id IS NOT NULL)`);

    if (gmError) {
      result.errors.push(`Erreur lecture game_masters: ${gmError.message}`);
      result.success = false;
      return result;
    }

    console.log(`📊 [GM-REPAIR] Analyse: ${orphanedNotifications?.length || 0} notifications orphelines, ${profilesWithoutEmail?.length || 0} profiles sans email, ${gmWithoutProfile?.length || 0} GM sans profile`);

    result.details = [
      {
        type: 'orphaned_notifications',
        count: orphanedNotifications?.length || 0,
        items: orphanedNotifications || []
      },
      {
        type: 'profiles_without_email',
        count: profilesWithoutEmail?.length || 0,
        items: profilesWithoutEmail || []
      },
      {
        type: 'gm_without_profile',
        count: gmWithoutProfile?.length || 0,
        items: gmWithoutProfile || []
      }
    ];

    // 4. Tentative de réparation automatique
    let fixCount = 0;

    // Réparer les profiles sans email en utilisant les données de game_masters
    if (profilesWithoutEmail && profilesWithoutEmail.length > 0) {
      for (const profile of profilesWithoutEmail) {
        if (profile.gm_id) {
          const { data: gmData } = await supabase
            .from('game_masters')
            .select('email')
            .eq('id', profile.gm_id)
            .single();

          if (gmData?.email) {
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ email: gmData.email })
              .eq('id', profile.id);

            if (!updateError) {
              fixCount++;
              console.log(`✅ [GM-REPAIR] Email ajouté pour profile ${profile.id}: ${gmData.email}`);
            } else {
              result.errors.push(`Erreur mise à jour profile ${profile.id}: ${updateError.message}`);
            }
          }
        }
      }
    }

    // Créer des profiles manquants pour les GM
    if (gmWithoutProfile && gmWithoutProfile.length > 0) {
      for (const gm of gmWithoutProfile) {
        if (gm.email) {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              gm_id: gm.id,
              email: gm.email,
              role: 'gm'
            });

          if (!insertError) {
            fixCount++;
            console.log(`✅ [GM-REPAIR] Profile créé pour GM ${gm.name}: ${gm.email}`);
          } else {
            result.errors.push(`Erreur création profile pour GM ${gm.id}: ${insertError.message}`);
          }
        }
      }
    }

    result.fixed = fixCount;
    
    if (result.errors.length > 0) {
      result.success = false;
    }

    console.log(`✅ [GM-REPAIR] Réparation terminée: ${fixCount} éléments corrigés, ${result.errors.length} erreurs`);
    return result;

  } catch (error) {
    console.error('❌ [GM-REPAIR] Erreur:', error);
    result.success = false;
    result.errors.push(`Erreur inattendue: ${error}`);
    return result;
  }
};

/**
 * Renvoie les emails pour les notifications en attente
 */
export const resendPendingEmails = async (): Promise<RepairResult> => {
  console.log('📧 [EMAIL-RESEND] Démarrage du renvoi des emails...');
  
  const result: RepairResult = {
    success: true,
    fixed: 0,
    errors: [],
    details: []
  };

  try {
    // Récupérer les notifications avec emails non envoyés
    const { data: pendingNotifications, error: fetchError } = await supabase
      .from('gm_notifications')
      .select(`
        id,
        gm_id,
        notification_type,
        title,
        message,
        event_data,
        created_at
      `)
      .eq('email_sent', false)
      .not('gm_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50); // Limiter pour éviter les surcharges

    if (fetchError) {
      result.errors.push(`Erreur récupération notifications: ${fetchError.message}`);
      result.success = false;
      return result;
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      console.log('ℹ️ [EMAIL-RESEND] Aucune notification en attente');
      return result;
    }

    console.log(`📧 [EMAIL-RESEND] ${pendingNotifications.length} notifications à traiter`);

    // Pour chaque notification, récupérer les infos GM et tenter l'envoi
    for (const notification of pendingNotifications) {
      try {
        // Récupérer les infos du GM
        const { data: gmProfile, error: gmError } = await supabase
          .from('profiles')
          .select('email')
          .eq('gm_id', notification.gm_id)
          .eq('role', 'gm')
          .single();

        if (gmError || !gmProfile?.email) {
          result.errors.push(`GM introuvable pour notification ${notification.id}`);
          continue;
        }

        // Récupérer le nom du GM
        const { data: gmData } = await supabase
          .from('game_masters')
          .select('name')
          .eq('id', notification.gm_id)
          .single();

        // Préparer les données pour l'envoi d'email
        const emailData = {
          gmEmail: gmProfile.email,
          gmName: gmData?.name || 'Game Master',
          eventTitle: (notification.event_data as any)?.title || notification.title,
          eventDate: (notification.event_data as any)?.date || new Date().toISOString().split('T')[0],
          eventTime: ((notification.event_data as any)?.start_time || '14:00') + ' - ' + ((notification.event_data as any)?.end_time || '16:00'),
          eventDescription: (notification.event_data as any)?.description || notification.message,
          assignmentType: notification.notification_type === 'assignment' ? 'new' : 
                         notification.notification_type === 'modified' ? 'modified' :
                         notification.notification_type === 'cancelled' ? 'cancelled' : 'unassigned'
        };

        // Tenter l'envoi d'email
        const { error: emailError } = await supabase.functions.invoke('send-assignment-notification', {
          body: emailData
        });

        if (emailError) {
          result.errors.push(`Erreur envoi email pour ${notification.id}: ${emailError.message}`);
        } else {
          // Marquer comme envoyé
          await supabase
            .from('gm_notifications')
            .update({ 
              email_sent: true, 
              email_sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', notification.id);

          result.fixed++;
          console.log(`✅ [EMAIL-RESEND] Email envoyé pour notification ${notification.id}`);
        }

        // Petite pause pour éviter la surcharge
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        result.errors.push(`Erreur traitement notification ${notification.id}: ${error}`);
      }
    }

    if (result.errors.length > 0) {
      result.success = false;
    }

    console.log(`✅ [EMAIL-RESEND] Renvoi terminé: ${result.fixed} emails envoyés, ${result.errors.length} erreurs`);
    return result;

  } catch (error) {
    console.error('❌ [EMAIL-RESEND] Erreur:', error);
    result.success = false;
    result.errors.push(`Erreur inattendue: ${error}`);
    return result;
  }
};

/**
 * Test complet du système d'email avec un événement fictif
 */
export const testEmailSystem = async (testEmail: string): Promise<RepairResult> => {
  console.log('🧪 [EMAIL-TEST] Test complet du système d\'email...');
  
  const result: RepairResult = {
    success: true,
    fixed: 0,
    errors: [],
    details: []
  };

  try {
    // Test 1: Vérifier la fonction SMTP
    const { data: smtpTest, error: smtpError } = await supabase.functions.invoke('test-smtp-config', {
      body: { test: true }
    });

    result.details.push({
      type: 'smtp_test',
      success: !smtpError,
      data: smtpTest,
      error: smtpError?.message
    });

    // Test 2: Envoyer un email de test
    const { data: emailTest, error: emailError } = await supabase.functions.invoke('send-assignment-notification', {
      body: {
        gmEmail: testEmail,
        gmName: 'Test User',
        eventTitle: 'Test Email System',
        eventDate: new Date().toISOString().split('T')[0],
        eventTime: '14:00 - 16:00',
        eventDescription: 'Test automatique du système d\'envoi d\'emails',
        assignmentType: 'new'
      }
    });

    result.details.push({
      type: 'email_test',
      success: !emailError,
      data: emailTest,
      error: emailError?.message
    });

    // Test 3: Créer une notification test
    const { data: notifTest, error: notifError } = await supabase.functions.invoke('create-unified-notification', {
      body: {
        gmId: '00000000-0000-0000-0000-000000000000', // GM fictif
        notificationType: 'assignment',
        title: 'Test Notification System',
        message: 'Test automatique du système de notifications',
        eventData: {
          title: 'Test Event',
          date: new Date().toISOString().split('T')[0],
          start_time: '14:00',
          end_time: '16:00'
        }
      }
    });

    result.details.push({
      type: 'notification_test',
      success: !notifError,
      data: notifTest,
      error: notifError?.message
    });

    // Compiler les résultats
    const successfulTests = result.details.filter(d => d.success).length;
    result.fixed = successfulTests;
    
    if (result.details.some(d => !d.success)) {
      result.success = false;
      result.errors = result.details
        .filter(d => !d.success && d.error)
        .map(d => `${d.type}: ${d.error}`);
    }

    console.log(`✅ [EMAIL-TEST] Tests terminés: ${successfulTests}/${result.details.length} réussis`);
    return result;

  } catch (error) {
    console.error('❌ [EMAIL-TEST] Erreur:', error);
    result.success = false;
    result.errors.push(`Erreur inattendue: ${error}`);
    return result;
  }
};