
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

interface AdminUnassignedNotificationRequest {
  adminEmail: string;
  unassignedEvents: any[];
}

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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { adminEmail, unassignedEvents }: AdminUnassignedNotificationRequest = await req.json();

    console.log(`📧 Sending admin unassigned notification to ${adminEmail} for ${unassignedEvents.length} events`);

    if (!unassignedEvents || unassignedEvents.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No unassigned events to notify about' 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

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

    const eventsHtml = unassignedEvents.map(event => `
      <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 10px 0; border-left: 4px solid #f59e0b;">
        <h4 style="color: #d97706; margin: 0 0 8px 0; font-size: 16px;">${event.title}</h4>
        <div style="color: #92400e; font-size: 14px;">
          <p style="margin: 3px 0;"><strong>📅 Date :</strong> ${formatDate(event.date)}</p>
          <p style="margin: 3px 0;"><strong>⏰ Heure :</strong> ${formatTime(event.start_time)} - ${formatTime(event.end_time)}</p>
          ${event.description ? `<p style="margin: 3px 0;"><strong>📝 Description :</strong> ${event.description}</p>` : ''}
        </div>
      </div>
    `).join('');

    const subject = `🚨 Alerte Admin - ${unassignedEvents.length} événement(s) non assigné(s)`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🚨 Alerte Admin</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Événements non assignés détectés</p>
        </div>
        <div style="background: white; padding: 30px; border: 1px solid #e1e5e9; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333; margin-top: 0;">Attention !</h2>
          <p style="color: #666; line-height: 1.6;">
            ${unassignedEvents.length} événement(s) n'ont pas pu être assigné(s) automatiquement :
          </p>
          
          <div style="margin: 20px 0;">
            ${eventsHtml}
          </div>

          <div style="background: #fee2e2; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <h4 style="color: #dc2626; margin: 0 0 8px 0;">Actions recommandées :</h4>
            <ul style="color: #991b1b; margin: 0; padding-left: 20px;">
              <li style="margin: 5px 0;">Vérifier la disponibilité des Game Masters</li>
              <li style="margin: 5px 0;">Assigner manuellement ces événements</li>
              <li style="margin: 5px 0;">Contacter les GM disponibles si nécessaire</li>
              <li style="margin: 5px 0;">Considérer l'ajout de nouveaux créneaux de disponibilité</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${Deno.env.get('SUPABASE_URL')?.replace('https://dnxyidnkmtrmkxucqrry.supabase.co', 'https://game-master-scheduler-sync.lovable.app') || 'https://game-master-scheduler-sync.lovable.app'}/admin" 
               style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;
                      display: inline-block; box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);">
              🎛️ Accéder au Panel Admin
            </a>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
            Notification automatique du système de gestion d'événements<br>
            <strong>Génie Culturel</strong>
          </div>
        </div>
      </div>
    `;

    const emailResponse = await sendEmailWithSmtp(adminEmail, subject, html);

    console.log(`✅ Admin unassigned notification sent successfully to ${adminEmail}`);

    return new Response(JSON.stringify({ 
      success: true, 
      eventsCount: unassignedEvents.length
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("❌ Error sending admin unassigned notification:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erreur lors de l'envoi de l'alerte admin" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
