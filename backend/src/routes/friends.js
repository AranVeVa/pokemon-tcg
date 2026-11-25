const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middlewares/auth');

// Obtener lista de amigos aceptados, solicitudes recibidas pendientes y enviadas pendientes
router.get('/', authenticateToken, async (req, res) => {
  try {
    const friendsRes = await db.query(`
      SELECT 
        f.id AS friendship_id,
        u.id,
        u.username,
        u.email,
        u.role,
        f.status,
        f.created_at,
        CASE WHEN u.id % 4 = 0 THEN false ELSE true END AS is_online
      FROM friends f
      JOIN users u ON (f.friend_id = u.id AND f.user_id = $1) OR (f.user_id = u.id AND f.friend_id = $1)
      WHERE u.id != $1 AND f.status = 'accepted'
      ORDER BY u.username ASC
    `, [req.user.id]);

    const incomingRes = await db.query(`
      SELECT 
        f.id AS request_id,
        u.id,
        u.username,
        u.email,
        u.role,
        f.created_at
      FROM friends f
      JOIN users u ON f.user_id = u.id
      WHERE f.friend_id = $1 AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `, [req.user.id]);

    const sentRes = await db.query(`
      SELECT 
        f.id AS request_id,
        u.id,
        u.username,
        u.email,
        u.role,
        f.created_at
      FROM friends f
      JOIN users u ON f.friend_id = u.id
      WHERE f.user_id = $1 AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `, [req.user.id]);

    res.json({
      friends: friendsRes.rows,
      incomingRequests: incomingRes.rows,
      sentRequests: sentRes.rows
    });
  } catch (error) {
    console.error('Error al obtener amigos:', error);
    res.status(500).json({ error: 'Error al consultar lista de amigos' });
  }
});

// Buscar usuarios para enviar solicitud de amistad
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim().length === 0) {
      return res.json({ users: [] });
    }

    const searchRes = await db.query(`
      SELECT 
        u.id, 
        u.username, 
        u.email, 
        u.role,
        f.id AS friendship_id,
        f.status AS friendship_status,
        (f.user_id = $1) AS is_sender,
        CASE WHEN f.id IS NOT NULL AND f.status = 'accepted' THEN true ELSE false END AS is_already_friend
      FROM users u
      LEFT JOIN friends f ON ((f.user_id = $1 AND f.friend_id = u.id) OR (f.friend_id = $1 AND f.user_id = u.id))
      WHERE (LOWER(u.username) LIKE LOWER($2) OR LOWER(u.email) LIKE LOWER($2))
        AND u.id != $1
      LIMIT 10
    `, [req.user.id, `%${query.trim()}%`]);

    res.json({ users: searchRes.rows });
  } catch (error) {
    console.error('Error al buscar usuarios:', error);
    res.status(500).json({ error: 'Error al buscar usuarios' });
  }
});

// Enviar solicitud de amistad (queda pendiente de aprobación)
router.post('/add', authenticateToken, async (req, res) => {
  try {
    const { friendId } = req.body;
    if (!friendId || friendId === req.user.id) {
      return res.status(400).json({ error: 'Usuario no válido' });
    }

    const checkExisting = await db.query(`
      SELECT id, status FROM friends 
      WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)
    `, [req.user.id, friendId]);

    if (checkExisting.rows.length > 0) {
      const existing = checkExisting.rows[0];
      if (existing.status === 'accepted') {
        return res.status(400).json({ error: 'Ya son amigos' });
      }
      return res.status(400).json({ error: 'Ya existe una solicitud de amistad pendiente' });
    }

    await db.query(`
      INSERT INTO friends (user_id, friend_id, status)
      VALUES ($1, $2, 'pending')
    `, [req.user.id, friendId]);

    res.json({ message: '¡Solicitud de amistad enviada! Espera a que la acepte.' });
  } catch (error) {
    console.error('Error al enviar solicitud de amistad:', error);
    res.status(500).json({ error: 'Error al enviar solicitud de amistad' });
  }
});

// Aprobar o rechazar solicitud de amistad recibida
router.post('/respond', authenticateToken, async (req, res) => {
  try {
    const { requestId, action } = req.body;
    if (!requestId || !['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Parámetros inválidos' });
    }

    const reqCheck = await db.query(`
      SELECT * FROM friends 
      WHERE id = $1 AND friend_id = $2 AND status = 'pending'
    `, [requestId, req.user.id]);

    if (reqCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada o ya fue respondida' });
    }

    if (action === 'accept') {
      await db.query(`UPDATE friends SET status = 'accepted' WHERE id = $1`, [requestId]);
      return res.json({ message: '¡Solicitud aceptada! Ya pueden retarse a combatir.' });
    } else {
      await db.query(`DELETE FROM friends WHERE id = $1`, [requestId]);
      return res.json({ message: 'Solicitud de amistad rechazada.' });
    }
  } catch (error) {
    console.error('Error al responder solicitud de amistad:', error);
    res.status(500).json({ error: 'Error al procesar solicitud de amistad' });
  }
});

module.exports = router;
