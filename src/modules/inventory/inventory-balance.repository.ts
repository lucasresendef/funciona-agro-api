import type { Prisma, PrismaClient } from '../../shared/database/prisma-client';
import {
  buildPaginatedResponse,
  calculatePaginationSkipTake,
} from '../../shared/utils/pagination';
import type { ListInventoryBalanceQuery } from './inventory-balance.schemas';

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export class InventoryBalanceRepository {
  constructor(private readonly database: DatabaseClient) {}

  async findMany(filters: ListInventoryBalanceQuery, tenantId: string, allowedFarmIds?: string[]) {
    const where: Prisma.InventoryBalanceWhereInput = {
      farm: {
        tenantId,
      },
    };
    if (allowedFarmIds) {
      where.farmId = {
        in: allowedFarmIds,
      };
    }

    if (filters.farmId) {
      where.farmId = filters.farmId;
    }

    if (filters.inventoryLocationId) {
      where.inventoryLocationId = filters.inventoryLocationId;
    }

    if (filters.productId) {
      where.productId = filters.productId;
    }

    if (typeof filters.active === 'boolean') {
      where.active = filters.active;
    } else {
      where.active = true;
    }

    const { skip, take } = calculatePaginationSkipTake(filters);
    const [data, total] = await Promise.all([
      this.database.inventoryBalance.findMany({
        where,
        skip,
        take,
        include: {
          farm: true,
          inventoryLocation: true,
          product: {
            include: {
              unitOfMeasure: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.database.inventoryBalance.count({ where }),
    ]);

    return buildPaginatedResponse(data, filters, total);
  }

  async findByInventoryLocationAndProduct(
    inventoryLocationId: string,
    productId: string,
    tenantId?: string,
  ) {
    return this.database.inventoryBalance.findFirst({
      where: {
        inventoryLocationId,
        productId,
        ...(tenantId
          ? {
              farm: {
                tenantId,
              },
            }
          : {}),
      },
    });
  }

  async findManyByInventoryLocationAndProducts(
    inventoryLocationId: string,
    productIds: string[],
    tenantId?: string,
  ) {
    return this.database.inventoryBalance.findMany({
      where: {
        inventoryLocationId,
        productId: {
          in: productIds,
        },
        ...(tenantId
          ? {
              farm: {
                tenantId,
              },
            }
          : {}),
      },
    });
  }

  async findById(id: string, tenantId?: string) {
    return this.database.inventoryBalance.findFirst({
      where: tenantId
        ? {
            id,
            farm: {
              tenantId,
            },
          }
        : { id },
    });
  }

  async upsert(data: Prisma.InventoryBalanceUncheckedCreateInput) {
    return this.database.inventoryBalance.upsert({
      where: {
        inventoryLocationId_productId: {
          inventoryLocationId: data.inventoryLocationId,
          productId: data.productId,
        },
      },
      create: data,
      update: {
        quantity: data.quantity,
        averageUnitCost: data.averageUnitCost,
        active: data.active,
        updatedBy: data.updatedBy,
        updatedByEmail: data.updatedByEmail,
      },
      include: {
        farm: true,
        inventoryLocation: true,
        product: {
          include: {
            unitOfMeasure: true,
          },
        },
      },
    });
  }

  async deactivateById(id: string, data: Prisma.InventoryBalanceUncheckedUpdateInput) {
    return this.database.inventoryBalance.update({
      where: { id },
      data,
      include: {
        farm: true,
        inventoryLocation: true,
        product: {
          include: {
            unitOfMeasure: true,
          },
        },
      },
    });
  }
}
