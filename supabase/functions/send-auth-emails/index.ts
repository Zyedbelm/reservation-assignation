
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

interface AuthEmailRequest {
  to: string;
  type: 'signup' | 'recovery' | 'invite' | 'magic_link' | 'email_change';
  token?: string;
  email_action_type?: string;
  redirect_to?: string;
  site_url?: string;
  new_email?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, type, token, email_action_type, redirect_to, site_url, new_email }: AuthEmailRequest = await req.json();

    console.log(`📧 Sending ${type} email to ${to}`);
    console.log(`🔗 Redirect URL: ${redirect_to}`);
    console.log(`🌐 Site URL: ${site_url}`);
    console.log(`🎫 Token: ${token ? 'Present' : 'Missing'}`);

    const getEmailContent = () => {
      const baseUrl = site_url || Deno.env.get("SUPABASE_URL");
      
      switch (type) {
        case 'signup':
          const confirmUrl = `${baseUrl}/auth/v1/verify?token=${token}&type=signup&redirect_to=${encodeURIComponent(redirect_to || '')}`;
          return {
            subject: "Confirmez votre inscription - VR Center GM",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; font-size: 28px;">Bienvenue !</h1>
                  <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">VR Center - Gestion des Game Masters</p>
                </div>
                <div style="background: white; padding: 30px; border: 1px solid #e1e5e9; border-top: none; border-radius: 0 0 8px 8px;">
                  <h2 style="color: #333; margin-top: 0;">Confirmez votre inscription</h2>
                  <p style="color: #666; line-height: 1.6;">
                    Merci de vous être inscrit(e) sur notre plateforme de gestion des Game Masters.
                    Pour activer votre compte, veuillez cliquer sur le bouton ci-dessous :
                  </p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${confirmUrl}" 
                       style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; 
                              text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;
                              display: inline-block; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                      ✓ Confirmer mon inscription
                    </a>
                  </div>
                  <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 14px; color: #666;">
                      <strong>Lien alternatif :</strong><br>
                      Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
                    </p>
                    <p style="word-break: break-all; color: #667eea; font-size: 12px; margin: 10px 0 0 0;">${confirmUrl}</p>
                  </div>
                  <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
                    Ce lien expirera dans 24 heures. Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.
                  </p>
                </div>
              </div>
            `
          };

        case 'recovery':
          const resetUrl = `${baseUrl}/auth/v1/verify?token=${token}&type=recovery&redirect_to=${encodeURIComponent(redirect_to || '')}`;
          console.log(`🔑 Generated reset URL: ${resetUrl}`);
          return {
            subject: "Réinitialisation de votre mot de passe - VR Center GM",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; font-size: 28px;">🔐 Réinitialisation</h1>
                  <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">VR Center - Mot de passe oublié</p>
                </div>
                <div style="background: white; padding: 30px; border: 1px solid #e1e5e9; border-top: none; border-radius: 0 0 8px 8px;">
                  <h2 style="color: #333; margin-top: 0;">Créer un nouveau mot de passe</h2>
                  <p style="color: #666; line-height: 1.6;">
                    Vous avez demandé la réinitialisation de votre mot de passe pour votre compte VR Center GM.
                    Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :
                  </p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" 
                       style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 15px 30px; 
                              text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;
                              display: inline-block; box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);">
                      🔑 Réinitialiser mon mot de passe
                    </a>
                  </div>
                  <div style="background: #fef2f2; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #dc2626;">
                    <p style="margin: 0; font-size: 14px; color: #666;">
                      <strong>Important :</strong> Ce lien vous redirigera vers une page sécurisée où vous pourrez définir votre nouveau mot de passe.
                    </p>
                    <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">
                      La page s'ouvrira automatiquement avec le formulaire de réinitialisation.
                    </p>
                  </div>
                  <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
                    Ce lien expirera dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email.
                  </p>
                </div>
              </div>
            `
          };

        case 'magic_link':
          const magicUrl = `${baseUrl}/auth/v1/verify?token=${token}&type=magiclink&redirect_to=${encodeURIComponent(redirect_to || '')}`;
          return {
            subject: "Votre lien de connexion magique - VR Center GM",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; font-size: 28px;">✨ Connexion Magique</h1>
                  <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">VR Center - Connexion sans mot de passe</p>
                </div>
                <div style="background: white; padding: 30px; border: 1px solid #e1e5e9; border-top: none; border-radius: 0 0 8px 8px;">
                  <h2 style="color: #333; margin-top: 0;">Se connecter en un clic</h2>
                  <p style="color: #666; line-height: 1.6;">
                    Cliquez sur le lien ci-dessous pour vous connecter instantanément à votre compte VR Center GM :
                  </p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${magicUrl}" 
                       style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); color: white; padding: 15px 30px; 
                              text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;
                              display: inline-block; box-shadow: 0 4px 15px rgba(124, 58, 237, 0.3);">
                      🚀 Se connecter
                    </a>
                  </div>
                  <div style="background: #faf5ff; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #7c3aed;">
                    <p style="margin: 0; font-size: 14px; color: #666;">
                      <strong>Lien alternatif :</strong><br>
                      Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
                    </p>
                    <p style="word-break: break-all; color: #7c3aed; font-size: 12px; margin: 10px 0 0 0;">${magicUrl}</p>
                  </div>
                  <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
                    Ce lien expirera dans 1 heure. Si vous n'avez pas demandé cette connexion, vous pouvez ignorer cet email.
                  </p>
                </div>
              </div>
            `
          };

        case 'email_change':
          const changeUrl = `${baseUrl}/auth/v1/verify?token=${token}&type=email_change&redirect_to=${encodeURIComponent(redirect_to || '')}`;
          return {
            subject: "Confirmez votre nouvelle adresse email - VR Center GM",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; font-size: 28px;">📧 Changement d'Email</h1>
                  <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">VR Center - Confirmation requise</p>
                </div>
                <div style="background: white; padding: 30px; border: 1px solid #e1e5e9; border-top: none; border-radius: 0 0 8px 8px;">
                  <h2 style="color: #333; margin-top: 0;">Confirmez votre nouvelle adresse</h2>
                  <p style="color: #666; line-height: 1.6;">
                    Vous avez demandé à changer votre adresse email vers : <strong>${new_email || to}</strong>
                  </p>
                  <p style="color: #666; line-height: 1.6;">
                    Cliquez sur le lien ci-dessous pour confirmer ce changement :
                  </p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${changeUrl}" 
                       style="background: linear-gradient(135deg, #059669 0%, #047857 100%); color: white; padding: 15px 30px; 
                              text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;
                              display: inline-block; box-shadow: 0 4px 15px rgba(5, 150, 105, 0.3);">
                      ✉️ Confirmer le changement
                    </a>
                  </div>
                  <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
                    Ce lien expirera dans 24 heures. Si vous n'avez pas demandé ce changement, vous pouvez ignorer cet email.
                  </p>
                </div>
              </div>
            `
          };

        default:
          throw new Error(`Type d'email non supporté: ${type}`);
      }
    };

    const { subject, html } = getEmailContent();

    console.log(`📧 Sending ${type} email to ${to}`);
    
    await sendEmailWithSmtp(to, subject, html);

    console.log(`✅ ${type} email sent successfully to ${to}`);

    return new Response(JSON.stringify({ 
      success: true
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error(`❌ Error sending auth email:`, error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erreur lors de l'envoi de l'email" 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
