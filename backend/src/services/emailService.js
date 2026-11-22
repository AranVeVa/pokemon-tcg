const nodemailer = require('nodemailer');
const { Resend } = require('resend');

// 1. Configuración de Google / Gmail SMTP (Nodemailer)
// Para usar con Gmail: SMTP_USER=tu_correo@gmail.com, SMTP_PASS=tu_app_password_de_16_letras
const SMTP_USER = process.env.SMTP_USER || process.env.GMAIL_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || process.env.GMAIL_PASS || process.env.GMAIL_APP_PASS || '';

let smtpTransporter = null;
if (SMTP_USER && SMTP_PASS) {
  try {
    smtpTransporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS.replace(/\s+/g, '') // Eliminar espacios accidentales de la app password
      }
    });
    console.log(`📧 Nodemailer Gmail configurado con remitente: ${SMTP_USER}`);
  } catch (err) {
    console.warn('⚠️ No se pudo inicializar transporte SMTP de Gmail:', err.message);
  }
}

// 2. Configuración de Resend
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
let resendClient = null;

if (RESEND_API_KEY && !RESEND_API_KEY.includes('demo') && !RESEND_API_KEY.includes('placeholder')) {
  try {
    resendClient = new Resend(RESEND_API_KEY);
    console.log('📧 Resend API configurado.');
  } catch (err) {
    console.warn('⚠️ No se pudo inicializar cliente de Resend:', err.message);
  }
}

/**
 * Enviar correo de verificación (Soporta Gmail SMTP y Resend)
 */
async function sendVerificationEmail(to, username, code) {
  const subject = '🎮 Código de Verificación · Pokémon TCG';
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; background-color: #0b1222; border: 1px solid #1e293b; border-radius: 20px; overflow: hidden; color: #f1f5f9; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #082f49 100%); padding: 32px 24px; text-align: center; border-bottom: 1px solid #334155;">
        <h1 style="margin: 0; font-size: 28px; font-weight: 900; color: #38bdf8; letter-spacing: -0.5px;">⚡ POKÉMON TCG</h1>
        <p style="margin: 8px 0 0 0; font-size: 14px; color: #94a3b8;">Plataforma Web de Cartas Coleccionables y Batallas RPG</p>
      </div>
      
      <div style="padding: 32px 28px; line-height: 1.6;">
        <h2 style="font-size: 20px; font-weight: 800; margin-top: 0; color: #f8fafc;">¡Hola, Entrenador ${username}!</h2>
        <p style="color: #cbd5e1; font-size: 14px;">
          Te damos la bienvenida a Pokémon TCG. Para verificar tu cuenta y comenzar a abrir sobres, armar tu mazo y combatir contra amigos, ingresa el siguiente código de 6 dígitos:
        </p>
        
        <div style="text-align: center; margin: 28px 0;">
          <div style="display: inline-block; background: #030712; border: 2px solid #0284c7; color: #38bdf8; font-family: monospace; font-size: 34px; font-weight: 900; letter-spacing: 8px; padding: 14px 28px; border-radius: 14px; box-shadow: 0 0 20px rgba(56, 189, 248, 0.25);">
            ${code}
          </div>
        </div>

        <p style="font-size: 12px; color: #64748b; text-align: center;">
          Este código es válido durante 30 minutos. Si tú no creaste esta cuenta, puedes descartar este mensaje con seguridad.
        </p>

        <hr style="border: none; border-top: 1px solid #1e293b; margin: 28px 0;" />

        <div style="text-align: center; font-size: 11px; color: #475569;">
          <p style="margin: 0;">UVAQ — Programación Web 2026</p>
          <p style="margin: 4px 0 0 0;">Alumna: Arantza Venegas Valencia (20010164) · Prof. Nicolás Zamora Ramos</p>
        </div>
      </div>
    </div>
  `;

  console.log(`\n======================================================`);
  console.log(`📧 [CÓDIGO DE VERIFICACIÓN] Para: ${to}`);
  console.log(`🔑 Código: ${code}`);
  console.log(`======================================================\n`);

  // 1. Intentar con Gmail / Google SMTP
  if (smtpTransporter) {
    try {
      const info = await smtpTransporter.sendMail({
        from: `"Pokémon TCG" <${SMTP_USER}>`,
        to,
        subject,
        html
      });
      console.log(`✅ Correo enviado exitosamente vía Gmail SMTP a ${to}:`, info.messageId);
      return { success: true, provider: 'smtp', messageId: info.messageId };
    } catch (err) {
      console.error(`❌ Error enviando vía Gmail SMTP a ${to}:`, err.message);
    }
  }

  // 2. Intentar con Resend API
  if (resendClient) {
    try {
      const result = await resendClient.emails.send({
        from: 'Pokemon TCG <onboarding@resend.dev>',
        to: [to],
        subject,
        html
      });
      console.log(`✅ Correo enviado exitosamente vía Resend API a ${to}`);
      return { success: true, provider: 'resend', result };
    } catch (err) {
      console.warn(`⚠️ Error en Resend API enviando a ${to}:`, err.message);
    }
  }

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
          Recibimos una solicitud para restablecer la contraseña de tu cuenta. Usa este código de seguridad temporal para ingresar tu nueva contraseña:
        </p>
        
        <div style="text-align: center; margin: 28px 0;">
          <div style="display: inline-block; background: #030712; border: 2px solid #e11d48; color: #fb7185; font-family: monospace; font-size: 34px; font-weight: 900; letter-spacing: 8px; padding: 14px 28px; border-radius: 14px; box-shadow: 0 0 20px rgba(244, 63, 94, 0.25);">
            ${resetToken}
          </div>
        </div>

        <p style="font-size: 12px; color: #64748b; text-align: center;">
          Ingresa este código en la pantalla de recuperación en el juego. Es válido durante 1 hora.
        </p>

        <hr style="border: none; border-top: 1px solid #1e293b; margin: 28px 0;" />

        <div style="text-align: center; font-size: 11px; color: #475569;">
          <p style="margin: 0;">UVAQ — Programación Web 2026</p>
          <p style="margin: 4px 0 0 0;">Si tú no solicitaste este cambio, tu contraseña actual permanece segura.</p>
        </div>
      </div>
    </div>
  `;

  console.log(`\n======================================================`);
  console.log(`🔐 [RECUPERACIÓN DE CONTRASEÑA] Para: ${to}`);
  console.log(`🔑 Código: ${resetToken}`);
  console.log(`======================================================\n`);

  // 1. Intentar con Gmail / Google SMTP
  if (smtpTransporter) {
    try {
      const info = await smtpTransporter.sendMail({
        from: `"Pokémon TCG" <${SMTP_USER}>`,
        to,
        subject,
        html
      });
      console.log(`✅ Correo de recuperación enviado vía Gmail SMTP a ${to}:`, info.messageId);
      return { success: true, provider: 'smtp', messageId: info.messageId };
    } catch (err) {
      console.error(`❌ Error enviando recuperación vía Gmail SMTP a ${to}:`, err.message);
    }
  }

  // 2. Intentar con Resend API
  if (resendClient) {
    try {
      const result = await resendClient.emails.send({
        from: 'Pokemon TCG <onboarding@resend.dev>',
        to: [to],
        subject,
        html
      });
      console.log(`✅ Correo de recuperación enviado vía Resend API a ${to}`);
      return { success: true, provider: 'resend', result };
    } catch (err) {
      console.warn(`⚠️ Error en Resend API enviando recuperación a ${to}:`, err.message);
    }
  }

  return { success: true, simulated: true };
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
};
