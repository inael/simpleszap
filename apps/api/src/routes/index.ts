import { Router } from 'express';
import { InstanceController } from '../controllers/instance.controller';
import { PricingController } from '../controllers/pricing.controller';
import { AdminPlanController } from '../controllers/admin-plan.controller';
import { AdminUserController } from '../controllers/admin-user.controller';
import { AdminMetricsController } from '../controllers/admin-metrics.controller';
import { AdminAuditController } from '../controllers/admin-audit.controller';
import { AdminSettingsController } from '../controllers/admin-settings.controller';
import { ApiKeyController } from '../controllers/api-key.controller';
import { WebhookController } from '../controllers/webhook.controller';
import { SubscriptionController } from '../controllers/subscription.controller';
import { MessagesController } from '../controllers/messages.controller';
import { ContactsController } from '../controllers/contacts.controller';
import { TemplatesController } from '../controllers/templates.controller';
import { WebhookConfigController } from '../controllers/webhook-config.controller';
import { CampaignsController } from '../controllers/campaigns.controller';
import { rateLimit } from '../middleware/rate-limit';
import { orgAuth } from '../middleware/org-auth';
import { requireScope } from '../middleware/scope-auth';
import { requireAdmin } from '../middleware/admin-auth';

const router = Router();

// Public Routes
router.get('/pricing', PricingController.getPlans);
router.post('/webhooks/clerk', WebhookController.handleClerk);

// Subscription
router.post('/subscription/checkout', SubscriptionController.createCheckout);

// Instance Routes
router.get('/instances', orgAuth, InstanceController.list);
router.post('/instance/create', orgAuth, requireScope('instances:create'), InstanceController.create);
router.get('/instance/qr/:id', InstanceController.getQr);
router.delete('/instance/:id', orgAuth, InstanceController.delete);

// API Keys
router.get('/api-keys', orgAuth, ApiKeyController.list);
router.post('/api-keys', orgAuth, ApiKeyController.create);
router.delete('/api-keys/:id', ApiKeyController.revoke);

// Message Routes (Protected by Rate Limit)
router.post('/message/sendText/:instanceId', orgAuth, requireScope('messages:send'), rateLimit, InstanceController.sendText);
router.get('/messages', orgAuth, MessagesController.list);

// Contacts
router.get('/contacts', orgAuth, ContactsController.list);
router.post('/contacts', orgAuth, ContactsController.create);
router.put('/contacts/:id', orgAuth, ContactsController.update);
router.delete('/contacts/:id', orgAuth, ContactsController.remove);

// Templates
router.get('/templates', orgAuth, TemplatesController.list);
router.post('/templates', orgAuth, TemplatesController.create);
router.put('/templates/:id', orgAuth, TemplatesController.update);
router.delete('/templates/:id', orgAuth, TemplatesController.remove);

// Webhooks
router.get('/webhooks/config', orgAuth, WebhookConfigController.list);
router.post('/webhooks/config', orgAuth, WebhookConfigController.create);
router.put('/webhooks/config/:id', orgAuth, WebhookConfigController.update);
router.delete('/webhooks/config/:id', orgAuth, WebhookConfigController.remove);
router.get('/webhooks/logs', orgAuth, WebhookConfigController.logs);

// Campaigns
router.get('/campaigns', orgAuth, CampaignsController.list);
router.post('/campaigns', orgAuth, CampaignsController.create);
router.post('/campaigns/:id/run', orgAuth, CampaignsController.run);

// Admin Routes (Protected by requireAdmin)
router.get('/admin/plans', requireAdmin, AdminPlanController.list);
router.post('/admin/plans', requireAdmin, AdminPlanController.create);
router.put('/admin/plans/:id', requireAdmin, AdminPlanController.update);
router.get('/admin/users', requireAdmin, AdminUserController.list);
router.get('/admin/metrics', requireAdmin, AdminMetricsController.get);
router.get('/admin/audit-logs', requireAdmin, AdminAuditController.list);
router.get('/admin/settings', requireAdmin, AdminSettingsController.get);
router.put('/admin/settings', requireAdmin, AdminSettingsController.update);

export default router;
