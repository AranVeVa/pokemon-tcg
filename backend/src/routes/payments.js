const express = require('express');
const router = express.Router();
const db = require('../db');
const {
  STRIPE_SECRET_KEY,
  STRIPE_PUBLISHABLE_KEY,
  STRIPE_WEBHOOK_SECRET,
  FRONTEND_URL
} = require('../config');
const { authenticateToken } = require('../middlewares/auth');

const trimmedStripeKey = (STRIPE_SECRET_KEY || '').trim();
const trimmedPublishableKey = (STRIPE_PUBLISHABLE_KEY || '').trim();
const validPublishableKey = (
  trimmedPublishableKey &&
  !trimmedPublishableKey.includes('Placeholder') &&
  !trimmedPublishableKey.includes('demo') &&
  trimmedPublishableKey.startsWith('pk_')
) ? trimmedPublishableKey : null;

const trimmedWebhookSecret = (STRIPE_WEBHOOK_SECRET || '').trim();
const hasValidWebhookSecret = Boolean(
  trimmedWebhookSecret &&
  !trimmedWebhookSecret.includes('Placeholder') &&
  !trimmedWebhookSecret.includes('demo')
);

let stripe = null;
if (trimmedStripeKey && !trimmedStripeKey.includes('Placeholder') && !trimmedStripeKey.includes('demo')) {
  try {
    stripe = require('stripe')(trimmedStripeKey);
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
      await client.query(
        "UPDATE users SET role = CASE WHEN role = 'Admin' THEN 'Admin' ELSE 'Premium' END WHERE id = $1",
        [userId]
      );
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

function resolveFrontendUrl(req) {
  const configured = (FRONTEND_URL || '').trim().replace(/\/+$/, '');
  if (configured && configured !== '*' && /^https?:\/\//i.test(configured)) {
    return configured;
  }

  const origin = (req.get('origin') || '').trim().replace(/\/+$/, '');
  if (origin && /^https?:\/\//i.test(origin)) {
    return origin;
  }

  return 'http://localhost:5173';
}

async function fulfillOrder({ userId, productId, sessionId, customerEmail }) {
  const product = PRODUCTS[productId];
  if (!product) {
    throw new Error('Producto inválido');
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    if (sessionId) {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [String(sessionId)]);
      const existingRes = await client.query(
        'SELECT id, product_type, amount_mxn, status FROM payments WHERE stripe_session_id = $1 LIMIT 1',
        [sessionId]
      );

      if (existingRes.rows.length > 0) {
        const currentUser = await client.query('SELECT role, gems, coins FROM users WHERE id = $1', [userId]);
        await client.query('COMMIT');
        return {
          alreadyProcessed: true,
          product,
          user: currentUser.rows[0] || null
        };
      }
    }

    await product.action(userId, client);

    await client.query(`
      INSERT INTO payments (user_id, stripe_session_id, amount_mxn, product_type, status, customer_email)
      VALUES ($1, $2, $3, $4, 'completed', $5)
    `, [userId, sessionId, product.priceMxn, product.name, customerEmail || 'stripe@user.com']);

    const updatedUser = await client.query('SELECT role, gems, coins FROM users WHERE id = $1', [userId]);
    await client.query('COMMIT');

    return {
      alreadyProcessed: false,
      product,
      user: updatedUser.rows[0] || null
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Consultar modo activo de pagos (expone solo la clave publicable pk_*, nunca llaves secretas)
router.get('/config', (req, res) => {
  res.json({
    stripeConfigured: Boolean(stripe),
    webhookConfigured: hasValidWebhookSecret,
    publishableKey: validPublishableKey,
    mode: stripe ? (validPublishableKey ? 'elements' : 'stripe_checkout') : 'simulator'
  });
});

// Crear PaymentIntent para pagar dentro del modal personalizado con Stripe Elements
router.post('/create-payment-intent', authenticateToken, async (req, res) => {
  const { productId, email } = req.body;
  const product = PRODUCTS[productId];

  if (!product) {
    return res.status(400).json({ error: 'Producto no válido' });
  }

  if (!stripe) {
    return res.status(400).json({ error: 'Stripe no está configurado con credenciales activas.' });
  }

  const customerEmail = (typeof email === 'string' && email.trim()) ? email.trim() : req.user.email;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(product.priceMxn * 100),
      currency: 'mxn',
      payment_method_types: ['card'],
      receipt_email: customerEmail || undefined,
      description: `${product.name} - Pokémon TCG`,
      metadata: {
        productId: product.id,
        userId: req.user.id.toString(),
        customerEmail: customerEmail || ''
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Error al crear PaymentIntent de Stripe:', error);
    res.status(500).json({ error: 'Error al iniciar pago en Stripe' });
  }
});

async function verifyAndFulfillStripePayment(req, res, { id, ownerId, isPaid, unpaidMessage, productId, customerEmail }) {
  if (!ownerId || String(ownerId) !== String(req.user.id)) {
    return res.status(403).json({ error: 'Este pago no pertenece a tu cuenta.' });
  }

  if (!isPaid) {
    return res.status(400).json({ error: unpaidMessage });
  }

  const product = PRODUCTS[productId];
  if (!product) {
    return res.status(400).json({ error: 'Producto asociado al pago no válido.' });
  }

  const result = await fulfillOrder({
    userId: req.user.id,
    productId,
    sessionId: id,
    customerEmail: customerEmail || req.user.email
  });

  return res.json({
    message: `¡Pago de ${product.name} aprobado exitosamente con Stripe!`,
    productId: product.id,
    productName: product.name,
    amountMxn: product.priceMxn,
    alreadyProcessed: result.alreadyProcessed,
    user: result.user
  });
}

// Verificar PaymentIntent completado desde Stripe Elements y acreditar recompensas
router.post('/confirm-payment-intent', authenticateToken, async (req, res) => {
  const { paymentIntentId } = req.body;

  if (!stripe) {
    return res.status(400).json({ error: 'Stripe no está configurado en el servidor.' });
  }

  if (!paymentIntentId || typeof paymentIntentId !== 'string' || !paymentIntentId.startsWith('pi_')) {
    return res.status(400).json({ error: 'ID de PaymentIntent inválido.' });
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return await verifyAndFulfillStripePayment(req, res, {
      id: paymentIntent.id,
      ownerId: paymentIntent.metadata?.userId,
      isPaid: paymentIntent.status === 'succeeded',
      unpaidMessage: 'El pago aún no figura como aprobado en Stripe.',
      productId: paymentIntent.metadata?.productId,
      customerEmail: paymentIntent.receipt_email || paymentIntent.metadata?.customerEmail
    });
  } catch (error) {
    console.error('Error al confirmar PaymentIntent de Stripe:', error);
    res.status(500).json({ error: 'No se pudo verificar el pago con Stripe.' });
  }
});

// Crear sesión de Stripe Checkout o simular
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  const { productId } = req.body;
  const product = PRODUCTS[productId];

  if (!product) {
    return res.status(400).json({ error: 'Producto no válido' });
  }

  try {
    // Si Stripe está activo con credenciales reales (test/sandbox o producción)
    if (stripe) {
      const frontendBaseUrl = resolveFrontendUrl(req);
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
        success_url: `${frontendBaseUrl}/sobres-tienda?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${frontendBaseUrl}/sobres-tienda?payment=cancelled`,
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

// Verificar sesión al regresar de Stripe Checkout (garantiza acreditación incluso sin webhook local)
router.post('/verify-session', authenticateToken, async (req, res) => {
  const { sessionId } = req.body;

  if (!stripe) {
    return res.status(400).json({ error: 'Stripe Checkout no está configurado en el servidor.' });
  }

  if (!sessionId || typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) {
    return res.status(400).json({ error: 'ID de sesión de Stripe inválido.' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return await verifyAndFulfillStripePayment(req, res, {
      id: session.id,
      ownerId: session.metadata?.userId || session.client_reference_id,
      isPaid: session.payment_status === 'paid',
      unpaidMessage: 'El pago aún no figura como completado en Stripe.',
      productId: session.metadata?.productId,
      customerEmail: session.customer_details?.email || session.customer_email
    });
  } catch (error) {
    console.error('Error al verificar sesión de Stripe:', error);
    res.status(500).json({ error: 'No se pudo verificar el pago con Stripe.' });
  }
});

// Confirmar pago en modo simulador (deshabilitado cuando Stripe real está activo)
router.post('/confirm-payment', authenticateToken, async (req, res) => {
  if (stripe) {
    return res.status(400).json({
      error: 'Stripe Checkout está activo. Completa el pago desde la pasarela de Stripe.'
    });
  }

  const { productId, sessionId = 'cs_test_' + Date.now() } = req.body;
  const product = PRODUCTS[productId];

  if (!product) {
    return res.status(400).json({ error: 'Producto inválido' });
  }

  try {
    const result = await fulfillOrder({
      userId: req.user.id,
      productId,
      sessionId,
      customerEmail: req.user.email
    });

    res.json({
      message: `¡Pago de ${product.name} aprobado exitosamente con Stripe!`,
      alreadyProcessed: result.alreadyProcessed,
      user: result.user
    });
  } catch (error) {
    console.error('Error al confirmar pago:', error);
    res.status(500).json({ error: 'Error al procesar el pago' });
  }
});

// Webhook de Stripe para entorno de producción/prueba
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    if (stripe) {
      if (!sig || !hasValidWebhookSecret) {
        console.warn('Webhook Stripe rechazado: falta stripe-signature o STRIPE_WEBHOOK_SECRET válido.');
        return res.status(400).send('Webhook Error: firma o STRIPE_WEBHOOK_SECRET no configurado.');
      }
      event = stripe.webhooks.constructEvent(req.body, sig, trimmedWebhookSecret);
    } else {
      event = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString('utf8')) : req.body;
    }
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
    const obj = event.data.object;
    const isCheckoutSession = event.type === 'checkout.session.completed';
    const isPaid = isCheckoutSession ? obj.payment_status === 'paid' : obj.status === 'succeeded';
    const userId = obj.metadata?.userId || obj.client_reference_id;
    const productId = obj.metadata?.productId;
    const customerEmail = isCheckoutSession
      ? (obj.customer_details?.email || obj.customer_email || 'stripe@user.com')
      : (obj.receipt_email || obj.metadata?.customerEmail || 'stripe@user.com');

    if (isPaid && userId && PRODUCTS[productId]) {
      try {
        const result = await fulfillOrder({
          userId,
          productId,
          sessionId: obj.id,
          customerEmail
        });
        console.log(
          result.alreadyProcessed
            ? `ℹ️ Webhook Stripe (${event.type}) ya procesado previamente para ${obj.id}`
            : `✅ Webhook Stripe (${event.type}) procesado para usuario ${userId}: ${PRODUCTS[productId].name}`
        );
      } catch (err) {
        console.error('Error en transacción de webhook:', err);
        return res.status(500).json({ error: 'Error al registrar pago del webhook' });
      }
    }
  }

  res.json({ received: true });
});

module.exports = router;
