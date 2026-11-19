const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middlewares/auth');

// Obtener lista de amigos del usuario
router.get('/', authenticateToken, async (req, res) => {
  try {
    const friendsRes = await db.query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        f.status,
        f.created_at,
        -- Simular estado en línea (ej. si id % 3 !== 0 está en línea)
        CASE WHEN u.id % 4 = 0 THEN false ELSE true END AS is_online
      FROM friends f
      JOIN users u ON (f.friend_id = u.id AND f.user_id = $1) OR (f.user_id = u.id AND f.friend_id = $1)
      WHERE u.id != $1
      ORDER BY u.username ASC
    `, [req.user.id]);

    res.json({ friends: friendsRes.rows });
  } catch (error) {
    console.error('Error al obtener amigos:', error);
    res.status(500).json({ error: 'Error al consultar lista de amigos' });
  }
});

// Buscar usuarios para agregar
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim().length === 0) {
      return res.json({ users: [] });
    }

    const searchRes = await db.query(`
      SELECT u.id, u.username, u.email, u.role,
        CASE WHEN f.id IS NOT NULL THEN true ELSE false END AS is_already_friend
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

// Agregar amigo
router.post('/add', authenticateToken, async (req, res) => {
  try {
    const { friendId } = req.body;
    if (!friendId || friendId === req.user.id) {
      return res.status(400).json({ error: 'Usuario a agregar no válido' });
    }

    const checkExisting = await db.query(`
      SELECT id FROM friends 
      WHERE (user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)
    `, [req.user.id, friendId]);

    if (checkExisting.rows.length > 0) {
      return res.status(400).json({ error: 'Ya son amigos o existe una solicitud pendiente' });
    }

    await db.query(`
      INSERT INTO friends (user_id, friend_id, status)
      VALUES ($1, $2, 'accepted')
    `, [req.user.id, friendId]);

    res.json({ message: '¡Amigo agregado con éxito!' });
  } catch (error) {
    console.error('Error al agregar amigo:', error);
    res.status(500).json({ error: 'Error al agregar amigo' });
  }
});

module.exports = router;
