
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';
import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Configuration SMTP depuis les variables d'environnement
const smtpConfig = {
  hostname: Deno.env.get("SMTP_HOST")!,
  port: parseInt(Deno.env.get("SMTP_PORT") || "465"),
  username: Deno.env.get("SMTP_USER")!,
  password: Deno.env.get("SMTP_PASS")!,
  tls: Deno.env.get("SMTP_TLS") === "true" || true,
  from: Deno.env.get("SMTP_FROM") || "noreply@genieculturel.ch",
};

// Fonction pour envoyer l'email via SMTP
async function sendEmailWithSmtp(to: string, subject: string, html: string): Promise<void> {
  try {
    console.log(`📧 [SMTP] Envoi vers: ${to}`);
    
    const client = new SmtpClient();
    
    await client.connect({
      hostname: smtpConfig.hostname,
      port: smtpConfig.port,
      username: smtpConfig.username,
      password: smtpConfig.password,
    });

    await client.send({
      from: smtpConfig.from,
      to: to,
      subject: subject,
      content: html,
      html: html,
    });

    await client.close();
    console.log(`✅ [SMTP] Email envoyé avec succès à: ${to}`);
    
  } catch (error) {
    console.error(`❌ [SMTP] Erreur:`, error);
    throw error;
  }
}

interface EventChangeNotificationRequest {
  gmEmail: string;
  gmName: string;
  changeType: 'modified' | 'cancelled';
  originalEvent: any;
  updatedEvent?: any;
  changes?: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      gmEmail, 
      gmName, 
      changeType, 
      originalEvent, 
      updatedEvent,
      changes = []
    }: EventChangeNotificationRequest = await req.json();

    console.log(`📧 Sending ${changeType} notification to ${gmEmail}`);

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    };

    const formatTime = (timeString: string) => {
      return timeString.substring(0, 5);
    };

    const getEmailContent = () => {
      const eventDate = formatDate(originalEvent.date);
      const eventTime = `${formatTime(originalEvent.start_time)} - ${formatTime(originalEvent.end_time)}`;
      
      switch (changeType) {
        case 'modified':
          return {
            subject: `🔄 Modification d'événement - ${originalEvent.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; font-size: 28px;">🔄 Événement Modifié</h1>
                  <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Votre assignation a été mise à jour</p>
                </div>
                <div style="background: white; padding: 30px; border: 1px solid #e1e5e9; border-top: none; border-radius: 0 0 8px 8px;">
                  <h2 style="color: #333; margin-top: 0;">Bonjour ${gmName},</h2>
                  <p style="color: #666; line-height: 1.6;">
                    L'événement suivant auquel vous êtes assigné(e) a été modifié :
                  </p>
                  
                  <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                    <h3 style="color: #d97706; margin: 0 0 15px 0; font-size: 20px;">${originalEvent.title}</h3>
                    <div style="color: #92400e;">
                      <p style="margin: 5px 0;"><strong>📅 Date :</strong> ${eventDate}</p>
                      <p style="margin: 5px 0;"><strong>⏰ Heure :</strong> ${eventTime}</p>
                      ${originalEvent.description ? `<p style="margin: 5px 0;"><strong>📝 Description :</strong> ${originalEvent.description}</p>` : ''}
                    </div>
                  </div>

                  ${changes.length > 0 ? `
                    <div style="background: #fff7ed; padding: 15px; border-radius: 6px; margin: 20px 0;">
                      <h4 style="color: #d97706; margin: 0 0 10px 0;">Modifications apportées :</h4>
                      <ul style="color: #92400e; margin: 0; padding-left: 20px;">
                        ${changes.map(change => `<li style="margin: 5px 0;">${change}</li>`).join('')}
                      </ul>
                    </div>
                  ` : ''}

                  <p style="color: #666; line-height: 1.6; margin-top: 20px;">
                    Veuillez prendre note de ces modifications et ajuster votre planning en conséquence.
                  </p>
                  
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
                    Cordialement,<br>
                    <strong>L'équipe Génie Culturel</strong>
                  </div>
                </div>
              </div>
            `
          };

        case 'cancelled':
          return {
            subject: `❌ Annulation d'événement - ${originalEvent.title}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; font-size: 28px;">❌ Événement Annulé</h1>
                  <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Votre assignation a été annulée</p>
                </div>
                <div style="background: white; padding: 30px; border: 1px solid #e1e5e9; border-top: none; border-radius: 0 0 8px 8px;">
                  <h2 style="color: #333; margin-top: 0;">Bonjour ${gmName},</h2>
                  <p style="color: #666; line-height: 1.6;">
                    L'événement suivant auquel vous étiez assigné(e) a été annulé :
                  </p>
                  
                  <div style="background: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
                    <h3 style="color: #dc2626; margin: 0 0 15px 0; font-size: 20px;">${originalEvent.title}</h3>
                    <div style="color: #991b1b;">
                      <p style="margin: 5px 0;"><strong>📅 Date :</strong> ${eventDate}</p>
                      <p style="margin: 5px 0;"><strong>⏰ Heure :</strong> ${eventTime}</p>
                    </div>
                  </div>

                  <p style="color: #666; line-height: 1.6;">
                    Vous pouvez donc libérer ce créneau dans votre planning.
                  </p>
                  
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
                    Cordialement,<br>
                    <strong>L'équipe Génie Culturel</strong>
                  </div>
                </div>
              </div>
            `
          };

        default:
          throw new Error(`Type de changement non supporté: ${changeType}`);
      }
    };

    const { subject, html } = getEmailContent();

    await sendEmailWithSmtp(gmEmail, subject, html);

    console.log(`✅ ${changeType} notification sent successfully to ${gmEmail}`);

    return new Response(JSON.stringify({ 
      success: true
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("❌ Error sending event change notification:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erreur lors de l'envoi de l'email de changement" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
