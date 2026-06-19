import { authProtectedRoutes } from '../../modules/auth/auth-protected.routes';
import { authPublicRoutes } from '../../modules/auth/auth-public.routes';
import { farmPermissionsRoutes } from '../../modules/auth/farm-permissions.routes';
import { ensureAuthenticated } from '../../modules/auth/auth.plugin';
import type { FastifyInstance } from 'fastify';
import { fieldOperationsRoutes } from '../../modules/field-operations/field-operations.routes';
import { farmsRoutes } from '../../modules/farms/farms.routes';
import { fieldsRoutes } from '../../modules/fields/fields.routes';
import { inventoryRoutes } from '../../modules/inventory/inventory.routes';
import { productsRoutes } from '../../modules/products/products.routes';
import { reportsRoutes } from '../../modules/reports/reports.routes';
import { supportTenantsRoutes } from '../../modules/support-tenants/support-tenants.routes';
import { unitsRoutes } from '../../modules/units/units.routes';
import { usersRoutes } from '../../modules/users/users.routes';
import { healthRoutes } from './health.routes';

export async function registerAppRoutes(app: FastifyInstance): Promise<void> {
  app.register(healthRoutes);
  app.register(authPublicRoutes);

  app.register(async (protectedApp) => {
    protectedApp.addHook('preHandler', ensureAuthenticated);

    protectedApp.register(authProtectedRoutes);
    protectedApp.register(supportTenantsRoutes);
    protectedApp.register(usersRoutes);
    protectedApp.register(unitsRoutes);
    protectedApp.register(farmPermissionsRoutes);
    protectedApp.register(farmsRoutes);
    protectedApp.register(fieldsRoutes);
    protectedApp.register(productsRoutes);
    protectedApp.register(inventoryRoutes);
    protectedApp.register(fieldOperationsRoutes);
    protectedApp.register(reportsRoutes);
  });
}
