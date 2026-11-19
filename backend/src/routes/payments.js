const express = require('express');
const router = express.Router();
const db = require('../db');
const { STRIPE_SECRET_KEY, FRONTEND_URL } = require('../config');
const { authenticateToken } = require('../middlewares/auth');

let stripe = null;
if (STRIPE_SECRET_KEY && !STRIPE_SECRET_KEY.includes('Placeholder') && !STRIPE_SECRET_KEY.includes('demo')) {
  try {
    stripe = require('stripe')(STRIPE_SECRET_KEY);
  } catch (e) {
    console.warn('Stripe no configurado con credenciales válidas, usando modo simulador.');
  }
}

const PRODUCTS = {
  pass_premium: {
    id: 'pass_premium',
    name: 'Pase de Batalla Premium',
    priceMxn: 149.00,
    description: 'Rol Premium, sobre premium diario y recompensas exclusivas hasta el nivel 50.',
    action: async (userId, client) => {
      await client.query("UPDATE users SET role = 'Premium' WHERE id = $1", [userId]);
    }
  },
  gems_1000: {
    id: 'gems_1000',
    name: '1,000 PokéGemas',
    priceMxn: 99.00,
    description: '1,000 gemas para sobres legendarios o canje por monedas.',
    action: async (userId, client) => {
      await client.query("UPDATE users SET gems = gems + 1000 WHERE id = $1", [userId]);
    }
  },
  gems_3000: {
    id: 'gems_3000',
    name: '3,000 PokéGemas (+500 Bonificación)',
    priceMxn: 249.00,
    description: '3,500 gemas totales con bonificación especial.',
    action: async (userId, client) => {
      await client.query("UPDATE users SET gems = gems + 3500 WHERE id = $1", [userId]);
    }
  }
};

// Crear sesión de Stripe Checkout o simular
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  const { productId } = req.body;
  const product = PRODUCTS[productId];

  if (!product) {
    return res.status(400).json({ error: 'Producto no válido' });
  }

  try {
    // Si Stripe está activo con credenciales reales
    if (stripe) {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'mxn',
              product_data: {
                name: product.name,
                description: product.description,
              },
              unit_amount: Math.round(product.priceMxn * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        customer_email: req.user.email,
        client_reference_id: req.user.id.toString(),
        metadata: {
          productId: product.id,
          userId: req.user.id.toString()
        },
        success_url: `${FRONTEND_URL}/sobres-tienda?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${FRONTEND_URL}/sobres-tienda?payment=cancelled`,
      });

      return res.json({ url: session.url, sessionId: session.id, isMock: false });
    }

    // Modo simulador transparente para pruebas locales/académicas
    const mockSessionId = 'cs_test_' + Math.random().toString(36).substring(2, 15);
    res.json({
      url: null,
      sessionId: mockSessionId,
      isMock: true,
      product,
      message: 'Modo de prueba Stripe: confirma el pago para recibir tus recompensas inmediatamente.'
    });
  } catch (error) {
    console.error('Error al crear checkout session:', error);
    res.status(500).json({ error: 'Error al contactar pasarela de Stripe' });
  }
});

// Confirmar pago (utilizado tanto para webhook como para confirmación directa en entorno de pruebas)
router.post('/confirm-payment', authenticateToken, async (req, res) => {
  const { productId, sessionId = 'cs_test_' + Date.now() } = req.body;
  const product = PRODUCTS[productId];

  if (!product) {
    return res.status(400).json({ error: 'Producto inválido' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Aplicar beneficio del producto
    await product.action(req.user.id, client);

    // Registrar en historial de pagos
    await client.query(`
      INSERT INTO payments (user_id, stripe_session_id, amount_mxn, product_type, status, customer_email)
      VALUES ($1, $2, $3, $4, 'completed', $5)
    `, [req.user.id, sessionId, product.priceMxn, product.name, req.user.email]);

    const updatedUser = await client.query('SELECT role, gems, coins FROM users WHERE id = $1', [req.user.id]);

    await client.query('COMMIT');

    res.json({
      message: `¡Pago de ${product.name} aprobado exitosamente con Stripe!`,
      user: updatedUser.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error al confirmar pago:', error);
    res.status(500).json({ error: 'Error al procesar el pago' });
  } finally {
    client.release();
  }
});

// Webhook de Stripe para entorno de producción/prueba
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    if (stripe && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      event = req.body;
    }
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata?.userId || session.client_reference_id;
    const productId = session.metadata?.productId;
    const product = PRODUCTS[productId];

    if (userId && product) {
      const client = await db.pool.connect();
      try {
        await client.query('BEGIN');
        await product.action(userId, client);
        await client.query(`
          INSERT INTO payments (user_id, stripe_session_id, amount_mxn, product_type, status, customer_email)
          VALUES ($1, $2, $3, $4, 'completed', $5)
        `, [userId, session.id, product.priceMxn, product.name, session.customer_email || 'stripe@user.com']);
        await client.query('COMMIT');
        console.log(`✅ Webhook Stripe procesado para usuario ${userId}: ${product.name}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error en transacción de webhook:', err);
      } finally {
        client.release();
      }
    }
  }

  res.json({ received: true });
});

module.exports = router;
