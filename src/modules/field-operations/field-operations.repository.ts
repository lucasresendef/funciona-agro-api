import type { Prisma, PrismaClient } from '@prisma/client';
import type { UpdateAuditFields } from '../../shared/utils/audit';
import {
  buildPaginatedResponse,
  calculatePaginationSkipTake,
} from '../../shared/utils/pagination';
import type { ListFieldOperationsQuery } from './field-operations.schemas';

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

const fieldOperationInclude = {
  farm: true,
  field: true,
  inventoryLocation: true,
  responsibleUser: true,
  items: {
    include: {
      product: {
        include: {
          unitOfMeasure: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  },
} satisfies Prisma.FieldOperationInclude;

export class FieldOperationsRepository {
  constructor(private readonly database: DatabaseClient) {}

  async findMany(filters: ListFieldOperationsQuery, tenantId: string, allowedFarmIds?: string[]) {
    const where: Prisma.FieldOperationWhereInput = {
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

    if (filters.fieldId) {
      where.fieldId = filters.fieldId;
    }

    if (filters.inventoryLocationId) {
      where.inventoryLocationId = filters.inventoryLocationId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (typeof filters.active === 'boolean') {
      where.active = filters.active;
    } else {
      where.active = true;
    }

    const { skip, take } = calculatePaginationSkipTake(filters);
    const [data, total] = await Promise.all([
      this.database.fieldOperation.findMany({
        where,
        skip,
        take,
        include: fieldOperationInclude,
        orderBy: {
          operationDate: 'desc',
        },
      }),
      this.database.fieldOperation.count({ where }),
    ]);

    return buildPaginatedResponse(data, filters, total);
  }

  async create(data: Prisma.FieldOperationCreateInput) {
    return this.database.fieldOperation.create({
      data,
      include: fieldOperationInclude,
    });
  }

  async findById(id: string, tenantId?: string) {
    return this.database.fieldOperation.findFirst({
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

  async findByIdWithItems(id: string, tenantId?: string) {
    return this.database.fieldOperation.findFirst({
      where: tenantId
        ? {
            id,
            farm: {
              tenantId,
            },
          }
        : { id },
      include: fieldOperationInclude,
    });
  }

  async deactivateById(id: string, auditFields: UpdateAuditFields) {
    return this.database.fieldOperation.update({
      where: { id },
      data: {
        active: false,
        ...auditFields,
        items: {
          updateMany: {
            where: {},
            data: {
              active: false,
              ...auditFields,
            },
          },
        },
      },
      include: fieldOperationInclude,
    });
  }

  async updateById(
    id: string,
    data: Prisma.FieldOperationUncheckedUpdateInput,
    itemUpdates: Prisma.FieldOperationItemUpdateManyWithWhereWithoutFieldOperationInput[] = [],
  ) {
    return this.database.fieldOperation.update({
      where: { id },
      data: {
        ...data,
        ...(itemUpdates.length > 0
          ? {
              items: {
                updateMany: itemUpdates,
              },
            }
          : {}),
      },
      include: fieldOperationInclude,
    });
  }
}
