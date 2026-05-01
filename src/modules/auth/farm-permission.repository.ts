import type { Prisma, PrismaClient } from '@prisma/client';
import {
  buildPaginatedResponse,
  calculatePaginationSkipTake,
} from '../../shared/utils/pagination';
import type { ListFarmPermissionsQuery } from './farm-permissions.schemas';

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export class FarmPermissionRepository {
  constructor(private readonly database: DatabaseClient) {}

  async findActiveByKeycloakUserId(keycloakUserId: string, tenantId: string) {
    return this.database.farmUserPermission.findMany({
      where: {
        tenantId,
        keycloakUserId,
        active: true,
      },
    });
  }

  async findActiveFarmIdsByKeycloakUserId(keycloakUserId: string, tenantId: string) {
    const permissions = await this.database.farmUserPermission.findMany({
      where: {
        tenantId,
        keycloakUserId,
        active: true,
      },
      select: {
        farmId: true,
      },
    });

    return permissions.map((permission) => permission.farmId);
  }

  async findMany(filters: ListFarmPermissionsQuery, tenantId: string, allowedFarmIds?: string[]) {
    const where: Prisma.FarmUserPermissionWhereInput = {};
    where.tenantId = tenantId;
    if (allowedFarmIds) {
      where.farmId = {
        in: allowedFarmIds,
      };
    }

    if (filters.farmId) {
      where.farmId = filters.farmId;
    }

    if (filters.keycloakUserId) {
      where.keycloakUserId = filters.keycloakUserId;
    }

    if (filters.role) {
      where.role = filters.role;
    }

    if (typeof filters.active === 'boolean') {
      where.active = filters.active;
    } else {
      where.active = true;
    }

    const { skip, take } = calculatePaginationSkipTake(filters);
    const [data, total] = await Promise.all([
      this.database.farmUserPermission.findMany({
        where,
        skip,
        take,
        include: {
          farm: true,
        },
        orderBy: [
          {
            farm: {
              name: 'asc',
            },
          },
          {
            userName: 'asc',
          },
        ],
      }),
      this.database.farmUserPermission.count({ where }),
    ]);

    return buildPaginatedResponse(data, filters, total);
  }

  async create(data: Prisma.FarmUserPermissionUncheckedCreateInput) {
    return this.database.farmUserPermission.create({
      data,
      include: {
        farm: true,
      },
    });
  }

  async findById(id: string) {
    return this.database.farmUserPermission.findUnique({
      where: { id },
    });
  }

  async deactivateById(id: string, data: Prisma.FarmUserPermissionUncheckedUpdateInput) {
    return this.database.farmUserPermission.update({
      where: { id },
      data,
      include: {
        farm: true,
      },
    });
  }

  async updateById(id: string, data: Prisma.FarmUserPermissionUncheckedUpdateInput) {
    return this.database.farmUserPermission.update({
      where: { id },
      data,
      include: {
        farm: true,
      },
    });
  }
}
