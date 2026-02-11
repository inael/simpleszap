import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes';
// import { startWorker } from './lib/queue';

dotenv.config({ path: '../../.env' }); // Load from root

const app = express();
const PORT = process.env.PORT || 3001;

// Start background worker
// startWorker();

app.use(cors({
  origin: [
    'https://app.simpleszap.com',
    'https://www.app.simpleszap.com',
    'https://simpleszap.com',
    'https://www.simpleszap.com',
    'http://localhost:3000'
  ],
  credentials: true
}));
app.use(express.json());

app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '1.0.0' });
});

// Export app for Vercel
export default app;

// Only listen if not running in Vercel (local development or VPS)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
