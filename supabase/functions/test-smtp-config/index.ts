
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🧪 [TEST-SMTP-CONFIG] Vérification de la configuration SMTP...');

    // Vérifier les variables d'environnement SMTP
    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = Deno.env.get("SMTP_PORT");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPass = Deno.env.get("SMTP_PASS");
    const smtpTls = Deno.env.get("SMTP_TLS");
    const smtpFrom = Deno.env.get("SMTP_FROM");

    console.log(`📧 [TEST-SMTP-CONFIG] SMTP_HOST: ${smtpHost ? '✅ Configuré' : '❌ Manquant'}`);
    console.log(`📧 [TEST-SMTP-CONFIG] SMTP_PORT: ${smtpPort ? '✅ Configuré' : '❌ Manquant'}`);
    console.log(`📧 [TEST-SMTP-CONFIG] SMTP_USER: ${smtpUser ? '✅ Configuré' : '❌ Manquant'}`);
    console.log(`📧 [TEST-SMTP-CONFIG] SMTP_PASS: ${smtpPass ? '✅ Configuré' : '❌ Manquant'}`);
    console.log(`📧 [TEST-SMTP-CONFIG] SMTP_TLS: ${smtpTls ? '✅ Configuré' : '❌ Manquant'}`);
    console.log(`📧 [TEST-SMTP-CONFIG] SMTP_FROM: ${smtpFrom ? '✅ Configuré' : '❌ Manquant'}`);

    const missingVars = [];
    if (!smtpHost) missingVars.push('SMTP_HOST');
    if (!smtpPort) missingVars.push('SMTP_PORT');
    if (!smtpUser) missingVars.push('SMTP_USER');
    if (!smtpPass) missingVars.push('SMTP_PASS');
    if (!smtpFrom) missingVars.push('SMTP_FROM');

    if (missingVars.length > 0) {
      const errorMsg = `Variables SMTP manquantes: ${missingVars.join(', ')}`;
      console.error(`❌ [TEST-SMTP-CONFIG] ${errorMsg}`);
      
      return new Response(JSON.stringify({
        success: false,
        error: errorMsg,
        missingVariables: missingVars
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    console.log('✅ [TEST-SMTP-CONFIG] Toutes les variables SMTP sont configurées');

    return new Response(JSON.stringify({
      success: true,
      message: 'Configuration SMTP complète',
      config: {
        host: smtpHost,
        port: smtpPort,
        user: smtpUser,
        tls: smtpTls,
        from: smtpFrom
      }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });

  } catch (error: any) {
    console.error("❌ [TEST-SMTP-CONFIG] Erreur:", error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Erreur lors du test de configuration SMTP"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};

serve(handler);
