import type { FastifyInstance } from 'fastify';
import { FarmAccessService } from '../auth/farm-access.service';
import { FarmPermissionRepository } from '../auth/farm-permission.repository';
import { ensureAppAdmin } from '../auth/auth.plugin';
import { InventoryLocationRepository } from '../inventory/inventory-location.repository';
import { UnitsRepository } from '../units/units.repository';
import { prisma } from '../../shared/database/prisma';
import { ProductsController } from './products.controller';
import { ProductsRepository } from './products.repository';
import { ProductsService } from './products.service';

export async function productsRoutes(app: FastifyInstance): Promise<void> {
  const productsRepository = new ProductsRepository(prisma);
  const unitsRepository = new UnitsRepository(prisma);
  const inventoryLocationRepository = new InventoryLocationRepository(prisma);
  const farmPermissionRepository = new FarmPermissionRepository(prisma);
  const farmAccessService = new FarmAccessService(farmPermissionRepository);
  const productsService = new ProductsService(
    productsRepository,
    unitsRepository,
    inventoryLocationRepository,
    farmAccessService,
  );
  const productsController = new ProductsController(productsService);

  app.get('/products', productsController.list);
  app.post('/products', { preHandler: ensureAppAdmin }, productsController.create);
  app.patch('/products/:id', { preHandler: ensureAppAdmin }, productsController.update);
  app.delete('/products/:id', { preHandler: ensureAppAdmin }, productsController.deactivate);
}
