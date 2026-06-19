import type { Prisma, PrismaClient } from '../../shared/database/prisma-client';
import {
  buildPaginatedResponse,
  calculatePaginationSkipTake,
} from '../../shared/utils/pagination';
import type { ListFarmPermissionsQuery } from './farm-permissions.schemas';

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

const userRelationSelect = { keycloakUserId: true, name: true, email: true } as const;

const responseInclude = {
  farm: true,
  user: { select: userRelationSelect },
} satisfies Prisma.FarmUserPermissionInclude;

type PermissionWithUser = {
  user: { keycloakUserId: string | null; name: string; email: string };
};

function flattenUser<T extends PermissionWithUser>({ user, ...rest }: T) {
  return {
    ...rest,
    keycloakUserId: user.keycloakUserId,
    userName: user.name,
    userEmail: user.email,
  };
}

export class FarmPermissionRepository {
  constructor(private readonly database: DatabaseClient) {}

  async findActiveByKeycloakUserId(keycloakUserId: string, tenantId: string) {
    return this.database.farmUserPermission.findMany({
      where: {
        tenantId,
        active: true,
        user: { keycloakUserId },
      },
    });
  }

  async findActiveDetailedByKeycloakUserId(keycloakUserId: string, tenantId: string) {
    const permissions = await this.database.farmUserPermission.findMany({
      where: {
        tenantId,
        active: true,
        user: { keycloakUserId },
      },
      include: responseInclude,
      orderBy: [{ farm: { name: 'asc' } }],
    });

    return permissions.map(flattenUser);
  }

  async findActiveFarmIdsByKeycloakUserId(keycloakUserId: string, tenantId: string) {
    const permissions = await this.database.farmUserPermission.findMany({
      where: {
        tenantId,
        active: true,
        user: { keycloakUserId },
      },
      select: {
        farmId: true,
      },
    });

    return permissions.map((permission) => permission.farmId);
  }

  async findMany(filters: ListFarmPermissionsQuery, tenantId: string, allowedFarmIds?: string[]) {
    const where: Prisma.FarmUserPermissionWhereInput = { tenantId };

    if (allowedFarmIds) {
      where.farmId = { in: allowedFarmIds };
    }

    if (filters.farmId) {
      where.farmId = filters.farmId;
    }

    if (filters.keycloakUserId) {
      where.user = { keycloakUserId: filters.keycloakUserId };
    }

    if (filters.role) {
      where.role = filters.role;
    }

    where.active = typeof filters.active === 'boolean' ? filters.active : true;

    const { skip, take } = calculatePaginationSkipTake(filters);
    const [data, total] = await Promise.all([
      this.database.farmUserPermission.findMany({
        where,
        skip,
        take,
        include: responseInclude,
        orderBy: [{ farm: { name: 'asc' } }, { user: { name: 'asc' } }],
      }),
      this.database.farmUserPermission.count({ where }),
    ]);

    return buildPaginatedResponse(data.map(flattenUser), filters, total);
  }

  async create(data: Prisma.FarmUserPermissionUncheckedCreateInput) {
    const permission = await this.database.farmUserPermission.create({
      data,
      include: responseInclude,
    });

    return flattenUser(permission);
  }

  async findById(id: string) {
    return this.database.farmUserPermission.findUnique({
      where: { id },
    });
  }

  async deactivateById(id: string, data: Prisma.FarmUserPermissionUncheckedUpdateInput) {
    const permission = await this.database.farmUserPermission.update({
      where: { id },
      data,
      include: responseInclude,
    });

    return flattenUser(permission);
  }

  async updateById(id: string, data: Prisma.FarmUserPermissionUncheckedUpdateInput) {
    const permission = await this.database.farmUserPermission.update({
      where: { id },
      data,
      include: responseInclude,
    });

    return flattenUser(permission);
  }
}
