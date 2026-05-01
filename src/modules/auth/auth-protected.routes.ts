import type { FastifyInstance } from 'fastify';
import { prisma } from '../../shared/database/prisma';
import { UsersRepository } from '../users/users.repository';
import { AuthProfileController } from './auth-profile.controller';
import { AuthProfileService } from './auth-profile.service';
import { FarmPermissionRepository } from './farm-permission.repository';

export async function authProtectedRoutes(app: FastifyInstance): Promise<void> {
  const usersRepository = new UsersRepository(prisma);
  const farmPermissionRepository = new FarmPermissionRepository(prisma);
  const authProfileService = new AuthProfileService(usersRepository, farmPermissionRepository);
  const authProfileController = new AuthProfileController(authProfileService);

  app.get('/auth/me', authProfileController.me);
  app.post('/auth/sync-user', authProfileController.syncUser);
}
