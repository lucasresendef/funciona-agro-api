import type { FastifyInstance } from 'fastify';
import { FarmAccessService } from '../auth/farm-access.service';
import { FarmPermissionRepository } from '../auth/farm-permission.repository';
import { FarmsRepository } from '../farms/farms.repository';
import { ProductsRepository } from '../products/products.repository';
import { prisma } from '../../shared/database/prisma';
import { InventoryBalanceController } from './inventory-balance.controller';
import { InventoryBalanceRepository } from './inventory-balance.repository';
import { InventoryBalanceService } from './inventory-balance.service';
import { InventoryLocationController } from './inventory-location.controller';
import { InventoryLocationRepository } from './inventory-location.repository';
import { InventoryLocationService } from './inventory-location.service';

export async function inventoryRoutes(app: FastifyInstance): Promise<void> {
  const inventoryBalanceRepository = new InventoryBalanceRepository(prisma);
  const inventoryLocationRepository = new InventoryLocationRepository(prisma);
  const farmsRepository = new FarmsRepository(prisma);
  const productsRepository = new ProductsRepository(prisma);
  const farmPermissionRepository = new FarmPermissionRepository(prisma);
  const farmAccessService = new FarmAccessService(farmPermissionRepository);
  const inventoryBalanceService = new InventoryBalanceService(
    inventoryBalanceRepository,
    inventoryLocationRepository,
    farmsRepository,
    productsRepository,
    farmAccessService,
  );
  const inventoryLocationService = new InventoryLocationService(
    inventoryLocationRepository,
    farmsRepository,
    farmAccessService,
  );
  const inventoryBalanceController = new InventoryBalanceController(inventoryBalanceService);
  const inventoryLocationController = new InventoryLocationController(inventoryLocationService);

  app.get('/inventory/balance', inventoryBalanceController.list);
  app.post('/inventory/balance', inventoryBalanceController.create);
  app.patch('/inventory/balance/:id', inventoryBalanceController.update);
  app.delete('/inventory/balance/:id', inventoryBalanceController.deactivate);
  app.get('/inventory/locations', inventoryLocationController.list);
  app.post('/inventory/locations', inventoryLocationController.create);
  app.patch('/inventory/locations/:id', inventoryLocationController.update);
  app.delete('/inventory/locations/:id', inventoryLocationController.deactivate);
}
