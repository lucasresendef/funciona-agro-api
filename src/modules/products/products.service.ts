import { AppError } from '../../shared/errors/app-error';
import { prisma } from '../../shared/database/prisma';
import type { CreateAuditFields } from '../../shared/utils/audit';
import type { UpdateAuditFields } from '../../shared/utils/audit';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { FarmAccessService } from '../auth/farm-access.service';
import { InventoryBalanceRepository } from '../inventory/inventory-balance.repository';
import type { InventoryLocationRepository } from '../inventory/inventory-location.repository';
import { InventoryMovementRepository } from '../inventory/inventory-movement.repository';
import type { UnitsRepository } from '../units/units.repository';
import type { CreateProductBody, ListProductsQuery, UpdateProductBody } from './products.schemas';
import { ProductsRepository } from './products.repository';

export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly unitsRepository: UnitsRepository,
    private readonly inventoryLocationRepository: InventoryLocationRepository,
    private readonly farmAccessService: FarmAccessService,
  ) {}

  async list(filters: ListProductsQuery, authUser: AuthenticatedUser | null) {
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

    const products = await this.productsRepository.findMany(
      filters,
      authUser.tenantId,
      allowedFarmIds ?? undefined,
    );
    const data = products.data.map((product) => {
      const stockByLocation = product.inventoryBalances.map((balance) => ({
        farmId: balance.inventoryLocation.farmId,
        farmName: balance.inventoryLocation.farm.name,
        inventoryLocationId: balance.inventoryLocationId,
        inventoryLocationName: balance.inventoryLocation.name,
        quantity: Number(balance.quantity),
        averageUnitCost: Number(balance.averageUnitCost),
      }));

      return {
        ...product,
        stockByLocation,
        totalStockQuantity: stockByLocation.reduce((total, item) => total + item.quantity, 0),
      };
    });

    return {
      data,
      pagination: products.pagination,
    };
  }

  async create(input: CreateProductBody, auditFields: CreateAuditFields, authUser: AuthenticatedUser) {
    const unit = await this.unitsRepository.findById(input.unitOfMeasureId);

    if (!unit) {
      throw new AppError(404, 'Unit of measure not found.');
    }

    const stockByLocation = input.stockByLocation;
    const uniqueLocationIds = [...new Set(stockByLocation.map((item) => item.inventoryLocationId))];

    if (uniqueLocationIds.length !== stockByLocation.length) {
      throw new AppError(400, 'Repeated inventory location in product stock definition.');
    }

    const locations = await this.inventoryLocationRepository.findManyByIds(
      uniqueLocationIds,
      authUser.tenantId,
    );

    if (locations.length !== uniqueLocationIds.length) {
      throw new AppError(404, 'One or more inventory locations were not found.');
    }

    const locationById = new Map(locations.map((location) => [location.id, location]));

    for (const stockItem of stockByLocation) {
      const location = locationById.get(stockItem.inventoryLocationId);

      if (!location) {
        throw new AppError(404, 'Inventory location not found.');
      }

      if (!location.active) {
        throw new AppError(400, `Inventory location ${location.id} is inactive.`);
      }

      if (location.farmId !== stockItem.farmId) {
        throw new AppError(
          400,
          `Inventory location ${location.id} does not belong to farm ${stockItem.farmId}.`,
        );
      }
    }

    return prisma.$transaction(async (transaction) => {
      const txProductsRepository = new ProductsRepository(transaction);
      const inventoryBalanceRepository = new InventoryBalanceRepository(transaction);
      const inventoryMovementRepository = new InventoryMovementRepository(transaction);
      const product = await txProductsRepository.create({
        name: input.name,
        code: input.code,
        category: input.category,
        description: input.description ?? null,
        activeIngredient: input.activeIngredient ?? null,
        unitOfMeasureId: input.unitOfMeasureId,
        active: true,
        ...auditFields,
      });

      await Promise.all(
        stockByLocation.map((stockItem) =>
          inventoryBalanceRepository.upsert({
            farmId: stockItem.farmId,
            inventoryLocationId: stockItem.inventoryLocationId,
            productId: product.id,
            quantity: stockItem.quantity,
            averageUnitCost: stockItem.averageUnitCost,
            active: true,
            ...auditFields,
          }),
        ),
      );

      const movements = stockByLocation
        .filter((stockItem) => stockItem.quantity > 0)
        .map((stockItem) => ({
          farmId: stockItem.farmId,
          inventoryLocationId: stockItem.inventoryLocationId,
          productId: product.id,
          movementType: 'ENTRY' as const,
          quantity: stockItem.quantity,
          unitCost: stockItem.averageUnitCost,
          totalCost: stockItem.quantity * stockItem.averageUnitCost,
          occurredAt: new Date(),
          referenceType: 'PRODUCT_CREATE',
          referenceId: product.id,
          notes: stockItem.notes ?? null,
          active: true,
          ...auditFields,
        }));

      if (movements.length > 0) {
        await inventoryMovementRepository.createMany(movements);
      }

      return product;
    });
  }

  async update(
    id: string,
    input: UpdateProductBody,
    auditFields: UpdateAuditFields,
    authUser: AuthenticatedUser,
  ) {
    const existingProduct = await this.productsRepository.findByIdWithStock(id, authUser.tenantId);

    if (!existingProduct) {
      throw new AppError(404, 'Product not found.');
    }

    if (input.unitOfMeasureId) {
      const unit = await this.unitsRepository.findById(input.unitOfMeasureId);

      if (!unit) {
        throw new AppError(404, 'Unit of measure not found.');
      }
    }

    if (!input.stockByLocation) {
      return this.productsRepository.updateById(id, {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.activeIngredient !== undefined ? { activeIngredient: input.activeIngredient } : {}),
        ...(input.unitOfMeasureId !== undefined ? { unitOfMeasureId: input.unitOfMeasureId } : {}),
        ...auditFields,
      });
    }

    const stockByLocation = input.stockByLocation;
    const uniqueLocationIds = [...new Set(stockByLocation.map((item) => item.inventoryLocationId))];

    if (uniqueLocationIds.length !== stockByLocation.length) {
      throw new AppError(400, 'Repeated inventory location in product stock definition.');
    }

    const locations = await this.inventoryLocationRepository.findManyByIds(
      uniqueLocationIds,
      authUser.tenantId,
    );

    if (locations.length !== uniqueLocationIds.length) {
      throw new AppError(404, 'One or more inventory locations were not found.');
    }

    const locationById = new Map(locations.map((location) => [location.id, location]));
    const existingBalancesByLocation = new Map(
      existingProduct.inventoryBalances.map((balance) => [balance.inventoryLocationId, balance]),
    );

    for (const stockItem of stockByLocation) {
      const location = locationById.get(stockItem.inventoryLocationId);

      if (!location) {
        throw new AppError(404, 'Inventory location not found.');
      }

      if (!location.active) {
        throw new AppError(400, `Inventory location ${location.id} is inactive.`);
      }

      if (location.farmId !== stockItem.farmId) {
        throw new AppError(
          400,
          `Inventory location ${location.id} does not belong to farm ${stockItem.farmId}.`,
        );
      }
    }

    return prisma.$transaction(async (transaction) => {
      const txProductsRepository = new ProductsRepository(transaction);
      const inventoryBalanceRepository = new InventoryBalanceRepository(transaction);
      const inventoryMovementRepository = new InventoryMovementRepository(transaction);

      const product = await txProductsRepository.updateById(id, {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.activeIngredient !== undefined ? { activeIngredient: input.activeIngredient } : {}),
        ...(input.unitOfMeasureId !== undefined ? { unitOfMeasureId: input.unitOfMeasureId } : {}),
        ...auditFields,
      });

      const movementAdjustments: Parameters<InventoryMovementRepository['createMany']>[0] = [];
      for (const stockItem of stockByLocation) {
        const existingBalance = existingBalancesByLocation.get(stockItem.inventoryLocationId);
        const currentQuantity = Number(existingBalance?.quantity ?? 0);
        const delta = stockItem.quantity - currentQuantity;

        await inventoryBalanceRepository.upsert({
          farmId: stockItem.farmId,
          inventoryLocationId: stockItem.inventoryLocationId,
          productId: product.id,
          quantity: stockItem.quantity,
          averageUnitCost: stockItem.averageUnitCost,
          active: true,
          createdBy: existingBalance?.createdBy ?? auditFields.updatedBy,
          createdByEmail: existingBalance?.createdByEmail ?? auditFields.updatedByEmail,
          ...auditFields,
        });

        if (delta !== 0) {
          movementAdjustments.push({
            farmId: stockItem.farmId,
            inventoryLocationId: stockItem.inventoryLocationId,
            productId: product.id,
            movementType: delta > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
            quantity: Math.abs(delta),
            unitCost: stockItem.averageUnitCost,
            totalCost: Math.abs(delta) * stockItem.averageUnitCost,
            occurredAt: new Date(),
            referenceType: 'PRODUCT_UPDATE',
            referenceId: product.id,
            notes: stockItem.notes ?? null,
            active: true,
            createdBy: auditFields.updatedBy,
            createdByEmail: auditFields.updatedByEmail,
            ...auditFields,
          });
        }
      }

      if (movementAdjustments.length > 0) {
        await inventoryMovementRepository.createMany(movementAdjustments);
      }

      return product;
    });
  }

  async deactivate(id: string, auditFields: UpdateAuditFields, authUser: AuthenticatedUser) {
    const product = await this.productsRepository.findById(id, authUser.tenantId);

    if (!product) {
      throw new AppError(404, 'Product not found.');
    }

    return this.productsRepository.deactivateById(id, {
      active: false,
      ...auditFields,
    });
  }
}
