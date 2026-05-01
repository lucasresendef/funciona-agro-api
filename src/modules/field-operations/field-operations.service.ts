import { AppError } from '../../shared/errors/app-error';
import { prisma } from '../../shared/database/prisma';
import type { CreateAuditFields } from '../../shared/utils/audit';
import type { UpdateAuditFields } from '../../shared/utils/audit';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { FarmAccessService } from '../auth/farm-access.service';
import type { FieldsRepository } from '../fields/fields.repository';
import type { FarmsRepository } from '../farms/farms.repository';
import { InventoryBalanceRepository } from '../inventory/inventory-balance.repository';
import type { InventoryLocationRepository } from '../inventory/inventory-location.repository';
import { InventoryMovementRepository } from '../inventory/inventory-movement.repository';
import type { ProductsRepository } from '../products/products.repository';
import type {
  CreateFieldOperationBody,
  ListFieldOperationsQuery,
  UpdateFieldOperationBody,
} from './field-operations.schemas';
import type { FieldOperationCostService } from './field-operation-cost.service';
import {
  calculateQuantityAfterOutboundAndReturn,
  calculateReturnedDelta,
} from './field-operation-stock.utils';
import { FieldOperationsRepository } from './field-operations.repository';

export class FieldOperationsService {
  constructor(
    private readonly fieldOperationsRepository: FieldOperationsRepository,
    private readonly farmsRepository: FarmsRepository,
    private readonly fieldsRepository: FieldsRepository,
    private readonly inventoryLocationRepository: InventoryLocationRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly farmAccessService: FarmAccessService,
    private readonly fieldOperationCostService: FieldOperationCostService,
  ) {}

  async list(filters: ListFieldOperationsQuery, authUser: AuthenticatedUser | null) {
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

    return this.fieldOperationsRepository.findMany(
      filters,
      authUser.tenantId,
      allowedFarmIds ?? undefined,
    );
  }

  async create(
    input: CreateFieldOperationBody,
    auditFields: CreateAuditFields,
    authUser: AuthenticatedUser | null,
  ) {
    await this.farmAccessService.assertUserCanAccessFarm({
      authUser,
      farmId: input.farmId,
    });

    const farm = await this.farmsRepository.findById(input.farmId, authUser?.tenantId);

    if (!farm) {
      throw new AppError(404, 'Farm not found.');
    }

    const field = await this.fieldsRepository.findById(input.fieldId, authUser?.tenantId);

    if (!field) {
      throw new AppError(404, 'Field not found.');
    }

    if (field.farmId !== input.farmId) {
      throw new AppError(400, 'Field does not belong to the informed farm.');
    }

    const inventoryLocation = await this.inventoryLocationRepository.findById(
      input.inventoryLocationId,
      authUser?.tenantId,
    );

    if (!inventoryLocation) {
      throw new AppError(404, 'Inventory location not found.');
    }

    if (inventoryLocation.farmId !== input.farmId) {
      throw new AppError(400, 'Inventory location does not belong to the informed farm.');
    }

    const normalizedItems = input.items.map((item) =>
      this.fieldOperationCostService.normalizeItem(item),
    );
    const uniqueProductIds = [...new Set(normalizedItems.map((item) => item.productId))];
    const products = await this.productsRepository.findManyByIds(
      uniqueProductIds,
      authUser?.tenantId,
    );

    if (products.length !== uniqueProductIds.length) {
      throw new AppError(404, 'One or more products were not found.');
    }

    return prisma.$transaction(async (transaction) => {
      const inventoryBalanceRepository = new InventoryBalanceRepository(transaction);
      const inventoryMovementRepository = new InventoryMovementRepository(transaction);
      const txFieldOperationsRepository = new FieldOperationsRepository(transaction);
      const balances = await inventoryBalanceRepository.findManyByInventoryLocationAndProducts(
        input.inventoryLocationId,
        uniqueProductIds,
        authUser?.tenantId,
      );
      const balancesByProductId = new Map(balances.map((balance) => [balance.productId, balance]));

      for (const item of normalizedItems) {
        const balance = balancesByProductId.get(item.productId);

        if (!balance || !balance.active) {
          throw new AppError(
            400,
            `Inventory balance not found for product ${item.productId} at this location.`,
          );
        }

        const currentQuantity = Number(balance.quantity);

        let finalQuantity: number;
        try {
          finalQuantity = calculateQuantityAfterOutboundAndReturn(
            currentQuantity,
            item.quantitySent,
            item.quantityReturned,
          );
        } catch (error) {
          if (error instanceof AppError) {
            throw new AppError(
              400,
              `Insufficient stock for product ${item.productId}. Available: ${currentQuantity}, required: ${item.quantitySent}.`,
            );
          }

          throw error;
        }

        await inventoryBalanceRepository.upsert({
          farmId: input.farmId,
          inventoryLocationId: input.inventoryLocationId,
          productId: item.productId,
          quantity: finalQuantity,
          averageUnitCost: Number(balance.averageUnitCost),
          active: true,
          createdBy: balance.createdBy,
          createdByEmail: balance.createdByEmail,
          updatedBy: auditFields.updatedBy,
          updatedByEmail: auditFields.updatedByEmail,
        });
      }

      const operation = await txFieldOperationsRepository.create({
        farm: {
          connect: {
            id: input.farmId,
          },
        },
        field: {
          connect: {
            id: input.fieldId,
          },
        },
        inventoryLocation: {
          connect: {
            id: input.inventoryLocationId,
          },
        },
        operationDate: input.operationDate,
        status: input.status ?? 'OPEN',
        description: input.description ?? null,
        startedAt: input.startedAt ?? null,
        finishedAt: input.finishedAt ?? null,
        active: true,
        ...auditFields,
        items: {
          create: normalizedItems.map((item) => ({
            product: {
              connect: {
                id: item.productId,
              },
            },
            quantitySent: item.quantitySent,
            quantityReturned: item.quantityReturned,
            quantityConsumed: item.quantityConsumed,
            unitCostAtOperation: item.unitCostAtOperation,
            totalCostConsumed: item.totalCostConsumed,
            notes: item.notes,
            active: true,
            ...auditFields,
          })),
        },
      });

      await inventoryMovementRepository.createMany(
        normalizedItems.map((item) => ({
          farmId: input.farmId,
          inventoryLocationId: input.inventoryLocationId,
          productId: item.productId,
          movementType: 'OUTBOUND_TO_FIELD',
          quantity: item.quantitySent,
          unitCost: item.unitCostAtOperation,
          totalCost: item.quantitySent * item.unitCostAtOperation,
          occurredAt: input.operationDate,
          referenceType: 'FIELD_OPERATION',
          referenceId: operation.id,
          notes: item.notes ?? null,
          active: true,
          ...auditFields,
        })),
      );

      const returnItems = normalizedItems.filter((item) => item.quantityReturned > 0);

      if (returnItems.length > 0) {
        await inventoryMovementRepository.createMany(
          returnItems.map((item) => ({
            farmId: input.farmId,
            inventoryLocationId: input.inventoryLocationId,
            productId: item.productId,
            movementType: 'RETURN_FROM_FIELD',
            quantity: item.quantityReturned,
            unitCost: item.unitCostAtOperation,
            totalCost: item.quantityReturned * item.unitCostAtOperation,
            occurredAt: input.finishedAt ?? input.operationDate,
            referenceType: 'FIELD_OPERATION',
            referenceId: operation.id,
            notes: item.notes ?? null,
            active: true,
            ...auditFields,
          })),
        );
      }

      return operation;
    });
  }

  async update(
    id: string,
    input: UpdateFieldOperationBody,
    auditFields: UpdateAuditFields,
    authUser: AuthenticatedUser | null,
  ) {
    const operation = await this.fieldOperationsRepository.findByIdWithItems(id, authUser?.tenantId);

    if (!operation) {
      throw new AppError(404, 'Field operation not found.');
    }

    await this.farmAccessService.assertUserCanAccessFarm({
      authUser,
      farmId: operation.farmId,
    });

    if (!operation.inventoryLocationId) {
      throw new AppError(
        400,
        'Field operation has no inventory location linked. Unable to reconcile stock.',
      );
    }

    const inventoryLocationId = operation.inventoryLocationId;

    return prisma.$transaction(async (transaction) => {
      const inventoryBalanceRepository = new InventoryBalanceRepository(transaction);
      const inventoryMovementRepository = new InventoryMovementRepository(transaction);
      const txFieldOperationsRepository = new FieldOperationsRepository(transaction);
      const itemUpdates: {
        where: { id: string };
        data: {
          quantityReturned?: number;
          quantityConsumed?: number;
          totalCostConsumed?: number;
          notes?: string | null;
          updatedBy: string | null;
          updatedByEmail: string | null;
        };
      }[] = [];

      if (input.items && input.items.length > 0) {
        const existingItemsById = new Map(operation.items.map((item) => [item.id, item]));

        for (const itemInput of input.items) {
          const existingItem = existingItemsById.get(itemInput.id);

          if (!existingItem) {
            throw new AppError(400, `Item ${itemInput.id} does not belong to this operation.`);
          }

          const nextReturned = itemInput.quantityReturned ?? Number(existingItem.quantityReturned);
          const nextConsumed =
            itemInput.quantityConsumed ?? Number(existingItem.quantitySent) - nextReturned;
          const quantitySent = Number(existingItem.quantitySent);

          if (nextReturned > quantitySent) {
            throw new AppError(400, 'Returned quantity cannot be greater than sent quantity.');
          }

          if (nextConsumed < 0 || nextConsumed > quantitySent) {
            throw new AppError(400, 'Consumed quantity must be between 0 and quantity sent.');
          }

          if (nextConsumed + nextReturned > quantitySent) {
            throw new AppError(
              400,
              'Consumed quantity plus returned quantity cannot exceed sent quantity.',
            );
          }

          const previousReturned = Number(existingItem.quantityReturned);
          const deltaReturned = calculateReturnedDelta(previousReturned, nextReturned);

          if (deltaReturned !== 0) {
              const balance = await inventoryBalanceRepository.findByInventoryLocationAndProduct(
                inventoryLocationId,
                existingItem.productId,
                authUser?.tenantId,
              );

            if (!balance || !balance.active) {
              throw new AppError(
                400,
                `Inventory balance not found for product ${existingItem.productId} at this location.`,
              );
            }

            const currentQuantity = Number(balance.quantity);
            const nextQuantity = currentQuantity + deltaReturned;

            if (nextQuantity < 0) {
              throw new AppError(
                400,
                `Insufficient stock for product ${existingItem.productId} to revert return.`,
              );
            }

            await inventoryBalanceRepository.upsert({
              farmId: operation.farmId,
              inventoryLocationId,
              productId: existingItem.productId,
              quantity: nextQuantity,
              averageUnitCost: Number(balance.averageUnitCost),
              active: true,
              createdBy: balance.createdBy,
              createdByEmail: balance.createdByEmail,
              updatedBy: auditFields.updatedBy,
              updatedByEmail: auditFields.updatedByEmail,
            });

            await inventoryMovementRepository.create({
              farmId: operation.farmId,
              inventoryLocationId,
              productId: existingItem.productId,
              movementType: deltaReturned > 0 ? 'RETURN_FROM_FIELD' : 'OUTBOUND_TO_FIELD',
              quantity: Math.abs(deltaReturned),
              unitCost: Number(existingItem.unitCostAtOperation),
              totalCost: Math.abs(deltaReturned) * Number(existingItem.unitCostAtOperation),
              occurredAt: input.finishedAt ?? new Date(),
              referenceType: 'FIELD_OPERATION',
              referenceId: operation.id,
              notes: itemInput.notes ?? existingItem.notes ?? null,
              active: true,
              createdBy: auditFields.updatedBy,
              createdByEmail: auditFields.updatedByEmail,
              ...auditFields,
            });
          }

          itemUpdates.push({
            where: { id: existingItem.id },
            data: {
              quantityReturned: nextReturned,
              quantityConsumed: nextConsumed,
              totalCostConsumed: nextConsumed * Number(existingItem.unitCostAtOperation),
              ...(itemInput.notes !== undefined ? { notes: itemInput.notes } : {}),
              ...auditFields,
            },
          });
        }
      }

      return txFieldOperationsRepository.updateById(
        operation.id,
        {
          ...(input.operationDate !== undefined ? { operationDate: input.operationDate } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.startedAt !== undefined ? { startedAt: input.startedAt } : {}),
          ...(input.finishedAt !== undefined ? { finishedAt: input.finishedAt } : {}),
          ...auditFields,
        },
        itemUpdates,
      );
    });
  }

  async deactivate(
    id: string,
    auditFields: UpdateAuditFields,
    authUser: AuthenticatedUser | null,
  ) {
    const operation = await this.fieldOperationsRepository.findById(id, authUser?.tenantId);

    if (!operation) {
      throw new AppError(404, 'Field operation not found.');
    }

    await this.farmAccessService.assertUserCanAccessFarm({
      authUser,
      farmId: operation.farmId,
    });

    return this.fieldOperationsRepository.deactivateById(id, auditFields);
  }
}
