import { prisma } from '../../shared/database/prisma';
import { AppError } from '../../shared/errors/app-error';
import type { CreateAuditFields } from '../../shared/utils/audit';
import type { UpdateAuditFields } from '../../shared/utils/audit';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { FarmAccessService } from '../auth/farm-access.service';
import type { FarmsRepository } from '../farms/farms.repository';
import type { ProductsRepository } from '../products/products.repository';
import type { InventoryLocationRepository } from './inventory-location.repository';
import type {
  CreateInventoryBalanceBody,
  ListInventoryBalanceQuery,
  UpdateInventoryBalanceBody,
} from './inventory-balance.schemas';
import { InventoryBalanceRepository } from './inventory-balance.repository';
import { InventoryMovementRepository } from './inventory-movement.repository';

export class InventoryBalanceService {
  constructor(
    private readonly inventoryBalanceRepository: InventoryBalanceRepository,
    private readonly inventoryLocationRepository: InventoryLocationRepository,
    private readonly farmsRepository: FarmsRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly farmAccessService: FarmAccessService,
  ) {}

  async list(filters: ListInventoryBalanceQuery, authUser: AuthenticatedUser | null) {
    if (!authUser) {
      throw new AppError(401, 'Authentication required.');
    }
    const allowedFarmIds = await this.farmAccessService.getAllowedFarmIds(authUser);

    if (filters.farmId) {
      await this.farmAccessService.assertUserCanAccessFarm({
        authUser,
        farmId: filters.farmId,
      });
    }

    return this.inventoryBalanceRepository.findMany(
      filters,
      authUser.tenantId,
      allowedFarmIds ?? undefined,
    );
  }

  async createOrAdjust(
    input: CreateInventoryBalanceBody,
    auditFields: CreateAuditFields,
    authUser: AuthenticatedUser | null,
  ) {
    await this.farmAccessService.assertUserCanAccessFarm({
      authUser,
      farmId: input.farmId,
    });

    const [farm, inventoryLocation, product] = await Promise.all([
      this.farmsRepository.findById(input.farmId, authUser?.tenantId),
      this.inventoryLocationRepository.findById(input.inventoryLocationId, authUser?.tenantId),
      this.productsRepository.findById(input.productId, authUser?.tenantId),
    ]);

    if (!farm) {
      throw new AppError(404, 'Farm not found.');
    }

    if (!inventoryLocation) {
      throw new AppError(404, 'Inventory location not found.');
    }

    if (inventoryLocation.farmId !== input.farmId) {
      throw new AppError(400, 'Inventory location does not belong to the informed farm.');
    }

    if (!product) {
      throw new AppError(404, 'Product not found.');
    }

    return prisma.$transaction(async (transaction) => {
      const inventoryBalanceRepository = new InventoryBalanceRepository(transaction);
      const inventoryMovementRepository = new InventoryMovementRepository(transaction);
      const currentBalance = await inventoryBalanceRepository.findByInventoryLocationAndProduct(
        input.inventoryLocationId,
        input.productId,
        authUser?.tenantId,
      );
      const currentQuantity = Number(currentBalance?.quantity ?? 0);
      const delta = input.quantity - currentQuantity;
      const balance = await inventoryBalanceRepository.upsert({
        farmId: input.farmId,
        inventoryLocationId: input.inventoryLocationId,
        productId: input.productId,
        quantity: input.quantity,
        averageUnitCost: input.averageUnitCost,
        active: true,
        ...auditFields,
      });

      if (delta !== 0) {
        await inventoryMovementRepository.create({
          farmId: input.farmId,
          inventoryLocationId: input.inventoryLocationId,
          productId: input.productId,
          movementType:
            delta > 0 ? (currentBalance ? 'ADJUSTMENT_IN' : 'ENTRY') : 'ADJUSTMENT_OUT',
          quantity: Math.abs(delta),
          unitCost: input.averageUnitCost,
          totalCost: Math.abs(delta) * input.averageUnitCost,
          occurredAt: input.occurredAt ?? new Date(),
          referenceType: 'INVENTORY_BALANCE',
          referenceId: balance.id,
          notes: input.notes ?? null,
          active: true,
          ...auditFields,
        });
      }

      return balance;
    });
  }

  async deactivate(
    id: string,
    auditFields: UpdateAuditFields,
    authUser: AuthenticatedUser | null,
  ) {
    const balance = await this.inventoryBalanceRepository.findById(id, authUser?.tenantId);

    if (!balance) {
      throw new AppError(404, 'Inventory balance not found.');
    }

    await this.farmAccessService.assertUserCanAccessFarm({
      authUser,
      farmId: balance.farmId,
    });

    return this.inventoryBalanceRepository.deactivateById(id, {
      active: false,
      ...auditFields,
    });
  }

  async update(
    id: string,
    input: UpdateInventoryBalanceBody,
    auditFields: UpdateAuditFields,
    authUser: AuthenticatedUser | null,
  ) {
    const currentBalance = await this.inventoryBalanceRepository.findById(id, authUser?.tenantId);

    if (!currentBalance) {
      throw new AppError(404, 'Inventory balance not found.');
    }

    await this.farmAccessService.assertUserCanAccessFarm({
      authUser,
      farmId: currentBalance.farmId,
    });

    const nextQuantity = input.quantity ?? Number(currentBalance.quantity);
    const nextAverageUnitCost = input.averageUnitCost ?? Number(currentBalance.averageUnitCost);
    const delta = nextQuantity - Number(currentBalance.quantity);

    return prisma.$transaction(async (transaction) => {
      const inventoryBalanceRepository = new InventoryBalanceRepository(transaction);
      const inventoryMovementRepository = new InventoryMovementRepository(transaction);
      const balance = await inventoryBalanceRepository.upsert({
        farmId: currentBalance.farmId,
        inventoryLocationId: currentBalance.inventoryLocationId,
        productId: currentBalance.productId,
        quantity: nextQuantity,
        averageUnitCost: nextAverageUnitCost,
        active: true,
        createdBy: currentBalance.createdBy,
        createdByEmail: currentBalance.createdByEmail,
        ...auditFields,
      });

      if (delta !== 0) {
        await inventoryMovementRepository.create({
          farmId: currentBalance.farmId,
          inventoryLocationId: currentBalance.inventoryLocationId,
          productId: currentBalance.productId,
          movementType: delta > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
          quantity: Math.abs(delta),
          unitCost: nextAverageUnitCost,
          totalCost: Math.abs(delta) * nextAverageUnitCost,
          occurredAt: input.occurredAt ?? new Date(),
          referenceType: 'INVENTORY_BALANCE_UPDATE',
          referenceId: balance.id,
          notes: input.notes ?? null,
          active: true,
          createdBy: auditFields.updatedBy,
          createdByEmail: auditFields.updatedByEmail,
          ...auditFields,
        });
      }

      return balance;
    });
  }
}
