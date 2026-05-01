import type { FastifyInstance } from 'fastify';
import { FarmAccessService } from '../auth/farm-access.service';
import { FarmPermissionRepository } from '../auth/farm-permission.repository';
import { FarmsRepository } from '../farms/farms.repository';
import { prisma } from '../../shared/database/prisma';
import { FieldsController } from './fields.controller';
import { FieldsRepository } from './fields.repository';
import { FieldsService } from './fields.service';

export async function fieldsRoutes(app: FastifyInstance): Promise<void> {
  const fieldsRepository = new FieldsRepository(prisma);
  const farmsRepository = new FarmsRepository(prisma);
  const farmPermissionRepository = new FarmPermissionRepository(prisma);
  const farmAccessService = new FarmAccessService(farmPermissionRepository);
  const fieldsService = new FieldsService(fieldsRepository, farmsRepository, farmAccessService);
  const fieldsController = new FieldsController(fieldsService);

  app.get('/fields', fieldsController.list);
  app.post('/fields', fieldsController.create);
  app.patch('/fields/:id', fieldsController.update);
  app.delete('/fields/:id', fieldsController.deactivate);
}
