import type { Prisma, PrismaClient } from '@prisma/client';
import {
  buildPaginatedResponse,
  calculatePaginationSkipTake,
} from '../../shared/utils/pagination';
import type { ListInventoryLocationsQuery } from './inventory-location.schemas';

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export class InventoryLocationRepository {
  constructor(private readonly database: DatabaseClient) {}

  async findMany(filters: ListInventoryLocationsQuery, tenantId: string, allowedFarmIds?: string[]) {
    const where: Prisma.InventoryLocationWhereInput = {
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

    if (typeof filters.active === 'boolean') {
      where.active = filters.active;
    } else {
      where.active = true;
    }

    if (filters.search) {
      where.OR = [
        {
          name: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
        {
          description: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const { skip, take } = calculatePaginationSkipTake(filters);
    const [data, total] = await Promise.all([
      this.database.inventoryLocation.findMany({
        where,
        skip,
        take,
        include: {
          farm: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),
      this.database.inventoryLocation.count({ where }),
    ]);

    return buildPaginatedResponse(data, filters, total);
  }

  async findById(id: string, tenantId?: string) {
    return this.database.inventoryLocation.findFirst({
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

  async findManyByIds(ids: string[], tenantId?: string) {
    return this.database.inventoryLocation.findMany({
      where: {
        id: {
          in: ids,
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

  async create(data: Prisma.InventoryLocationUncheckedCreateInput) {
    return this.database.inventoryLocation.create({
      data,
      include: {
        farm: true,
      },
    });
  }

  async updateById(id: string, data: Prisma.InventoryLocationUncheckedUpdateInput) {
    return this.database.inventoryLocation.update({
      where: { id },
      data,
      include: {
        farm: true,
      },
    });
  }

  async deactivateById(id: string, data: Prisma.InventoryLocationUncheckedUpdateInput) {
    return this.database.inventoryLocation.update({
      where: { id },
      data,
      include: {
        farm: true,
      },
    });
  }
}
