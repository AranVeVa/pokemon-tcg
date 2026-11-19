const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET } = require('../config');
const { authenticateToken } = require('../middlewares/auth');

// Registrar nuevo usuario
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

    // Dar cartas iniciales de bienvenida (Bulbasaur, Charmander, Squirtle, Pikachu)
    const starterCards = [1, 4, 7, 25];
    for (const cardId of starterCards) {
      await db.query(`
        INSERT INTO user_cards (user_id, card_id, level, current_hp, max_hp, atk, is_in_team)
        VALUES ($1, $2, 1, 50, 50, 45, true)
      `, [newUser.id, cardId]);
    }

    // Dar items iniciales
    await db.query(`
      INSERT INTO user_items (user_id, item_key, quantity) VALUES
      ($1, 'potion_30', 3),
      ($1, 'revive_10', 2)
    `, [newUser.id]);

    const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Usuario registrado exitosamente. Se ha enviado un código de verificación a su correo.',
      token,
      verificationCode: verificationToken, // Incluido para pruebas en desarrollo
      user: newUser
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor al registrar' });
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

// Obtener información del usuario autenticado
router.get('/me', authenticateToken, async (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
