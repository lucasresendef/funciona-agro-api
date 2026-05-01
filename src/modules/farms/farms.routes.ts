import type { FastifyInstance } from 'fastify';
import { FarmAccessService } from '../auth/farm-access.service';
import { FarmPermissionRepository } from '../auth/farm-permission.repository';
import { ensureAppAdmin } from '../auth/auth.plugin';
import { prisma } from '../../shared/database/prisma';
import { FarmsController } from './farms.controller';
import { FarmsRepository } from './farms.repository';
import { FarmsService } from './farms.service';

export async function farmsRoutes(app: FastifyInstance): Promise<void> {
  const farmsRepository = new FarmsRepository(prisma);
  const farmPermissionRepository = new FarmPermissionRepository(prisma);
  const farmAccessService = new FarmAccessService(farmPermissionRepository);
  const farmsService = new FarmsService(farmsRepository, farmAccessService);
  const farmsController = new FarmsController(farmsService);

  app.get('/farms', farmsController.list);
  app.post('/farms', { preHandler: ensureAppAdmin }, farmsController.create);
  app.patch('/farms/:id', { preHandler: ensureAppAdmin }, farmsController.update);
  app.delete('/farms/:id', { preHandler: ensureAppAdmin }, farmsController.deactivate);
}
