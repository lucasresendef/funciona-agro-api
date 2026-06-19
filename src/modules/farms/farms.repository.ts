import type { Prisma, PrismaClient } from '../../shared/database/prisma-client';
import {
  buildPaginatedResponse,
  calculatePaginationSkipTake,
} from '../../shared/utils/pagination';
import type { ListFarmsQuery } from './farms.schemas';

export class FarmsRepository {
  constructor(private readonly database: PrismaClient) {}

  async findMany(filters: ListFarmsQuery, tenantId: string, allowedFarmIds?: string[]) {
    const where: Prisma.FarmWhereInput = { tenantId };
    if (allowedFarmIds) {
      where.id = {
        in: allowedFarmIds,
      };
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
      this.database.farm.findMany({
        where,
        skip,
        take,
        orderBy: {
          name: 'asc',
        },
      }),
      this.database.farm.count({ where }),
    ]);

    return buildPaginatedResponse(data, filters, total);
  }

  async findById(id: string, tenantId?: string) {
    return this.database.farm.findFirst({
      where: tenantId ? { id, tenantId } : { id },
    });
  }

  async create(data: Prisma.FarmUncheckedCreateInput) {
    return this.database.farm.create({
      data,
    });
  }

  async updateById(id: string, data: Prisma.FarmUncheckedUpdateInput) {
    return this.database.farm.update({
      where: { id },
      data,
    });
  }

  async deactivateById(id: string, data: Prisma.FarmUncheckedUpdateInput) {
    return this.database.farm.update({
      where: { id },
      data,
    });
  }
}
