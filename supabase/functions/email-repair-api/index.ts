import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface RepairResult {
  success: boolean;
  fixed: number;
  errors: string[];
  details: any[];
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    console.log(`🔧 [EMAIL-REPAIR-API] Action: ${action}`);

    switch (action) {
      case 'check-gm-consistency':
        return await handleGMConsistencyCheck();
      
      case 'repair-gm-data':
        return await handleGMDataRepair();
      
      case 'resend-failed-emails':
        return await handleResendFailedEmails();
      
      default:
        return new Response(
          JSON.stringify({ error: 'Action non supportée' }),
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
    }

  } catch (error) {
    console.error('❌ [EMAIL-REPAIR-API] Erreur:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
};

async function handleGMConsistencyCheck(): Promise<Response> {
  console.log('🔍 [GM-CHECK] Vérification cohérence données GM...');

  const result: RepairResult = {
    success: true,
    fixed: 0,
    errors: [],
    details: []
  };

  try {
    // 1. Notifications orphelines
    const { data: orphanedNotifications, error: notifError } = await supabase
      .from('gm_notifications')
      .select('id, gm_id, title, notification_type, email_sent, created_at')
      .not('gm_id', 'in', `(SELECT gm_id FROM profiles WHERE gm_id IS NOT NULL)`);

    if (notifError) {
      result.errors.push(`Erreur notifications: ${notifError.message}`);
    }

    // 2. Profiles sans email
    const { data: profilesWithoutEmail, error: profileError } = await supabase
      .from('profiles')
      .select('id, gm_id, email, role')
      .eq('role', 'gm')
      .or('email.is.null,email.eq.');

    if (profileError) {
      result.errors.push(`Erreur profiles: ${profileError.message}`);
    }

    // 3. GM sans profile
    const { data: gmWithoutProfile, error: gmError } = await supabase
      .from('game_masters')
      .select('id, name, email')
      .not('id', 'in', `(SELECT gm_id FROM profiles WHERE gm_id IS NOT NULL)`);

    if (gmError) {
      result.errors.push(`Erreur game_masters: ${gmError.message}`);
    }

    // 4. Notifications non envoyées
    const { data: pendingEmails, error: pendingError } = await supabase
      .from('gm_notifications')
      .select('id, gm_id, notification_type, email_sent')
      .eq('email_sent', false);

    if (pendingError) {
      result.errors.push(`Erreur pending emails: ${pendingError.message}`);
    }

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
      },
      {
        type: 'pending_emails',
        count: pendingEmails?.length || 0,
        items: pendingEmails || []
      }
    ];

    // Déterminer si des problèmes existent
    const totalIssues = (orphanedNotifications?.length || 0) + 
                       (profilesWithoutEmail?.length || 0) + 
                       (gmWithoutProfile?.length || 0);

    if (totalIssues > 0 || result.errors.length > 0) {
      result.success = false;
    }

    console.log(`✅ [GM-CHECK] Vérification terminée: ${totalIssues} problèmes détectés`);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );

  } catch (error) {
    console.error('❌ [GM-CHECK] Erreur:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        errors: [`Erreur inattendue: ${error instanceof Error ? error.message : 'Unknown error'}`],
        details: []
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
}

async function handleGMDataRepair(): Promise<Response> {
  console.log('🔧 [GM-REPAIR] Réparation données GM...');

  const result: RepairResult = {
    success: true,
    fixed: 0,
    errors: [],
    details: []
  };

  try {
    let fixCount = 0;

    // 1. Réparer profiles sans email
    const { data: profilesWithoutEmail } = await supabase
      .from('profiles')
      .select('id, gm_id, email, role')
      .eq('role', 'gm')
      .or('email.is.null,email.eq.');

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
              console.log(`✅ Email ajouté pour profile ${profile.id}`);
            } else {
              result.errors.push(`Erreur update profile ${profile.id}: ${updateError.message}`);
            }
          }
        }
      }
    }

    // 2. Créer profiles manquants
    const { data: gmWithoutProfile } = await supabase
      .from('game_masters')
      .select('id, name, email')
      .not('id', 'in', `(SELECT gm_id FROM profiles WHERE gm_id IS NOT NULL)`);

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
            console.log(`✅ Profile créé pour GM ${gm.name}`);
          } else {
            result.errors.push(`Erreur creation profile GM ${gm.id}: ${insertError.message}`);
          }
        }
      }
    }

    result.fixed = fixCount;
    
    if (result.errors.length > 0) {
      result.success = false;
    }

    console.log(`✅ [GM-REPAIR] Réparation terminée: ${fixCount} corrections`);

    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );

  } catch (error) {
    console.error('❌ [GM-REPAIR] Erreur:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        errors: [`Erreur inattendue: ${error instanceof Error ? error.message : 'Unknown error'}`],
        fixed: 0,
        details: []
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
}

async function handleResendFailedEmails(): Promise<Response> {
  console.log('📧 [EMAIL-RESEND] Renvoi emails en attente...');

  const result: RepairResult = {
    success: true,
    fixed: 0,
    errors: [],
    details: []
  };

  try {
    // Récupérer notifications non envoyées
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
      .limit(20); // Limiter pour éviter surcharge

    if (fetchError) {
      result.errors.push(`Erreur fetch notifications: ${fetchError.message}`);
      result.success = false;
      return new Response(
        JSON.stringify(result),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (!pendingNotifications || pendingNotifications.length === 0) {
      console.log('ℹ️ Aucune notification en attente');
      return new Response(
        JSON.stringify({ ...result, message: 'Aucune notification en attente' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`📧 Traitement de ${pendingNotifications.length} notifications`);

    let successCount = 0;

    for (const notification of pendingNotifications) {
      try {
        // Récupérer infos GM
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

        const { data: gmData } = await supabase
          .from('game_masters')
          .select('name')
          .eq('id', notification.gm_id)
          .single();

        // Préparer données email
        const eventData = notification.event_data as any;
        const emailPayload = {
          gmEmail: gmProfile.email,
          gmName: gmData?.name || 'Game Master',
          eventTitle: eventData?.title || notification.title,
          eventDate: eventData?.date || new Date().toISOString().split('T')[0],
          eventTime: `${eventData?.start_time || '14:00'} - ${eventData?.end_time || '16:00'}`,
          eventDescription: eventData?.description || notification.message,
          assignmentType: notification.notification_type === 'assignment' ? 'new' : 
                         notification.notification_type === 'modified' ? 'modified' :
                         notification.notification_type === 'cancelled' ? 'cancelled' : 'unassigned'
        };

        // Envoyer email
        const { error: emailError } = await supabase.functions.invoke('send-assignment-notification', {
          body: emailPayload
        });

        if (emailError) {
          result.errors.push(`Email failed ${notification.id}: ${emailError.message}`);
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

          successCount++;
          console.log(`✅ Email envoyé pour notification ${notification.id}`);
        }

        // Pause pour éviter surcharge
        await new Promise(resolve => setTimeout(resolve, 300));

      } catch (error) {
        result.errors.push(`Erreur notification ${notification.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    result.fixed = successCount;
    
    if (result.errors.length > 0) {
      result.success = false;
    }

    console.log(`✅ [EMAIL-RESEND] Terminé: ${successCount} emails envoyés`);

    return new Response(
      JSON.stringify({ ...result, sent: successCount }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );

  } catch (error) {
    console.error('❌ [EMAIL-RESEND] Erreur:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        errors: [`Erreur inattendue: ${error instanceof Error ? error.message : 'Unknown error'}`],
        fixed: 0,
        details: []
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
}

serve(handler);