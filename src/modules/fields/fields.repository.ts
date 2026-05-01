import type { Prisma, PrismaClient } from '@prisma/client';
import {
  buildPaginatedResponse,
  calculatePaginationSkipTake,
} from '../../shared/utils/pagination';
import type { ListFieldsQuery } from './fields.schemas';

export class FieldsRepository {
  constructor(private readonly database: PrismaClient) {}

  async findMany(filters: ListFieldsQuery, tenantId: string, allowedFarmIds?: string[]) {
    const where: Prisma.FieldWhereInput = {
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
      ];
    }

    const { skip, take } = calculatePaginationSkipTake(filters);
    const [data, total] = await this.database.$transaction([
      this.database.field.findMany({
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
      this.database.field.count({ where }),
    ]);

    return buildPaginatedResponse(data, filters, total);
  }

  async findById(id: string, tenantId?: string) {
    return this.database.field.findFirst({
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

  async create(data: Prisma.FieldUncheckedCreateInput) {
    return this.database.field.create({
      data,
      include: {
        farm: true,
      },
    });
  }

  async updateById(id: string, data: Prisma.FieldUncheckedUpdateInput) {
    return this.database.field.update({
      where: { id },
      data,
      include: {
        farm: true,
      },
    });
  }

  async deactivateById(id: string, data: Prisma.FieldUncheckedUpdateInput) {
    return this.database.field.update({
      where: { id },
      data,
      include: {
        farm: true,
      },
    });
  }
}
