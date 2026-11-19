const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');
const db = require('../db');

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso no proporcionado' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const userRes = await db.query(
      'SELECT id, username, email, role, is_verified, coins, gems, battle_pass_xp, battle_pass_level, last_free_pack_claimed_at, last_daily_premium_pack_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    req.user = userRes.rows[0];
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Acceso denegado. Se requiere uno de los siguientes roles: ${roles.join(', ')}` 
      });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole
};
