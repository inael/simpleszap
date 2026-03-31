import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { clerkMiddleware } from '@clerk/express';

dotenv.config({ path: '../../.env' }); // Load from root

const app = express();
const PORT = process.env.PORT || 3001;

// Start background worker

const allowedOriginPatterns: RegExp[] = [
  /^https:\/\/([a-z0-9-]+\.)*simpleszap\.com$/i,
  /^https:\/\/([a-z0-9-]+\.)*vercel\.app$/i,
  /^http:\/\/localhost:\d+$/i,
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const isAllowed = allowedOriginPatterns.some((pattern) => pattern.test(origin));
      return callback(isAllowed ? null : new Error('Not allowed by CORS'), isAllowed);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'asaas-access-token',
      'x-vercel-protection-bypass',
      'x-vercel-set-bypass-cookie',
    ],
    optionsSuccessStatus: 204,
  }),
);

// Capture raw body for webhook verification
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString();
  }
}));

// Clerk middleware (permissive — populates auth when Clerk JWT is present)
if (process.env.CLERK_SECRET_KEY) {
  app.use(clerkMiddleware());
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

let routes: any | undefined;
try {
  routes = require('./routes').default;
} catch {
  routes = undefined;
}

if (routes) {
  app.use('/api', routes);
} else {
  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'degraded', ok: true });
  });

  app.post('/api/webhooks/asaas', (req, res) => {
    const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN || process.env.ASAAS_WEBHOOK_ACCESS_TOKEN;
    if (expectedToken) {
      const receivedToken = req.header('asaas-access-token');
      if (!receivedToken || receivedToken !== expectedToken) {
        return res.status(401).json({ ok: false });
      }
    }
    res.status(200).json({ ok: true });
  });

  app.use('/api', (req, res) => {
    res.status(503).json({ ok: false, error: 'api_routes_unavailable' });
  });
}

// Export app for Vercel
export default app;

// Only listen if not running in Vercel (local development or VPS)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
