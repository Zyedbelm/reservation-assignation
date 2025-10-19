
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface UnifiedNotificationRequest {
  gmId: string;
  gmEmail?: string;
  gmName?: string;
  notificationType: 'assignment' | 'modified' | 'cancelled' | 'unassigned';
  eventId?: string;
  title: string;
  message: string;
  eventData: any;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const requestData: UnifiedNotificationRequest = await req.json();
    const { 
      gmId, 
      gmEmail, 
      gmName, 
      notificationType, 
      eventId, 
      title, 
      message, 
      eventData 
    } = requestData;

    console.log(`🔄 [UNIFIED-NOTIFICATION] Traitement notification ${notificationType} pour GM ${gmId}`);
    console.log(`📧 [UNIFIED-NOTIFICATION] Email: ${gmEmail || 'Non fourni'}`);
    console.log(`📧 [UNIFIED-NOTIFICATION] Nom: ${gmName || 'Non fourni'}`);

    const result = {
      success: false,
      notificationId: null as string | null,
      emailSent: false,
      errors: [] as any[]
    };

    // 1. Créer la notification
    console.log(`📝 [UNIFIED-NOTIFICATION] Création notification...`);
    
    const { data: notificationData, error: notificationError } = await supabase
      .from('gm_notifications')
      .insert({
        gm_id: gmId,
        event_id: eventId,
        notification_type: notificationType,
        title: title,
        message: message,
        event_data: eventData,
        is_read: false,
        email_sent: false
      })
      .select()
      .single();

    if (notificationError) {
      console.error(`❌ [UNIFIED-NOTIFICATION] Erreur création notification:`, notificationError);
      result.errors.push({ type: 'notification_creation', error: notificationError });
    } else {
      result.success = true;
      result.notificationId = notificationData.id;
      console.log(`✅ [UNIFIED-NOTIFICATION] Notification créée: ${notificationData.id}`);
    }

    // 2. Envoyer l'email si possible
    if (result.success && gmEmail && gmName) {
      console.log(`📤 [UNIFIED-NOTIFICATION] Envoi email à ${gmEmail}...`);
      
      try {
        const emailData = {
          gmEmail: gmEmail,
          gmName: gmName,
          eventTitle: eventData?.title || 'Événement',
          eventDate: eventData?.date || new Date().toISOString().split('T')[0],
          eventTime: eventData?.start_time ? `${eventData.start_time} - ${eventData.end_time || ''}` : '00:00',
          eventDescription: eventData?.description || message,
          assignmentType: notificationType === 'assignment' ? 'new' : 
                          notificationType === 'modified' ? 'modified' : 
                          notificationType === 'cancelled' ? 'cancelled' : 'unassigned'
        };

        const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-assignment-notification', {
          body: emailData
        });

        if (emailError) {
          console.error(`❌ [UNIFIED-NOTIFICATION] Erreur envoi email:`, emailError);
          result.errors.push({ type: 'email_send', error: emailError });
        } else {
          result.emailSent = true;
          console.log(`✅ [UNIFIED-NOTIFICATION] Email envoyé avec succès`);
          
          // Mettre à jour le statut email de la notification
          if (result.notificationId) {
            const { error: updateError } = await supabase
              .from('gm_notifications')
              .update({ 
                email_sent: true, 
                email_sent_at: new Date().toISOString() 
              })
              .eq('id', result.notificationId);

            if (updateError) {
              console.warn(`⚠️ [UNIFIED-NOTIFICATION] Erreur MAJ statut email:`, updateError);
            }
          }
        }
      } catch (emailException) {
        console.error(`❌ [UNIFIED-NOTIFICATION] Exception email:`, emailException);
        result.errors.push({ type: 'email_exception', error: emailException });
      }
    } else if (!gmEmail || !gmName) {
      console.log(`⏭️ [UNIFIED-NOTIFICATION] Données email manquantes - skip envoi`);
    }

    console.log(`🎯 [UNIFIED-NOTIFICATION] Résultat final:`, {
      success: result.success,
      notificationId: result.notificationId,
      emailSent: result.emailSent,
      errorsCount: result.errors.length
    });

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 207, // 207 = Multi-Status (partial success)
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error: any) {
    console.error("❌ [UNIFIED-NOTIFICATION] Erreur inattendue:", error);
    
    return new Response(JSON.stringify({
      success: false,
      notificationId: null,
      emailSent: false,
      errors: [{ type: 'unexpected', error: error.message }]
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};

serve(handler);
