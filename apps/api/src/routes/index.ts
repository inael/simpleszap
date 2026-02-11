import { Router } from 'express';
import { InstanceController } from '../controllers/instance.controller';
import { PricingController } from '../controllers/pricing.controller';
import { AdminPlanController } from '../controllers/admin-plan.controller';
import { ApiKeyController } from '../controllers/api-key.controller';
import { WebhookController } from '../controllers/webhook.controller';
import { SubscriptionController } from '../controllers/subscription.controller';
import { MessagesController } from '../controllers/messages.controller';
import { ContactsController } from '../controllers/contacts.controller';
import { TemplatesController } from '../controllers/templates.controller';
import { rateLimit } from '../middleware/rate-limit';

const router = Router();

// Public Routes
router.get('/pricing', PricingController.getPlans);
router.post('/webhooks/clerk', WebhookController.handleClerk);

// Subscription
router.post('/subscription/checkout', SubscriptionController.createCheckout);

// Instance Routes
router.get('/instances', InstanceController.list);
router.post('/instance/create', InstanceController.create);
router.get('/instance/qr/:id', InstanceController.getQr);
router.delete('/instance/:id', InstanceController.delete);

// API Keys
router.get('/api-keys', ApiKeyController.list);
router.post('/api-keys', ApiKeyController.create);
router.delete('/api-keys/:id', ApiKeyController.revoke);

// Message Routes (Protected by Rate Limit)
router.post('/message/sendText/:instanceId', rateLimit, InstanceController.sendText);
router.get('/messages', MessagesController.list);

// Contacts
router.get('/contacts', ContactsController.list);
router.post('/contacts', ContactsController.create);
router.put('/contacts/:id', ContactsController.update);
router.delete('/contacts/:id', ContactsController.remove);

// Templates
router.get('/templates', TemplatesController.list);
router.post('/templates', TemplatesController.create);
router.put('/templates/:id', TemplatesController.update);
router.delete('/templates/:id', TemplatesController.remove);

// Admin Routes (TODO: Add Auth Middleware)
router.get('/admin/plans', AdminPlanController.list);
router.post('/admin/plans', AdminPlanController.create);
router.put('/admin/plans/:id', AdminPlanController.update);

export default router;
