import { Queue, Worker, Job } from 'bullmq';
import { EvolutionService } from '../services/evolution.service';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
};

// If REDIS_URL is provided, parse it (basic handling)
if (process.env.REDIS_URL) {
  try {
    const url = new URL(process.env.REDIS_URL);
    connection.host = url.hostname;
    connection.port = parseInt(url.port);
    connection.password = url.password;
  } catch (e) {
    console.warn('Invalid REDIS_URL, falling back to host/port');
  }
}

export const messageQueue = new Queue('message-queue', { connection });

export const startWorker = () => {
  const worker = new Worker('message-queue', async (job: Job) => {
    const { instanceName, number, text } = job.data;
    
    if (job.name === 'send-text') {
      await EvolutionService.sendText(instanceName, number, text);
    }
  }, { connection });

  worker.on('completed', job => {
    console.log(`Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed: ${err.message}`);
  });
  
  console.log('Worker started for message-queue');
};
