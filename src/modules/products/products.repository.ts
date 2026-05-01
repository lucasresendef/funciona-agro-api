import type { Prisma, PrismaClient } from '@prisma/client';
import {
  buildPaginatedResponse,
  calculatePaginationSkipTake,
} from '../../shared/utils/pagination';
import type { ListProductsQuery } from './products.schemas';

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export class ProductsRepository {
  constructor(private readonly database: DatabaseClient) {}

  async findMany(filters: ListProductsQuery, tenantId: string, allowedFarmIds?: string[]) {
    const where: Prisma.ProductWhereInput = {};

    if (typeof filters.active === 'boolean') {
      where.active = filters.active;
    } else {
      where.active = true;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.farmId || allowedFarmIds) {
      where.inventoryBalances = {
        some: {
          active: true,
          farm: {
            tenantId,
          },
          ...(filters.farmId ? { farmId: filters.farmId } : {}),
          ...(allowedFarmIds ? { farmId: { in: allowedFarmIds } } : {}),
        },
      };
    } else {
      where.inventoryBalances = {
        some: {
          active: true,
          farm: {
            tenantId,
          },
        },
      };
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
          code: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
        {
          activeIngredient: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const { skip, take } = calculatePaginationSkipTake(filters);
    const [data, total] = await Promise.all([
      this.database.product.findMany({
        where,
        skip,
        take,
        include: {
          unitOfMeasure: true,
          inventoryBalances: {
            where: {
              active: true,
            },
            include: {
              inventoryLocation: {
                include: {
                  farm: true,
                },
              },
            },
            orderBy: [
              {
                inventoryLocation: {
                  farm: {
                    name: 'asc',
                  },
                },
              },
              {
                inventoryLocation: {
                  name: 'asc',
                },
              },
            ],
          },
        },
        orderBy: {
          name: 'asc',
        },
      }),
      this.database.product.count({ where }),
    ]);

    return buildPaginatedResponse(data, filters, total);
  }

  async findById(id: string, tenantId?: string) {
    return this.database.product.findFirst({
      where: tenantId
        ? {
            id,
            inventoryBalances: {
              some: {
                farm: {
                  tenantId,
                },
              },
            },
          }
        : { id },
    });
  }

  async findByIdWithStock(id: string, tenantId?: string) {
    return this.database.product.findFirst({
      where: tenantId
        ? {
            id,
            inventoryBalances: {
              some: {
                farm: {
                  tenantId,
                },
              },
            },
          }
        : { id },
      include: {
        unitOfMeasure: true,
        inventoryBalances: {
          where: {
            active: true,
          },
          include: {
            inventoryLocation: {
              include: {
                farm: true,
              },
            },
          },
        },
      },
    });
  }

  async findManyByIds(ids: string[], tenantId?: string) {
    return this.database.product.findMany({
      where: {
        id: {
          in: ids,
        },
        ...(tenantId
          ? {
              inventoryBalances: {
                some: {
                  farm: {
                    tenantId,
                  },
                },
              },
            }
          : {}),
      },
    });
  }

  async create(data: Prisma.ProductUncheckedCreateInput) {
    return this.database.product.create({
      data,
      include: {
        unitOfMeasure: true,
      },
    });
  }

  async deactivateById(id: string, data: Prisma.ProductUncheckedUpdateInput) {
    return this.database.product.update({
      where: { id },
      data,
      include: {
        unitOfMeasure: true,
      },
    });
  }

  async updateById(id: string, data: Prisma.ProductUncheckedUpdateInput) {
    return this.database.product.update({
      where: { id },
      data,
      include: {
        unitOfMeasure: true,
      },
    });
  }
}
