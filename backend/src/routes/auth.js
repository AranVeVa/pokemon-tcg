const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET } = require('../config');
const { authenticateToken } = require('../middlewares/auth');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../services/emailService');
const { generateMovesForPokemon } = require('../data/movesList');

// Registrar nuevo usuario con Resend
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    // Verificar si ya existe
    const existing = await db.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase(), username]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'El correo electrónico o nombre de usuario ya está registrado' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString(); // Código de 6 dígitos

    const result = await db.query(`
      INSERT INTO users (username, email, password_hash, role, is_verified, verification_token, coins, gems, battle_pass_xp, battle_pass_level)
      VALUES ($1, $2, $3, 'Normal', false, $4, 2000, 100, 0, 1)
      RETURNING id, username, email, role, is_verified, coins, gems, battle_pass_xp, battle_pass_level
    `, [username, email.toLowerCase(), passwordHash, verificationToken]);

    const newUser = result.rows[0];

    // Dar cartas iniciales de bienvenida con ataques variados y stats
    const starterCards = [1, 4, 7, 25];
    for (const cardId of starterCards) {
      const pcRes = await db.query('SELECT name, types, hp_base, atk_base FROM pokemon_cards WHERE id = $1', [cardId]);
      if (pcRes.rows.length > 0) {
        const pc = pcRes.rows[0];
        const moves = generateMovesForPokemon(pc.types, pc.name);
        const iv = Math.floor(75 + Math.random() * 26);
        const def = Math.round(pc.atk_base * 0.85);
        const spd = Math.round((pc.hp_base + pc.atk_base) * 0.5);

        await db.query(`
          INSERT INTO user_cards (user_id, card_id, level, current_hp, max_hp, atk, def, spd, iv_percentage, moves, is_in_team)
          VALUES ($1, $2, 1, $3, $3, $4, $5, $6, $7, $8, true)
        `, [newUser.id, cardId, pc.hp_base, pc.atk_base, def, spd, iv, JSON.stringify(moves)]);
      }
    }

    // Dar items iniciales
    await db.query(`
      INSERT INTO user_items (user_id, item_key, quantity) VALUES
      ($1, 'potion_30', 3),
      ($1, 'revive_10', 2)
    `, [newUser.id]);

    // Enviar correo de verificación a través de Resend
    await sendVerificationEmail(newUser.email, newUser.username, verificationToken);

    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Usuario registrado exitosamente. Se ha enviado un correo con tu código de verificación.',
      token,
      verificationCode: verificationToken,
      user: newUser
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor al registrar' });
  }
});

// Reenviar código de verificación por Resend
router.post('/resend-verification', authenticateToken, async (req, res) => {
  try {
    const userRes = await db.query('SELECT email, username, is_verified FROM users WHERE id = $1', [req.user.id]);
    const user = userRes.rows[0];

    if (user.is_verified) {
      return res.json({ message: 'Tu cuenta ya está verificada.' });
    }

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    await db.query('UPDATE users SET verification_token = $1 WHERE id = $2', [newCode, req.user.id]);

    await sendVerificationEmail(user.email, user.username, newCode);

    res.json({
      message: 'Se ha reenviado un nuevo código de verificación a tu correo.',
      verificationCode: newCode
    });
  } catch (error) {
    console.error('Error al reenviar código:', error);
    res.status(500).json({ error: 'Error al reenviar correo de verificación' });
  }
});

// Iniciar sesión
router.post('/login', async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: 'Credenciales incompletas' });
    }

    const userRes = await db.query(`
      SELECT * FROM users 
      WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)
    `, [emailOrUsername]);

    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const user = userRes.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    delete user.password_hash;
    res.json({
      message: 'Inicio de sesión exitoso',
      token,
      user
    });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Verificar correo
router.post('/verify-email', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;

    const userRes = await db.query('SELECT verification_token, is_verified FROM users WHERE id = $1', [req.user.id]);
    const user = userRes.rows[0];

    if (user.is_verified) {
      return res.json({ message: 'El usuario ya se encuentra verificado' });
    }

    if (code && user.verification_token !== code.trim()) {
      return res.status(400).json({ error: 'El código de verificación es incorrecto' });
    }

    await db.query('UPDATE users SET is_verified = true, verification_token = NULL WHERE id = $1', [req.user.id]);
    res.json({ message: '¡Correo verificado con éxito! Cuenta 100% activa.' });
  } catch (error) {
    console.error('Error en verificación:', error);
    res.status(500).json({ error: 'Error al verificar correo' });
  }
});

// Solicitar recuperación de contraseña (Forgot Password)
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Ingresa tu correo electrónico' });

  try {
    const userRes = await db.query('SELECT id, username, email FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (userRes.rows.length === 0) {
      // Por seguridad, indicar que se envió si existe
      return res.json({ message: 'Si el correo está registrado, recibirás un código de recuperación.' });
    }

    const user = userRes.rows[0];
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();

    await db.query(`
      UPDATE users 
      SET reset_password_token = $1, reset_password_expires = NOW() + INTERVAL '1 hour'
      WHERE id = $2
    `, [resetCode, user.id]);

    await sendPasswordResetEmail(user.email, user.username, resetCode);

    res.json({
      message: 'Código de recuperación enviado a tu correo.',
      resetCode // Para pruebas locales
    });
  } catch (error) {
    console.error('Error en forgot-password:', error);
    res.status(500).json({ error: 'Error al procesar recuperación de contraseña' });
  }
});

// Restablecer contraseña con código de recuperación
router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    const userRes = await db.query(`
      SELECT id, reset_password_token, reset_password_expires 
      FROM users 
      WHERE LOWER(email) = LOWER($1)
    `, [email]);

    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: 'Solicitud no válida o expirada' });
    }

    const user = userRes.rows[0];
    if (!user.reset_password_token || user.reset_password_token !== code.trim()) {
      return res.status(400).json({ error: 'Código de recuperación incorrecto' });
    }

    if (new Date() > new Date(user.reset_password_expires)) {
      return res.status(400).json({ error: 'El código de recuperación ha expirado. Solicita uno nuevo.' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await db.query(`
      UPDATE users 
      SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL, updated_at = NOW()
      WHERE id = $2
    `, [newHash, user.id]);

    res.json({ message: '¡Tu contraseña ha sido actualizada con éxito! Ya puedes iniciar sesión.' });
  } catch (error) {
    console.error('Error en reset-password:', error);
    res.status(500).json({ error: 'Error al actualizar contraseña' });
  }
});

// Cambiar contraseña estando autenticado
router.post('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Debes ingresar tu contraseña actual y la nueva contraseña' });
  }

  try {
    const userRes = await db.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const isMatch = await bcrypt.compare(currentPassword, userRes.rows[0].password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'La contraseña actual no es correcta' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, req.user.id]);

    res.json({ message: '¡Contraseña cambiada exitosamente!' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
});

// Obtener información del usuario autenticado
router.get('/me', authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
