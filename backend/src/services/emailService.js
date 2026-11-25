const nodemailer = require('nodemailer');
const { Resend } = require('resend');

/**
 * Servicio Universal de Envío de Correos Electrónicos
 * Prioridad de envío (HTTPS primero para evitar bloqueos de puertos SMTP en servidores cloud):
 * 1. Brevo HTTP API (BREVO_API_KEY) - Puerto 443 HTTPS, ideal para Render Free Tier
 * 2. Resend HTTP API (RESEND_API_KEY) - Puerto 443 HTTPS
 * 3. SMTP Estándar con timeouts cortos (SMTP_HOST / SMTP_USER / SMTP_PASS)
 */

function getTransporter() {
  const host = (process.env.SMTP_HOST || '').trim();
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = (process.env.SMTP_USER || process.env.GMAIL_USER || '').trim();
  const pass = (process.env.SMTP_PASS || process.env.GMAIL_PASS || '').trim().replace(/\s+/g, '');

  if (!user || !pass) return null;

  const timeouts = {
    connectionTimeout: 6000,
    greetingTimeout: 6000,
    socketTimeout: 8000
  };

  if (host) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      ...timeouts
    });
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
    ...timeouts
  });
}

function getResendClient() {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (apiKey && !apiKey.includes('placeholder') && !apiKey.includes('demo')) {
    try {
      return new Resend(apiKey);
    } catch (err) {
      console.warn('[EMAIL] Error inicializando Resend:', err.message);
    }
  }
  return null;
}

const rawBrevoKey = (process.env.BREVO_API_KEY || '').trim();
const rawSmtpPass = (process.env.SMTP_PASS || '').trim();
const brevoApiKey = rawBrevoKey || (rawSmtpPass.startsWith('xkeysib-') ? rawSmtpPass : '');
const smtpTransporter = getTransporter();
const resendClient = getResendClient();

if (brevoApiKey) {
  console.log('📧 Motor de correo Brevo HTTP API inicializado correctamente.');
} else if (smtpTransporter) {
  console.log('📧 Motor de correo SMTP inicializado correctamente.');
} else if (resendClient) {
  console.log('📧 Motor de correo Resend API inicializado correctamente.');
} else {
  console.log('ℹ️ Sin proveedor de correo configurado. Los códigos se registrarán en logs.');
}

/**
 * Construye plantilla HTML consistente para correos de Pokémon TCG
 */
function buildEmailLayout({ accentColor, title, subtitle, username, intro, code, borderColor, badgeTextColor, footerNote }) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; background-color: #0b1222; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; color: #f1f5f9;">
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 60%, #082f49 100%); padding: 32px 24px; text-align: center; border-bottom: 1px solid #334155;">
        <h1 style="margin: 0; font-size: 28px; font-weight: 900; color: ${accentColor}; letter-spacing: -0.5px;">${title}</h1>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #94a3b8;">${subtitle}</p>
      </div>
      
      <div style="padding: 32px 28px; line-height: 1.6;">
        <h2 style="font-size: 20px; font-weight: 800; margin-top: 0; color: #f8fafc;">¡Hola, ${username}!</h2>
        <p style="color: #cbd5e1; font-size: 14px;">${intro}</p>
        
        <div style="text-align: center; margin: 28px 0;">
          <div style="display: inline-block; background: #030712; border: 2px solid ${borderColor}; color: ${badgeTextColor}; font-family: monospace; font-size: 34px; font-weight: 900; letter-spacing: 8px; padding: 14px 28px; border-radius: 14px;">
            ${code}
          </div>
        </div>

        <p style="font-size: 12px; color: #64748b; text-align: center;">${footerNote}</p>
        <hr style="border: none; border-top: 1px solid #1e293b; margin: 28px 0;" />

        <div style="text-align: center; font-size: 11px; color: #475569;">
          <p style="margin: 0;">Pokémon TCG · Cartas Coleccionables</p>
        </div>
      </div>
    </div>
  `;
}

/**
 * Envía un correo HTML usando el proveedor disponible (HTTPS primero, luego SMTP)
 */
async function dispatchEmail({ to, toName, subject, html, debugCode }) {
  const fromEmail = (process.env.EMAIL_FROM || process.env.SMTP_USER || process.env.GMAIL_USER || '').trim();
  let lastError = null;
  const hasProvider = Boolean((brevoApiKey && fromEmail) || resendClient || smtpTransporter);

  // 1. Brevo HTTP API (Puerto 443 HTTPS — nunca bloqueado por Render y sin esperas)
  if (brevoApiKey && fromEmail) {
    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'Pokémon TCG', email: fromEmail },
          to: [{ email: to, name: toName || to }],
          subject,
          htmlContent: html
        }),
        signal: AbortSignal.timeout(8000)
      });

      const body = await response.json().catch(() => ({}));
      if (response.ok) {
        console.log(`[EMAIL] Enviado vía Brevo API a ${to} (MessageId: ${body.messageId || 'ok'})`);
        return { success: true, provider: 'brevo-api', messageId: body.messageId };
      }
      lastError = body.message || `Brevo HTTP ${response.status}`;
      console.error(`[EMAIL ERROR] Brevo API (${response.status}) enviando a ${to}:`, lastError);
    } catch (err) {
      lastError = err.message;
      console.error(`[EMAIL ERROR] Excepción en Brevo API enviando a ${to}:`, err.message);
    }
  }

  // 2. Resend HTTP API
  if (resendClient) {
    try {
      const { data, error } = await resendClient.emails.send({
        from: 'Pokémon TCG <onboarding@resend.dev>',
        to: [to],
        subject,
        html
      });
      if (!error) {
        console.log(`[EMAIL] Enviado vía Resend a ${to} (ID: ${data?.id})`);
        return { success: true, provider: 'resend', data };
      }
      lastError = error.message;
      console.warn(`[EMAIL WARNING] Resend rechazó el envío a ${to}:`, error.message);
    } catch (err) {
      lastError = err.message;
      console.error(`[EMAIL ERROR] Excepción con Resend enviando a ${to}:`, err.message);
    }
  }

  // 3. SMTP Estándar (Brevo SMTP / Gmail SMTP) con timeout corto para evitar bloqueos
  if (smtpTransporter) {
    try {
      const sender = fromEmail || 'no-reply@pokemontcg.local';
      const info = await smtpTransporter.sendMail({
        from: sender.includes('<') ? sender : `"Pokémon TCG" <${sender}>`,
        to,
        subject,
        html
      });
      console.log(`[EMAIL] Enviado vía SMTP a ${to} (MessageId: ${info.messageId})`);
      return { success: true, provider: 'smtp', messageId: info.messageId };
    } catch (err) {
      lastError = err.message;
      console.error(`[EMAIL ERROR] Fallo vía SMTP a ${to}:`, err.message);
    }
  }

  if (hasProvider) {
    console.error(`[EMAIL FAILED] Ningún proveedor pudo entregar el correo a ${to}. Último error: ${lastError}`);
    return { success: false, error: lastError || 'Fallo al entregar el correo' };
  }

  console.log(`[EMAIL DEV LOG] Para: ${to} | Código: ${debugCode}`);
  return { success: true, simulated: true };
}

/**
 * Enviar correo de verificación de cuenta
 */
async function sendVerificationEmail(to, username, code) {
  const html = buildEmailLayout({
    accentColor: '#38bdf8',
    title: '⚡ POKÉMON TCG',
    subtitle: 'Plataforma de Cartas Coleccionables y Combates RPG',
    username,
    intro: 'Gracias por unirte a Pokémon TCG. Para verificar tu cuenta y comenzar tu aventura coleccionando y compitiendo, ingresa este código de 6 dígitos:',
    code,
    borderColor: '#0284c7',
    badgeTextColor: '#38bdf8',
    footerNote: 'Este código es válido durante 30 minutos. Si tú no realizaste este registro, puedes descartar este mensaje.'
  });

  return dispatchEmail({
    to,
    toName: username,
    subject: 'Código de Verificación · Pokémon TCG',
    html,
    debugCode: code
  });
}

/**
 * Enviar correo de restablecimiento de contraseña
 */
async function sendPasswordResetEmail(to, username, resetToken) {
  const html = buildEmailLayout({
    accentColor: '#f43f5e',
    title: '🔐 POKÉMON TCG',
    subtitle: 'Recuperación de Contraseña de Entrenador',
    username,
    intro: 'Recibimos una solicitud para restablecer la contraseña de tu cuenta. Ingresa el siguiente código de seguridad en el juego para definir tu nueva contraseña:',
    code: resetToken,
    borderColor: '#e11d48',
    badgeTextColor: '#fb7185',
    footerNote: 'Este código es válido durante 1 hora. Si tú no solicitaste este cambio, tu contraseña actual permanece segura.'
  });

  return dispatchEmail({
    to,
    toName: username,
    subject: 'Restablecer Contraseña · Pokémon TCG',
    html,
    debugCode: resetToken
  });
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
};
