const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../middlewares/auth');

// Todas las rutas de este router requieren rol 'Admin'
router.use(authenticateToken, requireRole(['Admin']));

// 1. Obtener y buscar usuarios
router.get('/users', async (req, res) => {
  try {
    const { search = '' } = req.query;
    let query = `
      SELECT id, username, email, role, is_verified, coins, gems, battle_pass_level, created_at 
      FROM users
    `;
    const params = [];

    if (search.trim()) {
      query += ` WHERE LOWER(username) LIKE LOWER($1) OR LOWER(email) LIKE LOWER($1)`;
      params.push(`%${search.trim()}%`);
    }

    query += ` ORDER BY id ASC`;
    const usersRes = await db.query(query, params);
    res.json({ users: usersRes.rows });
  } catch (error) {
    console.error('Error al listar usuarios para admin:', error);
    res.status(500).json({ error: 'Error al consultar usuarios' });
  }
});

// Asignar rol a usuario (Normal, Premium, Admin) (Mockup 5)
router.put('/users/:id/role', async (req, res) => {
  const { role } = req.body;
  const userId = req.params.id;

  if (!['Normal', 'Premium', 'Admin'].includes(role)) {
    return res.status(400).json({ error: 'Rol no válido. Debe ser Normal, Premium o Admin.' });
  }

  try {
    const updateRes = await db.query(`
      UPDATE users 
      SET role = $1, updated_at = NOW() 
      WHERE id = $2 
      RETURNING id, username, email, role
    `, [role, userId]);

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      message: `Rol del usuario ${updateRes.rows[0].username} actualizado a ${role} con éxito.`,
      user: updateRes.rows[0]
    });
  } catch (error) {
    console.error('Error al cambiar rol:', error);
    res.status(500).json({ error: 'Error al actualizar rol del usuario' });
  }
});

// 2. Cartas e Imágenes: Obtener y editar cartas
router.get('/cards', async (req, res) => {
  try {
    const { search = '' } = req.query;
    let query = 'SELECT * FROM pokemon_cards';
    const params = [];

    if (search.trim()) {
      query += ' WHERE LOWER(name) LIKE LOWER($1) OR id::text = $2';
      params.push(`%${search.trim()}%`, search.trim());
    }

    query += ' ORDER BY id ASC';
    const cardsRes = await db.query(query, params);
    res.json({ cards: cardsRes.rows });
  } catch (error) {
    console.error('Error al listar cartas para admin:', error);
    res.status(500).json({ error: 'Error al consultar cartas' });
  }
});

// Editar carta existente
router.put('/cards/:id', async (req, res) => {
  const { id } = req.params;
  const { name, types, hp_base, atk_base, artwork_url, rarity } = req.body;

  try {
    const updateRes = await db.query(`
      UPDATE pokemon_cards
      SET name = COALESCE($1, name),
          types = COALESCE($2, types),
          hp_base = COALESCE($3, hp_base),
          atk_base = COALESCE($4, atk_base),
          artwork_url = COALESCE($5, artwork_url),
          rarity = COALESCE($6, rarity)
      WHERE id = $7
      RETURNING *
    `, [name, types, hp_base, atk_base, artwork_url, rarity, id]);

    if (updateRes.rows.length === 0) {
      return res.status(404).json({ error: 'Carta no encontrada' });
    }

    res.json({ message: 'Carta actualizada exitosamente', card: updateRes.rows[0] });
  } catch (error) {
    console.error('Error al actualizar carta:', error);
    res.status(500).json({ error: 'Error al guardar cambios de la carta' });
  }
});

// Agregar nueva carta al catálogo
router.post('/cards', async (req, res) => {
  const { id, name, types, hp_base, atk_base, artwork_url, sprite_url, rarity } = req.body;

  if (!id || !name || !types || !hp_base || !atk_base) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  try {
    const insertRes = await db.query(`
      INSERT INTO pokemon_cards (id, name, types, hp_base, atk_base, sprite_url, artwork_url, rarity)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      id,
      name,
      types,
      hp_base,
      atk_base,
      sprite_url || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
      artwork_url || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
      rarity || 'comun'
    ]);

    res.status(201).json({ message: 'Nueva carta creada exitosamente', card: insertRes.rows[0] });
  } catch (error) {
    console.error('Error al crear carta:', error);
    res.status(500).json({ error: 'Error al crear carta' });
  }
});

// 3. Probabilidades y Configuración del Sistema
router.get('/config', async (req, res) => {
  try {
    const configRes = await db.query('SELECT key, value FROM system_config');
    const configs = {};
    configRes.rows.forEach(r => {
      configs[r.key] = r.value;
    });
    res.json({ configs });
  } catch (error) {
    console.error('Error al consultar configuración:', error);
    res.status(500).json({ error: 'Error al consultar configuración' });
  }
});

router.put('/config/:key', async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  try {
    await db.query(`
      INSERT INTO system_config (key, value, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
    `, [key, JSON.stringify(value)]);

    res.json({ message: `Configuración '${key}' guardada exitosamente.` });
  } catch (error) {
    console.error('Error al guardar configuración:', error);
    res.status(500).json({ error: 'Error al guardar configuración' });
  }
});

// 4. Historial de Pagos de Stripe
router.get('/payments', async (req, res) => {
  try {
    const paymentsRes = await db.query(`
      SELECT p.*, u.username
      FROM payments p
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT 50
    `);
    res.json({ payments: paymentsRes.rows });
  } catch (error) {
    console.error('Error al listar pagos:', error);
    res.status(500).json({ error: 'Error al consultar pagos' });
  }
});

module.exports = router;
