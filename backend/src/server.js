const express = require('express');
const cors = require('cors');
const { PORT, INTERVALO_SOBRE_MIN, MODO_DEMO } = require('./config');

const authRoutes = require('./routes/auth');
const packsRoutes = require('./routes/packs');
const cardsRoutes = require('./routes/cards');
const tradesRoutes = require('./routes/trades');
const battlePassRoutes = require('./routes/battlePass');
const friendsRoutes = require('./routes/friends');
const battlesRoutes = require('./routes/battles');
const itemsRoutes = require('./routes/items');
const paymentsRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');

const app = express();

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Stripe webhook requires raw body, handle before json parsing
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/packs', packsRoutes);
app.use('/api/cards', cardsRoutes);
app.use('/api/trades', tradesRoutes);
app.use('/api/battle-pass', battlePassRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/battles', battlesRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    appName: 'Pokémon TCG API',
    modoDemo: MODO_DEMO,
    intervaloSobreMin: INTERVALO_SOBRE_MIN,
    timestamp: new Date().toISOString()
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Ocurrió un error inesperado en el servidor' });
});

app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🎮 POKÉMON TCG BACKEND SERVER RUNNING`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`⏱️ Modo Demo: ${MODO_DEMO ? 'ACTIVO (Sobres cada 4 min)' : 'DESACTIVADO (Sobres cada 4 horas)'}`);
  console.log(`===============================================`);
});
