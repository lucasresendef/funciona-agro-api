import type { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/database/prisma';
import { ensureAppAdmin } from '../auth/auth.plugin';
import { KeycloakAdminService } from '../support-tenants/keycloak-admin.service';
import { SupportTenantsRepository } from '../support-tenants/support-tenants.repository';
import { SupportTenantsService } from '../support-tenants/support-tenants.service';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

export async function usersRoutes(app: FastifyInstance): Promise<void> {
  const usersRepository = new UsersRepository(prisma);
  const usersService = new UsersService(usersRepository);
  const supportTenantsService = new SupportTenantsService(
    prisma,
    new SupportTenantsRepository(prisma),
    new KeycloakAdminService(),
  );
  const usersController = new UsersController(usersService, supportTenantsService);

  app.get('/users', { preHandler: ensureAppAdmin }, usersController.list);
  app.post('/users', { preHandler: ensureAppAdmin }, usersController.create);
  app.patch('/users/:id', { preHandler: ensureAppAdmin }, usersController.update);
  app.post(
    '/users/:id/reset-password',
    { preHandler: ensureAppAdmin },
    usersController.resetPassword,
  );
  app.post('/users/:id/link-keycloak', { preHandler: ensureAppAdmin }, usersController.linkKeycloak);
  app.delete('/users/:id', { preHandler: ensureAppAdmin }, usersController.deactivate);
}
