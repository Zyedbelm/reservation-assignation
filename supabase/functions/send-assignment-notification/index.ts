
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

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface AssignmentNotificationRequest {
  gmEmail: string;
  gmName: string;
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventDescription?: string;
  assignmentType: 'new' | 'modified' | 'cancelled' | 'unassigned';
}

// Fonction pour envoyer l'email via SMTP avec retry
async function sendEmailWithRetry(to: string, subject: string, html: string, maxRetries = 2): Promise<void> {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📧 [SMTP] Tentative ${attempt}/${maxRetries} d'envoi vers: ${to}`);
      
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
      console.log(`✅ [SMTP] Email envoyé avec succès à: ${to} (tentative ${attempt})`);
      return; // Succès, sortir de la fonction
      
    } catch (error) {
      lastError = error;
      console.error(`❌ [SMTP] Erreur tentative ${attempt}:`, error);
      
      if (attempt === maxRetries) {
        throw lastError; // Dernière tentative, relancer l'erreur
      }
      
      // Attendre avant la prochaine tentative
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: AssignmentNotificationRequest = await req.json();
    const { 
      gmEmail, 
      gmName, 
      eventTitle, 
      eventDate, 
      eventTime, 
      eventDescription,
      assignmentType 
    } = requestData;

    console.log(`📧 [SEND-ASSIGNMENT-NOTIFICATION] Démarrage envoi ${assignmentType} vers ${gmEmail}`);
    console.log(`📧 [SEND-ASSIGNMENT-NOTIFICATION] GM: ${gmName}`);
    console.log(`📧 [SEND-ASSIGNMENT-NOTIFICATION] Événement: ${eventTitle} le ${eventDate} à ${eventTime}`);
    console.log(`📧 [SEND-ASSIGNMENT-NOTIFICATION] Configuration SMTP:`);
    console.log(`   - Host: ${smtpConfig.hostname}`);
    console.log(`   - Port: ${smtpConfig.port}`);
    console.log(`   - User: ${smtpConfig.username}`);
    console.log(`   - From: ${smtpConfig.from}`);
    console.log(`   - TLS: ${smtpConfig.tls}`);

    // Validation des données obligatoires
    if (!gmEmail || !gmName || !eventTitle || !eventDate || !assignmentType) {
      throw new Error("Données obligatoires manquantes: gmEmail, gmName, eventTitle, eventDate, assignmentType");
    }

    // Vérification de la configuration SMTP
    if (!smtpConfig.hostname || !smtpConfig.username || !smtpConfig.password) {
      throw new Error("Configuration SMTP incomplète. Vérifiez SMTP_HOST, SMTP_USER et SMTP_PASS");
    }

    const getSubjectAndContent = () => {
      const formattedDate = new Date(eventDate).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      switch (assignmentType) {
        case 'new':
          return {
            subject: `Nouvelle assignation - ${eventTitle}`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <title>Nouvelle assignation</title>
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #2563eb;">Nouvelle assignation d'événement</h2>
                <p>Bonjour ${gmName},</p>
                <p>Vous avez été assigné(e) au nouvel événement suivant :</p>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #2563eb; margin: 0 0 10px 0;">${eventTitle}</h3>
                  <p><strong>Date :</strong> ${formattedDate}</p>
                  <p><strong>Heure :</strong> ${eventTime}</p>
                  ${eventDescription ? `<p><strong>Description :</strong> ${eventDescription}</p>` : ''}
                </div>
                <p>Merci de confirmer votre présence et de vous préparer pour cet événement.</p>
                <p>Cordialement,<br>L'équipe de gestion des événements</p>
              </body>
              </html>
            `
          };
        case 'unassigned':
          return {
            subject: `Désassignation automatique - ${eventTitle}`,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <title>Désassignation automatique</title>
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #d97706;">Désassignation automatique</h2>
                <p>Bonjour ${gmName},</p>
                <p>Vous avez été automatiquement désassigné(e) de l'événement suivant :</p>
                <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                  <h3 style="color: #d97706; margin: 0 0 10px 0;">${eventTitle}</h3>
                  <p><strong>Date :</strong> ${formattedDate}</p>
                  <p><strong>Heure :</strong> ${eventTime}</p>
                  ${eventDescription ? `<p><strong>Raison :</strong> ${eventDescription}</p>` : ''}
                </div>
                <p>Cette désassignation a été effectuée automatiquement par le système d'audit. Vous pouvez libérer ce créneau dans votre planning.</p>
                <p>Cordialement,<br>L'équipe de gestion des événements</p>
              </body>
              </html>
            `
          };
        default:
          throw new Error(`Type d'assignation non supporté: ${assignmentType}`);
      }
    };

    const { subject, html } = getSubjectAndContent();

    console.log(`📧 [SEND-ASSIGNMENT-NOTIFICATION] Sujet: ${subject}`);
    console.log(`📧 [SEND-ASSIGNMENT-NOTIFICATION] Tentative d'envoi email...`);

    // Envoi de l'email avec retry
    await sendEmailWithRetry(gmEmail, subject, html);

    console.log(`✅ [SEND-ASSIGNMENT-NOTIFICATION] Email ${assignmentType} envoyé avec succès à ${gmEmail}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: `Email envoyé avec succès à ${gmEmail}`,
      details: {
        to: gmEmail,
        subject: subject,
        assignmentType: assignmentType
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("❌ [SEND-ASSIGNMENT-NOTIFICATION] Erreur détaillée:", error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || "Erreur lors de l'envoi de l'email",
        details: {
          name: error.name,
          stack: error.stack,
          smtpConfig: {
            host: smtpConfig.hostname,
            port: smtpConfig.port,
            user: smtpConfig.username,
            from: smtpConfig.from
          }
        }
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
