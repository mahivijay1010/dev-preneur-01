require('dotenv').config({ quiet: true });

const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const mongoose = require('mongoose');

const { getMongoUri } = require('./lib/config');
const aiRoutes = require('./routes/ai');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');

const app = express();
const port = Number(process.env.PORT) || 4000;
const allowedOrigins = String(process.env.CLIENT_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000,http://localhost:19006')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.disable('x-powered-by');
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin(origin, callback) {
      const isLocalDev = process.env.NODE_ENV !== 'production'
        && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || '');
      if (!origin || allowedOrigins.includes(origin) || isLocalDev) return callback(null, true);
      return callback(new Error('Origin is not allowed by CORS.'));
    },
  }),
);
app.use(express.json({ limit: '12mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ai', aiRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  const status = error?.type === 'entity.too.large' ? 413 : 500;
  res.status(status).json({ error: status === 413 ? 'Request is too large.' : 'Something went wrong.' });
});

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters.');
  }
  await mongoose.connect(getMongoUri(), { serverSelectionTimeoutMS: 10000 });
  app.listen(port, () => console.log(`FitPlan API listening on http://localhost:${port}`));
}

start().catch((error) => {
  console.error(`Failed to start API: ${error.message}`);
  process.exit(1);
});
