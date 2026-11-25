const nodemailer = require('nodemailer');
const { Resend } = require('resend');

/**
 * Servicio Universal de Envío de Correos Electrónicos
 * Soporta:
 * 1. Brevo / SendGrid / Mailgun / Outlook (SMTP Estándar con SMTP_HOST)
 * 2. Gmail SMTP (Nodemailer con SMTP_USER y SMTP_PASS)
 * 3. Resend API (RESEND_API_KEY)
 */

function getTransporter() {
  const host = process.env.SMTP_HOST || '';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = (process.env.SMTP_USER || process.env.GMAIL_USER || '').trim();
  const pass = (process.env.SMTP_PASS || process.env.GMAIL_PASS || '').trim().replace(/\s+/g, '');

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
  } else if (user && pass) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    });
  }
  return null;
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

const smtpTransporter = getTransporter();
const resendClient = getResendClient();

if (smtpTransporter) {
  console.log('📧 Motor de correo SMTP inicializado correctamente.');
} else if (resendClient) {
  console.log('📧 Motor de correo Resend API inicializado correctamente.');
} else {
  console.log('ℹ️ Sin proveedor de correo configurado. Los correos se registrarán en los logs del servidor.');
}

/**
 * Enviar correo de verificación de cuenta
 */
async function sendVerificationEmail(to, username, code) {
  const subject = '🎮 Código de Verificación · Pokémon TCG';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; background-color: #0b1222; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; color: #f1f5f9; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #082f49 100%); padding: 32px 24px; text-align: center; border-bottom: 1px solid #334155;">
        <h1 style="margin: 0; font-size: 28px; font-weight: 900; color: #38bdf8; letter-spacing: -0.5px;">⚡ POKÉMON TCG</h1>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #94a3b8;">Plataforma de Cartas Coleccionables y Combates RPG</p>
      </div>
      
      <div style="padding: 32px 28px; line-height: 1.6;">
        <h2 style="font-size: 20px; font-weight: 800; margin-top: 0; color: #f8fafc;">¡Hola, ${username}!</h2>
        <p style="color: #cbd5e1; font-size: 14px;">
          Gracias por unirte a Pokémon TCG. Para verificar tu cuenta y comenzar tu aventura coleccionando y compitiendo, ingresa este código de 6 dígitos:
        </p>
        
        <div style="text-align: center; margin: 28px 0;">
          <div style="display: inline-block; background: #030712; border: 2px solid #0284c7; color: #38bdf8; font-family: monospace; font-size: 34px; font-weight: 900; letter-spacing: 8px; padding: 14px 28px; border-radius: 14px; box-shadow: 0 0 20px rgba(56, 189, 248, 0.25);">
            ${code}
          </div>
        </div>

        <p style="font-size: 12px; color: #64748b; text-align: center;">
          Este código es válido durante 30 minutos. Si tú no realizaste este registro, puedes descartar este mensaje.
        </p>

        <hr style="border: none; border-top: 1px solid #1e293b; margin: 28px 0;" />

        <div style="text-align: center; font-size: 11px; color: #475569;">
          <p style="margin: 0;">UVAQ — Programación Web 2026</p>
          <p style="margin: 4px 0 0 0;">Alumna: Arantza Venegas Valencia (20010164) · Prof. Nicolás Zamora Ramos</p>
        </div>
      </div>
    </div>
  `;

  const fromSender = process.env.EMAIL_FROM || process.env.SMTP_USER || 'Pokemon TCG <onboarding@resend.dev>';

  // 1. Envío por SMTP (Brevo / Gmail / Outlook / etc.)
  if (smtpTransporter) {
    try {
      const info = await smtpTransporter.sendMail({
        from: fromSender.includes('<') ? fromSender : `"Pokémon TCG" <${fromSender}>`,
        to,
        subject,
        html
      });
      console.log(`[EMAIL] Correo de verificación enviado exitosamente a ${to} (MessageId: ${info.messageId})`);
      return { success: true, provider: 'smtp', messageId: info.messageId };
    } catch (err) {
      console.error(`[EMAIL ERROR] Fallo al enviar vía SMTP a ${to}:`, err.message);
    }
  }

  // 2. Envío por Resend API
  if (resendClient) {
    try {
      const { data, error } = await resendClient.emails.send({
        from: 'Pokemon TCG <onboarding@resend.dev>',
        to: [to],
        subject,
        html
      });
      if (error) {
        console.warn(`[EMAIL WARNING] Resend rechazó el envío a ${to}:`, error.message);
        return { success: false, provider: 'resend', error: error.message };
      }
      console.log(`[EMAIL] Correo de verificación enviado vía Resend a ${to} (ID: ${data?.id})`);
      return { success: true, provider: 'resend', data };
    } catch (err) {
      console.error(`[EMAIL ERROR] Excepción con Resend enviando a ${to}:`, err.message);
    }
  }

  console.log(`[EMAIL DEV LOG] Para: ${to} | Código de verificación: ${code}`);
  return { success: true, simulated: true };
}

/**
 * Enviar correo de restablecimiento de contraseña
 */
async function sendPasswordResetEmail(to, username, resetToken) {
  const subject = '🔐 Restablecer Contraseña · Pokémon TCG';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; background-color: #0b1222; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; color: #f1f5f9; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
      <div style="background: linear-gradient(135deg, #1e1b4b 0%, #311042 100%); padding: 32px 24px; text-align: center; border-bottom: 1px solid #334155;">
        <h1 style="margin: 0; font-size: 28px; font-weight: 900; color: #f43f5e; letter-spacing: -0.5px;">🔐 POKÉMON TCG</h1>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #fda4af;">Recuperación de Contraseña de Entrenador</p>
      </div>
      
      <div style="padding: 32px 28px; line-height: 1.6;">
        <h2 style="font-size: 20px; font-weight: 800; margin-top: 0; color: #f8fafc;">Hola, ${username}</h2>
        <p style="color: #cbd5e1; font-size: 14px;">
          Recibimos una solicitud para restablecer la contraseña de tu cuenta. Ingresa el siguiente código de seguridad en el juego para definir tu nueva contraseña:
        </p>
        
        <div style="text-align: center; margin: 28px 0;">
          <div style="display: inline-block; background: #030712; border: 2px solid #e11d48; color: #fb7185; font-family: monospace; font-size: 34px; font-weight: 900; letter-spacing: 8px; padding: 14px 28px; border-radius: 14px; box-shadow: 0 0 20px rgba(244, 63, 94, 0.25);">
            ${resetToken}
          </div>
        </div>

        <p style="font-size: 12px; color: #64748b; text-align: center;">
          Este código es válido durante 1 hora. Si tú no solicitaste este cambio, tu contraseña actual permanece segura.
        </p>

        <hr style="border: none; border-top: 1px solid #1e293b; margin: 28px 0;" />

        <div style="text-align: center; font-size: 11px; color: #475569;">
          <p style="margin: 0;">UVAQ — Programación Web 2026</p>
        </div>
      </div>
    </div>
  `;

  const fromSender = process.env.EMAIL_FROM || process.env.SMTP_USER || 'Pokemon TCG <onboarding@resend.dev>';

  // 1. Envío por SMTP
  if (smtpTransporter) {
    try {
      const info = await smtpTransporter.sendMail({
        from: fromSender.includes('<') ? fromSender : `"Pokémon TCG" <${fromSender}>`,
        to,
        subject,
        html
      });
      console.log(`[EMAIL] Correo de recuperación enviado exitosamente a ${to} (MessageId: ${info.messageId})`);
      return { success: true, provider: 'smtp', messageId: info.messageId };
    } catch (err) {
      console.error(`[EMAIL ERROR] Fallo al enviar recuperación vía SMTP a ${to}:`, err.message);
    }
  }

  // 2. Envío por Resend API
  if (resendClient) {
    try {
      const { data, error } = await resendClient.emails.send({
        from: 'Pokemon TCG <onboarding@resend.dev>',
        to: [to],
        subject,
        html
      });
      if (error) {
        console.warn(`[EMAIL WARNING] Resend rechazó recuperación a ${to}:`, error.message);
        return { success: false, provider: 'resend', error: error.message };
      }
      console.log(`[EMAIL] Correo de recuperación enviado vía Resend a ${to} (ID: ${data?.id})`);
      return { success: true, provider: 'resend', data };
    } catch (err) {
      console.error(`[EMAIL ERROR] Excepción con Resend enviando recuperación a ${to}:`, err.message);
    }
  }

  console.log(`[EMAIL DEV LOG] Para: ${to} | Código de recuperación: ${resetToken}`);
  return { success: true, simulated: true };
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
};
