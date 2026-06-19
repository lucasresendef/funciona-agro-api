import type { Prisma, PrismaClient } from '../../shared/database/prisma-client';
import {
  buildPaginatedResponse,
  calculatePaginationSkipTake,
} from '../../shared/utils/pagination';
import type { ListUnitsQuery } from './units.schemas';

export class UnitsRepository {
  constructor(private readonly database: PrismaClient | Prisma.TransactionClient) {}

  async findMany(filters: ListUnitsQuery) {
    const where: Prisma.UnitOfMeasureWhereInput = {};

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
          symbol: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const { skip, take } = calculatePaginationSkipTake(filters);
    const [data, total] = await Promise.all([
      this.database.unitOfMeasure.findMany({
        where,
        skip,
        take,
        orderBy: {
          name: 'asc',
        },
      }),
      this.database.unitOfMeasure.count({ where }),
    ]);

    return buildPaginatedResponse(data, filters, total);
  }

  async findById(id: string) {
    return this.database.unitOfMeasure.findUnique({
      where: { id },
    });
  }

  async create(data: Prisma.UnitOfMeasureUncheckedCreateInput) {
    return this.database.unitOfMeasure.create({
      data,
    });
  }

  async updateById(id: string, data: Prisma.UnitOfMeasureUncheckedUpdateInput) {
    return this.database.unitOfMeasure.update({
      where: { id },
      data,
    });
  }

  async deactivateById(id: string, data: Prisma.UnitOfMeasureUncheckedUpdateInput) {
    return this.database.unitOfMeasure.update({
      where: { id },
      data,
    });
  }
}
