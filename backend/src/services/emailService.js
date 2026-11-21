const { Resend } = require('resend');

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
let resendClient = null;

if (RESEND_API_KEY && !RESEND_API_KEY.includes('placeholder')) {
  try {
    resendClient = new Resend(RESEND_API_KEY);
    console.log('📧 Resend configurado con API Key activa.');
  } catch (err) {
    console.warn('⚠️ No se pudo inicializar cliente de Resend:', err.message);
  }
}

/**
 * Enviar correo de verificación con Resend
 */
async function sendVerificationEmail(to, username, code) {
  const subject = '🎮 Código de Verificación · Pokémon TCG';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #EE3344 0%, #1E64B4 100%); padding: 28px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">Pokémon TCG</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">¡Bienvenido al juego de cartas coleccionables, ${username}!</p>
      </div>
      <div style="padding: 32px 28px; color: #374151; line-height: 1.6;">
        <h2 style="font-size: 20px; font-weight: 800; margin-top: 0; color: #111827;">Verifica tu cuenta de entrenador</h2>
        <p>Gracias por unirte a Pokémon TCG. Usa el siguiente código de 6 dígitos para verificar tu correo y activar tu cuenta al 100%:</p>
        
        <div style="text-align: center; margin: 28px 0;">
          <span style="display: inline-block; background-color: #F3F4F6; border: 2px dashed #3B82F6; color: #1E40AF; font-size: 32px; font-weight: 900; letter-spacing: 6px; padding: 12px 28px; border-radius: 12px;">
            ${code}
          </span>
        </div>

        <p style="font-size: 13px; color: #6B7280;">Este código expira en 30 minutos. Si no solicitaste este registro, puedes ignorar este correo con total seguridad.</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
        <p style="font-size: 12px; color: #9CA3AF; margin: 0; text-align: center;">
          Programación Web · UVAQ 2026 · Proyecto Pokémon TCG
        </p>
      </div>
    </div>
  `;

  console.log(`\n======================================================`);
  console.log(`📧 [RESEND EMAIL SIMULATION] Para: ${to}`);
  console.log(`🔑 Código de verificación: ${code}`);
  console.log(`======================================================\n`);

  if (resendClient) {
    try {
      const result = await resendClient.emails.send({
        from: 'Pokemon TCG <onboarding@resend.dev>',
        to: [to],
        subject,
        html
      });
      return { success: true, result };
    } catch (error) {
      console.warn('Aviso: Error enviando correo vía Resend API (usando modo prueba/local):', error.message);
      return { success: true, simulated: true, error: error.message };
    }
  }

  return { success: true, simulated: true };
}

/**
 * Enviar correo de restablecimiento de contraseña con Resend
 */
async function sendPasswordResetEmail(to, username, resetToken) {
  const subject = '🔐 Restablecer Contraseña · Pokémon TCG';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="background: linear-gradient(135deg, #1E64B4 0%, #111827 100%); padding: 28px; text-align: center; color: #ffffff;">
        <h1 style="margin: 0; font-size: 26px; font-weight: 900;">Pokémon TCG</h1>
        <p style="margin: 6px 0 0 0; font-size: 14px; opacity: 0.9;">Recuperación de Contraseña</p>
      </div>
      <div style="padding: 32px 28px; color: #374151; line-height: 1.6;">
        <h2 style="font-size: 20px; font-weight: 800; margin-top: 0; color: #111827;">Hola, ${username}</h2>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta de entrenador.</p>
        <p>Tu código de seguridad temporal para ingresar tu nueva contraseña es:</p>
        
        <div style="text-align: center; margin: 28px 0;">
          <span style="display: inline-block; background-color: #FEF3C7; border: 2px solid #F59E0B; color: #92400E; font-size: 30px; font-weight: 900; letter-spacing: 5px; padding: 12px 24px; border-radius: 12px;">
            ${resetToken}
          </span>
        </div>

        <p style="font-size: 13px; color: #6B7280;">Ingresa este código en la ventana de cambio de contraseña en el juego. Válido por 1 hora.</p>
        <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;" />
        <p style="font-size: 12px; color: #9CA3AF; margin: 0; text-align: center;">
          Si tú no solicitaste este cambio, no te preocupes, tu contraseña actual sigue segura.
        </p>
      </div>
    </div>
  `;

  console.log(`\n======================================================`);
  console.log(`🔐 [RESEND PASSWORD RESET] Para: ${to}`);
  console.log(`🔑 Código / Token de recuperación: ${resetToken}`);
  console.log(`======================================================\n`);

  if (resendClient) {
    try {
      const result = await resendClient.emails.send({
        from: 'Pokemon TCG <onboarding@resend.dev>',
        to: [to],
        subject,
        html
      });
      return { success: true, result };
    } catch (error) {
      console.warn('Aviso: Error enviando recuperación vía Resend:', error.message);
      return { success: true, simulated: true, error: error.message };
    }
  }

  return { success: true, simulated: true };
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
};
