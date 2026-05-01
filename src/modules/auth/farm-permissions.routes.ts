import type { FastifyInstance } from 'fastify';
import { FarmsRepository } from '../farms/farms.repository';
import { UsersRepository } from '../users/users.repository';
import { prisma } from '../../shared/database/prisma';
import { FarmAccessService } from './farm-access.service';
import { FarmPermissionRepository } from './farm-permission.repository';
import { FarmPermissionsController } from './farm-permissions.controller';
import { FarmPermissionsService } from './farm-permissions.service';

export async function farmPermissionsRoutes(app: FastifyInstance): Promise<void> {
  const farmPermissionRepository = new FarmPermissionRepository(prisma);
  const farmsRepository = new FarmsRepository(prisma);
  const usersRepository = new UsersRepository(prisma);
  const farmAccessService = new FarmAccessService(farmPermissionRepository);
  const farmPermissionsService = new FarmPermissionsService(
    farmPermissionRepository,
    farmsRepository,
    usersRepository,
    farmAccessService,
  );
  const farmPermissionsController = new FarmPermissionsController(farmPermissionsService);

  app.get('/farm-permissions', farmPermissionsController.list);
  app.post('/farm-permissions', farmPermissionsController.create);
  app.patch('/farm-permissions/:id', farmPermissionsController.update);
  app.delete('/farm-permissions/:id', farmPermissionsController.deactivate);
}
