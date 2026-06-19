import type { Prisma, PrismaClient } from '../../shared/database/prisma-client';
import {
  buildPaginatedResponse,
  calculatePaginationSkipTake,
} from '../../shared/utils/pagination';
import type { ListSupportCatalogUnitsQuery } from './support-tenants.schemas';

export class SupportTenantsRepository {
  constructor(private readonly database: PrismaClient | Prisma.TransactionClient) {}

  async findTenantById(id: string) {
    return this.database.tenant.findFirst({
      where: { id },
    });
  }

  async findTenantByKey(key: string) {
    return this.database.tenant.findFirst({
      where: { key },
    });
  }

  async findTenants(input: {
    search?: string;
    active?: boolean;
    skip: number;
    take: number;
  }) {
    return this.database.tenant.findMany({
      where: {
        ...(input.active !== undefined ? { active: input.active } : {}),
        ...(input.search
          ? {
              OR: [
                { key: { contains: input.search, mode: 'insensitive' } },
                { name: { contains: input.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
      skip: input.skip,
      take: input.take,
      include: {
        _count: {
          select: {
            users: true,
            farms: true,
          },
        },
      },
    });
  }

  async countTenants(input: { search?: string; active?: boolean }) {
    return this.database.tenant.count({
      where: {
        ...(input.active !== undefined ? { active: input.active } : {}),
        ...(input.search
          ? {
              OR: [
                { key: { contains: input.search, mode: 'insensitive' } },
                { name: { contains: input.search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
    });
  }

  async findTenantDetailsById(tenantId: string) {
    return this.database.tenant.findFirst({
      where: { id: tenantId },
      include: {
        users: {
          orderBy: [{ createdAt: 'desc' }],
          select: {
            id: true,
            keycloakUserId: true,
            name: true,
            email: true,
            isAdmin: true,
            active: true,
            createdAt: true,
          },
        },
        farms: {
          orderBy: [{ createdAt: 'desc' }],
          include: {
            fields: {
              orderBy: [{ createdAt: 'desc' }],
            },
          },
        },
        farmPermissions: {
          orderBy: [{ createdAt: 'desc' }],
          include: {
            farm: true,
            user: { select: { keycloakUserId: true, name: true, email: true } },
          },
        },
        _count: {
          select: {
            users: true,
            farms: true,
          },
        },
      },
    });
  }

  async createTenant(data: Prisma.TenantUncheckedCreateInput) {
    return this.database.tenant.create({
      data,
    });
  }

  async updateTenantById(id: string, data: Prisma.TenantUncheckedUpdateInput) {
    return this.database.tenant.update({
      where: { id },
      data,
    });
  }

  async createTenantUser(data: Prisma.AppUserUncheckedCreateInput) {
    return this.database.appUser.create({
      data,
    });
  }

  async findUserByIdAndTenant(userId: string, tenantId: string) {
    return this.database.appUser.findFirst({
      where: {
        id: userId,
        tenantId,
      },
    });
  }

  async updateTenantUserById(id: string, data: Prisma.AppUserUncheckedUpdateInput) {
    return this.database.appUser.update({
      where: { id },
      data,
    });
  }

  async createFarm(data: Prisma.FarmUncheckedCreateInput) {
    return this.database.farm.create({
      data,
    });
  }

  async updateFarmById(id: string, data: Prisma.FarmUncheckedUpdateInput) {
    return this.database.farm.update({
      where: { id },
      data,
    });
  }

  async findFarmByIdAndTenant(farmId: string, tenantId: string) {
    return this.database.farm.findFirst({
      where: {
        id: farmId,
        tenantId,
      },
    });
  }

  async createField(data: Prisma.FieldUncheckedCreateInput) {
    return this.database.field.create({
      data,
    });
  }

  async findFieldByIdAndTenant(fieldId: string, tenantId: string) {
    return this.database.field.findFirst({
      where: {
        id: fieldId,
        farm: {
          tenantId,
        },
      },
      include: {
        farm: true,
      },
    });
  }

  async updateFieldById(id: string, data: Prisma.FieldUncheckedUpdateInput) {
    return this.database.field.update({
      where: { id },
      data,
      include: {
        farm: true,
      },
    });
  }

  async createFarmPermission(data: Prisma.FarmUserPermissionUncheckedCreateInput) {
    return this.database.farmUserPermission.create({
      data,
      include: {
        farm: true,
      },
    });
  }

  async findFarmPermissionByIdAndTenant(permissionId: string, tenantId: string) {
    return this.database.farmUserPermission.findFirst({
      where: {
        id: permissionId,
        tenantId,
      },
      include: {
        farm: true,
      },
    });
  }

  async findFarmPermissionByFarmAndUserId(farmId: string, userId: string) {
    return this.database.farmUserPermission.findFirst({
      where: {
        farmId,
        userId,
      },
      include: {
        farm: true,
      },
    });
  }

  async updateFarmPermissionById(
    id: string,
    data: Prisma.FarmUserPermissionUncheckedUpdateInput,
  ) {
    return this.database.farmUserPermission.update({
      where: { id },
      data,
      include: {
        farm: true,
      },
    });
  }

  async setFieldsActiveByFarmId(
    farmId: string,
    active: boolean,
    data: Pick<Prisma.FieldUncheckedUpdateManyInput, 'updatedBy' | 'updatedByEmail'>,
  ) {
    return this.database.field.updateMany({
      where: { farmId },
      data: {
        active,
        ...data,
      },
    });
  }

  async setPermissionsActiveByFarmId(
    farmId: string,
    active: boolean,
    data: Pick<
      Prisma.FarmUserPermissionUncheckedUpdateManyInput,
      'updatedBy' | 'updatedByEmail'
    >,
  ) {
    return this.database.farmUserPermission.updateMany({
      where: { farmId },
      data: {
        active,
        ...data,
      },
    });
  }

  async findUnits(input: ListSupportCatalogUnitsQuery) {
    const where: Prisma.UnitOfMeasureWhereInput = {
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...(input.search
        ? {
            OR: [
              { name: { contains: input.search, mode: 'insensitive' } },
              { symbol: { contains: input.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const { skip, take } = calculatePaginationSkipTake(input);
    const [data, total] = await Promise.all([
      this.database.unitOfMeasure.findMany({
        where,
        orderBy: [{ name: 'asc' }],
        skip,
        take,
      }),
      this.database.unitOfMeasure.count({ where }),
    ]);

    return buildPaginatedResponse(data, input, total);
  }

  async findUnitById(unitId: string) {
    return this.database.unitOfMeasure.findUnique({
      where: { id: unitId },
    });
  }

  async createUnit(data: Prisma.UnitOfMeasureUncheckedCreateInput) {
    return this.database.unitOfMeasure.create({
      data,
    });
  }

  async updateUnitById(id: string, data: Prisma.UnitOfMeasureUncheckedUpdateInput) {
    return this.database.unitOfMeasure.update({
      where: { id },
      data,
    });
  }
}
