import type { FastifyInstance } from 'fastify';
import { ensureSupportAdmin } from '../auth/auth.plugin';
import { prisma } from '../../shared/database/prisma';
import { KeycloakAdminService } from './keycloak-admin.service';
import { SupportTenantsController } from './support-tenants.controller';
import { SupportTenantsRepository } from './support-tenants.repository';
import { SupportTenantsService } from './support-tenants.service';

export async function supportTenantsRoutes(app: FastifyInstance): Promise<void> {
  const supportTenantsRepository = new SupportTenantsRepository(prisma);
  const keycloakAdminService = new KeycloakAdminService();
  const supportTenantsService = new SupportTenantsService(
    prisma,
    supportTenantsRepository,
    keycloakAdminService,
  );
  const supportTenantsController = new SupportTenantsController(supportTenantsService);

  app.get(
    '/support/catalog/units',
    { preHandler: ensureSupportAdmin },
    supportTenantsController.listCatalogUnits,
  );
  app.post(
    '/support/catalog/units',
    { preHandler: ensureSupportAdmin },
    supportTenantsController.createCatalogUnit,
  );
  app.patch(
    '/support/catalog/units/:unitId',
    { preHandler: ensureSupportAdmin },
    supportTenantsController.updateCatalogUnit,
  );
  app.delete(
    '/support/catalog/units/:unitId',
    { preHandler: ensureSupportAdmin },
    supportTenantsController.deactivateCatalogUnit,
  );
  app.get('/support/tenants', { preHandler: ensureSupportAdmin }, supportTenantsController.listTenants);
  app.get(
    '/support/tenants/:tenantId',
    { preHandler: ensureSupportAdmin },
    supportTenantsController.getTenant,
  );
  app.post('/support/tenants', { preHandler: ensureSupportAdmin }, supportTenantsController.createTenant);
  app.patch(
    '/support/tenants/:tenantId',
    { preHandler: ensureSupportAdmin },
    supportTenantsController.updateTenant,
  );
  app.delete(
    '/support/tenants/:tenantId',
    { preHandler: ensureSupportAdmin },
    supportTenantsController.deactivateTenant,
  );
  app.post(
    '/support/tenants/:tenantId/users',
    { preHandler: ensureSupportAdmin },
    supportTenantsController.createTenantUser,
  );
  app.patch(
    '/support/tenants/:tenantId/users/:userId',
    { preHandler: ensureSupportAdmin },
    supportTenantsController.updateTenantUser,
  );
  app.post(
    '/support/tenants/:tenantId/users/:userId/reset-password',
    { preHandler: ensureSupportAdmin },
    supportTenantsController.resetTenantUserPassword,
  );
  app.delete(
    '/support/tenants/:tenantId/users/:userId',
    { preHandler: ensureSupportAdmin },
    supportTenantsController.deactivateTenantUser,
  );
  app.post(
    '/support/tenants/:tenantId/farms',
    { preHandler: ensureSupportAdmin },
    supportTenantsController.createTenantFarm,
  );
  app.patch(
    '/support/tenants/:tenantId/farms/:farmId',
    { preHandler: ensureSupportAdmin },
    supportTenantsController.updateTenantFarm,
  );
  app.delete(
    '/support/tenants/:tenantId/farms/:farmId',
    { preHandler: ensureSupportAdmin },
    supportTenantsController.deactivateTenantFarm,
  );
  app.post(
    '/support/tenants/:tenantId/fields',
    { preHandler: ensureSupportAdmin },
    supportTenantsController.createTenantField,
  );
  app.patch(
    '/support/tenants/:tenantId/fields/:fieldId',
    { preHandler: ensureSupportAdmin },
    supportTenantsController.updateTenantField,
  );
  app.delete(
    '/support/tenants/:tenantId/fields/:fieldId',
    { preHandler: ensureSupportAdmin },
    supportTenantsController.deactivateTenantField,
  );
  app.post(
    '/support/tenants/:tenantId/permissions',
    { preHandler: ensureSupportAdmin },
    supportTenantsController.createTenantPermission,
  );
  app.patch(
    '/support/tenants/:tenantId/permissions/:permissionId',
    { preHandler: ensureSupportAdmin },
    supportTenantsController.updateTenantPermission,
  );
  app.delete(
    '/support/tenants/:tenantId/permissions/:permissionId',
    { preHandler: ensureSupportAdmin },
    supportTenantsController.deactivateTenantPermission,
  );
}
