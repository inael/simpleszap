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
import { AsaasWebhookController } from '../controllers/asaas-webhook.controller';
import { CampaignsController } from '../controllers/campaigns.controller';
import { DashboardController } from '../controllers/dashboard.controller';
import { UserSettingsController } from '../controllers/user-settings.controller';
import { MeController } from '../controllers/me.controller';
import { AdminCouponController } from '../controllers/admin-coupon.controller';
import { CouponController } from '../controllers/coupon.controller';
import { rateLimit } from '../middleware/rate-limit';
import { orgAuthWithSecurity } from '../middleware/auth-chain';
import { requireScope } from '../middleware/scope-auth';
import { requireAdmin } from '../middleware/admin-auth';

const router = Router();

// Public Routes
router.get('/pricing', PricingController.getPlans);
router.post('/webhooks/logto', WebhookController.handleLogto);
router.post('/webhooks/asaas', AsaasWebhookController.handle);

// Dashboard
router.get('/dashboard/metrics', orgAuthWithSecurity, DashboardController.metrics);

// Conta atual
router.get('/me', orgAuthWithSecurity, MeController.profile);
router.put('/me', orgAuthWithSecurity, MeController.updateProfile);
router.get('/me/subscription', orgAuthWithSecurity, MeController.subscription);

// Subscription
router.post('/subscription/checkout', orgAuthWithSecurity, SubscriptionController.createCheckout);

// Cupons (público para usuário autenticado validar)
router.post('/coupons/validate', orgAuthWithSecurity, CouponController.validate);

// Cupons (admin CRUD)
router.get('/admin/coupons', requireAdmin, AdminCouponController.list);
router.post('/admin/coupons', requireAdmin, AdminCouponController.create);
router.put('/admin/coupons/:id', requireAdmin, AdminCouponController.update);
router.delete('/admin/coupons/:id', requireAdmin, AdminCouponController.remove);
router.get('/admin/coupons/:id/redemptions', requireAdmin, AdminCouponController.redemptions);

// Instance Routes
router.get('/instances', orgAuthWithSecurity, InstanceController.list);
router.post('/instance/create', orgAuthWithSecurity, requireScope('instances:create'), InstanceController.create);
router.get('/instance/qr/:id', InstanceController.getQr);
router.delete('/instance/:id', orgAuthWithSecurity, InstanceController.delete);

// API Keys
router.get('/api-keys', orgAuthWithSecurity, ApiKeyController.list);
router.post('/api-keys', orgAuthWithSecurity, ApiKeyController.create);
router.delete('/api-keys/:id', orgAuthWithSecurity, ApiKeyController.revoke);

// Message Routes (Protected by Rate Limit)
router.post('/message/sendText/:instanceId', orgAuthWithSecurity, requireScope('messages:send'), rateLimit, InstanceController.sendText);
router.get('/messages', orgAuthWithSecurity, MessagesController.list);

// Contacts
router.get('/contacts', orgAuthWithSecurity, ContactsController.list);
router.post('/contacts', orgAuthWithSecurity, ContactsController.create);
router.put('/contacts/:id', orgAuthWithSecurity, ContactsController.update);
router.delete('/contacts/:id', orgAuthWithSecurity, ContactsController.remove);

// Templates
router.get('/templates', orgAuthWithSecurity, TemplatesController.list);
router.post('/templates', orgAuthWithSecurity, TemplatesController.create);
router.put('/templates/:id', orgAuthWithSecurity, TemplatesController.update);
router.delete('/templates/:id', orgAuthWithSecurity, TemplatesController.remove);

// Webhooks
router.get('/webhooks/config', orgAuthWithSecurity, WebhookConfigController.list);
router.post('/webhooks/config', orgAuthWithSecurity, WebhookConfigController.create);
router.put('/webhooks/config/:id', orgAuthWithSecurity, WebhookConfigController.update);
router.delete('/webhooks/config/:id', orgAuthWithSecurity, WebhookConfigController.remove);
router.get('/webhooks/logs', orgAuthWithSecurity, WebhookConfigController.logs);

// Preferências (envio em massa, segurança)
router.get('/user/settings', orgAuthWithSecurity, UserSettingsController.get);
router.put('/user/settings', orgAuthWithSecurity, UserSettingsController.put);
router.post('/user/settings/accept-bulk-terms', orgAuthWithSecurity, UserSettingsController.acceptTerms);
router.post('/user/settings/client-token/regenerate', orgAuthWithSecurity, UserSettingsController.regenerateClientToken);
router.post('/user/settings/client-token/disable', orgAuthWithSecurity, UserSettingsController.disableClientToken);

// Campaigns
router.get('/campaigns', orgAuthWithSecurity, CampaignsController.list);
router.post('/campaigns', orgAuthWithSecurity, CampaignsController.create);
router.post('/campaigns/:id/run', orgAuthWithSecurity, CampaignsController.run);

// Admin Routes (Protected by requireAdmin)
router.get('/admin/plans', requireAdmin, AdminPlanController.list);
router.post('/admin/plans', requireAdmin, AdminPlanController.create);
router.put('/admin/plans/:id', requireAdmin, AdminPlanController.update);
router.post('/admin/plans/:id/sync-asaas', requireAdmin, AdminPlanController.syncToAsaas);
router.delete('/admin/plans/:id/sync-asaas', requireAdmin, AdminPlanController.unsyncFromAsaas);
router.get('/admin/asaas/plans', requireAdmin, AdminPlanController.listAsaasPlans);
router.get('/admin/users', requireAdmin, AdminUserController.list);
router.get('/admin/metrics', requireAdmin, AdminMetricsController.get);
router.get('/admin/audit-logs', requireAdmin, AdminAuditController.list);
router.get('/admin/settings', requireAdmin, AdminSettingsController.get);
router.put('/admin/settings', requireAdmin, AdminSettingsController.update);
router.get('/admin/settings/asaas', requireAdmin, AdminSettingsController.getAsaasConfig);
router.put('/admin/settings/asaas', requireAdmin, AdminSettingsController.saveAsaasConfig);
router.post('/admin/settings/asaas/test', requireAdmin, AdminSettingsController.testAsaasConnection);
router.post('/admin/settings/asaas/webhook', requireAdmin, AdminSettingsController.registerAsaasWebhook);
router.get('/admin/settings/asaas/webhook', requireAdmin, AdminSettingsController.getAsaasWebhookStatus);
router.post('/admin/settings/asaas/webhook/token', requireAdmin, AdminSettingsController.generateWebhookToken);

export default router;
