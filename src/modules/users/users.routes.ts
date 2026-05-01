import type { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/database/prisma';
import { ensureAppAdmin } from '../auth/auth.plugin';
import { UsersController } from './users.controller';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

export async function usersRoutes(app: FastifyInstance): Promise<void> {
  const usersRepository = new UsersRepository(prisma);
  const usersService = new UsersService(usersRepository);
  const usersController = new UsersController(usersService);

  app.get('/users', { preHandler: ensureAppAdmin }, usersController.list);
  app.post('/users', { preHandler: ensureAppAdmin }, usersController.create);
  app.patch('/users/:id', { preHandler: ensureAppAdmin }, usersController.update);
  app.delete('/users/:id', { preHandler: ensureAppAdmin }, usersController.deactivate);
}
