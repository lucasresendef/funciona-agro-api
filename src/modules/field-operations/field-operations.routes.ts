import type { FastifyInstance } from 'fastify';
import { FarmAccessService } from '../auth/farm-access.service';
import { FarmPermissionRepository } from '../auth/farm-permission.repository';
import { FieldsRepository } from '../fields/fields.repository';
import { FarmsRepository } from '../farms/farms.repository';
import { InventoryLocationRepository } from '../inventory/inventory-location.repository';
import { ProductsRepository } from '../products/products.repository';
import { prisma } from '../../shared/database/prisma';
import { FieldOperationCostService } from './field-operation-cost.service';
import { FieldOperationsController } from './field-operations.controller';
import { FieldOperationsRepository } from './field-operations.repository';
import { FieldOperationsService } from './field-operations.service';

export async function fieldOperationsRoutes(app: FastifyInstance): Promise<void> {
  const fieldOperationsRepository = new FieldOperationsRepository(prisma);
  const farmsRepository = new FarmsRepository(prisma);
  const fieldsRepository = new FieldsRepository(prisma);
  const inventoryLocationRepository = new InventoryLocationRepository(prisma);
  const productsRepository = new ProductsRepository(prisma);
  const farmPermissionRepository = new FarmPermissionRepository(prisma);
  const farmAccessService = new FarmAccessService(farmPermissionRepository);
  const fieldOperationCostService = new FieldOperationCostService();
  const fieldOperationsService = new FieldOperationsService(
    fieldOperationsRepository,
    farmsRepository,
    fieldsRepository,
    inventoryLocationRepository,
    productsRepository,
    farmAccessService,
    fieldOperationCostService,
  );
  const fieldOperationsController = new FieldOperationsController(fieldOperationsService);

  app.get('/field-operations', fieldOperationsController.list);
  app.post('/field-operations', fieldOperationsController.create);
  app.patch('/field-operations/:id', fieldOperationsController.update);
  app.delete('/field-operations/:id', fieldOperationsController.deactivate);
}
