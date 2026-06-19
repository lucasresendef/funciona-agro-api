import type { FarmUserRole, Prisma, PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { AppError } from '../../shared/errors/app-error';
import type { CreateAuditFields } from '../../shared/utils/audit';
import type { UpdateAuditFields } from '../../shared/utils/audit';
import {
  buildPaginatedResponse,
  calculatePaginationSkipTake,
} from '../../shared/utils/pagination';
import type {
  CreateSupportCatalogUnitBody,
  CreateSupportTenantBody,
  CreateSupportTenantFarmBody,
  CreateSupportTenantFieldBody,
  CreateSupportTenantPermissionBody,
  CreateSupportTenantUserBody,
  ListSupportCatalogUnitsQuery,
  ListSupportTenantsQuery,
  ResetSupportTenantUserPasswordBody,
  UpdateSupportCatalogUnitBody,
  UpdateSupportTenantBody,
  UpdateSupportTenantFarmBody,
  UpdateSupportTenantFieldBody,
  UpdateSupportTenantPermissionBody,
  UpdateSupportTenantUserBody,
} from './support-tenants.schemas';
import type { KeycloakAdminService } from './keycloak-admin.service';
import { SupportTenantsRepository } from './support-tenants.repository';

function flattenPermissionUser<
  T extends { user: { keycloakUserId: string | null; name: string; email: string } },
>({ user, ...rest }: T) {
  return {
    ...rest,
    keycloakUserId: user.keycloakUserId,
    userName: user.name,
    userEmail: user.email,
  };
}

export class SupportTenantsService {
  constructor(
    private readonly database: PrismaClient,
    private readonly supportTenantsRepository: SupportTenantsRepository,
    private readonly keycloakAdminService: KeycloakAdminService,
  ) {}

  async listTenants(input: ListSupportTenantsQuery) {
    const { skip, take } = calculatePaginationSkipTake({
      page: input.page,
      limit: input.limit,
    });

    const [tenants, total] = await Promise.all([
      this.supportTenantsRepository.findTenants({
        search: input.search,
        active: input.active,
        skip,
        take,
      }),
      this.supportTenantsRepository.countTenants({
        search: input.search,
        active: input.active,
      }),
    ]);

    return buildPaginatedResponse(
      tenants.map((tenant) => ({
        id: tenant.id,
        key: tenant.key,
        name: tenant.name,
        active: tenant.active,
        createdAt: tenant.createdAt,
        updatedAt: tenant.updatedAt,
        stats: {
          users: tenant._count.users,
          farms: tenant._count.farms,
        },
      })),
      { page: input.page, limit: input.limit },
      total,
    );
  }

  async listCatalogUnits(input: ListSupportCatalogUnitsQuery) {
    return this.supportTenantsRepository.findUnits(input);
  }

  async createCatalogUnit(input: CreateSupportCatalogUnitBody, auditFields: CreateAuditFields) {
    return this.supportTenantsRepository.createUnit({
      name: input.name,
      symbol: input.symbol,
      active: true,
      ...auditFields,
    });
  }

  async updateCatalogUnit(
    unitId: string,
    input: UpdateSupportCatalogUnitBody,
    auditFields: UpdateAuditFields,
  ) {
    const unit = await this.supportTenantsRepository.findUnitById(unitId);
    if (!unit) {
      throw new AppError(404, 'Unit of measure not found.');
    }

    return this.supportTenantsRepository.updateUnitById(unit.id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.symbol !== undefined ? { symbol: input.symbol } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...auditFields,
    });
  }

  async deactivateCatalogUnit(unitId: string, auditFields: UpdateAuditFields) {
    const unit = await this.supportTenantsRepository.findUnitById(unitId);
    if (!unit) {
      throw new AppError(404, 'Unit of measure not found.');
    }

    return this.supportTenantsRepository.updateUnitById(unit.id, {
      active: false,
      ...auditFields,
    });
  }

  async getTenantById(tenantId: string) {
    const tenant = await this.supportTenantsRepository.findTenantDetailsById(tenantId);
    if (!tenant) {
      throw new AppError(404, 'Tenant not found.');
    }

    const visibleUsers = [];
    for (const user of tenant.users) {
      if (!user.keycloakUserId) {
        visibleUsers.push(user);
        continue;
      }
      const keycloakUser = await this.keycloakAdminService.getUserById(user.keycloakUserId);
      if (keycloakUser) {
        visibleUsers.push(user);
      }
    }

    const visibleUserIds = new Set(visibleUsers.map((user) => user.id));
    const visiblePermissions = tenant.farmPermissions
      .filter((permission) => visibleUserIds.has(permission.userId))
      .map(flattenPermissionUser);

    return {
      id: tenant.id,
      key: tenant.key,
      name: tenant.name,
      active: tenant.active,
      createdAt: tenant.createdAt,
      updatedAt: tenant.updatedAt,
      stats: {
        users: visibleUsers.length,
        farms: tenant._count.farms,
      },
      users: visibleUsers,
      permissions: visiblePermissions,
      farms: tenant.farms.map((farm) => ({
        ...farm,
        fields: farm.fields,
      })),
    };
  }

  async createTenant(input: CreateSupportTenantBody, auditFields: CreateAuditFields) {
    const tenantKey = input.key.trim().toLowerCase();
    const existingTenant = await this.supportTenantsRepository.findTenantByKey(tenantKey);
    if (existingTenant) {
      throw new AppError(409, 'A tenant with this key already exists.');
    }

    const tenantId = randomUUID();
    const keycloakUser = await this.keycloakAdminService.createUser({
      username: input.adminUser.username,
      firstName: input.adminUser.name,
      email: input.adminUser.email,
      password: input.adminUser.password,
      tenantId,
      tenantKey,
      realmRoles: ['app-admin'],
    });

    try {
      return await this.database.$transaction(async (transaction) => {
        const txRepository = new SupportTenantsRepository(transaction);

        const tenant = await txRepository.createTenant({
          id: tenantId,
          key: tenantKey,
          name: input.name,
          active: true,
        });

        const adminUser = await txRepository.createTenantUser({
          tenantId: tenant.id,
          keycloakUserId: keycloakUser.id,
          name: input.adminUser.name,
          email: input.adminUser.email,
          isAdmin: true,
          active: true,
          ...auditFields,
        });

        const farms = await this.createFarmsWithFieldsAndPermission({
          repository: txRepository,
          tenantId: tenant.id,
          farms: input.farms ?? [],
          adminUser,
          auditFields,
        });

        return {
          tenant,
          adminUser,
          farms,
        };
      });
    } catch (error) {
      await this.keycloakAdminService.deleteUserById(keycloakUser.id).catch(() => undefined);
      throw error;
    }
  }

  async updateTenant(tenantId: string, input: UpdateSupportTenantBody) {
    const tenant = await this.supportTenantsRepository.findTenantById(tenantId);
    if (!tenant) {
      throw new AppError(404, 'Tenant not found.');
    }

    const nextKey = input.key?.trim().toLowerCase();
    if (nextKey && nextKey !== tenant.key) {
      const existingTenant = await this.supportTenantsRepository.findTenantByKey(nextKey);
      if (existingTenant && existingTenant.id !== tenantId) {
        throw new AppError(409, 'A tenant with this key already exists.');
      }
    }

    return this.supportTenantsRepository.updateTenantById(tenantId, {
      ...(nextKey ? { key: nextKey } : {}),
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    });
  }

  async deactivateTenant(tenantId: string) {
    const tenant = await this.supportTenantsRepository.findTenantById(tenantId);
    if (!tenant) {
      throw new AppError(404, 'Tenant not found.');
    }

    return this.supportTenantsRepository.updateTenantById(tenantId, {
      active: false,
    });
  }

  async createTenantUser(
    tenantId: string,
    input: CreateSupportTenantUserBody,
    auditFields: CreateAuditFields,
  ) {
    const tenant = await this.supportTenantsRepository.findTenantById(tenantId);
    if (!tenant) {
      throw new AppError(404, 'Tenant not found.');
    }

    const fullName = `${input.firstName} ${input.lastName}`.trim();
    const keycloakUser = await this.keycloakAdminService.createUser({
      username: input.username,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      password: input.password,
      temporaryPassword: true,
      tenantId,
      tenantKey: tenant.key,
      realmRoles: input.isAdmin ? ['app-admin'] : undefined,
    });

    try {
      return await this.database.$transaction(async (transaction) => {
        const txRepository = new SupportTenantsRepository(transaction);
        const appUser = await txRepository.createTenantUser({
          tenantId,
          keycloakUserId: keycloakUser.id,
          name: fullName,
          email: input.email,
          isAdmin: input.isAdmin ?? false,
          active: true,
          ...auditFields,
        });

        const createdPermissions = [];
        for (const permission of input.farmPermissions ?? []) {
          const farm = await txRepository.findFarmByIdAndTenant(permission.farmId, tenantId);
          if (!farm) {
            throw new AppError(404, `Farm not found for tenant: ${permission.farmId}`);
          }
          const createdPermission = await txRepository.createFarmPermission({
            tenantId,
            farmId: permission.farmId,
            userId: appUser.id,
            role: permission.role,
            active: true,
            ...auditFields,
          });
          createdPermissions.push(createdPermission);
        }

        return {
          user: appUser,
          farmPermissions: createdPermissions,
        };
      });
    } catch (error) {
      await this.keycloakAdminService.deleteUserById(keycloakUser.id).catch(() => undefined);
      throw error;
    }
  }

  async updateTenantUser(
    tenantId: string,
    userId: string,
    input: UpdateSupportTenantUserBody,
    auditFields: UpdateAuditFields,
  ) {
    const { tenant, user } = await this.findTenantAndUserOrThrow(tenantId, userId);

    if (user.keycloakUserId) {
      await this.keycloakAdminService.updateUser({
        id: user.keycloakUserId,
        name: input.name ?? user.name,
        email: input.email ?? user.email,
        enabled: input.active ?? user.active,
        tenantId,
        tenantKey: tenant.key,
      });

      if (input.isAdmin !== undefined) {
        await this.keycloakAdminService.setRealmRole(
          user.keycloakUserId,
          'app-admin',
          input.isAdmin,
        );
      }
    }

    return this.supportTenantsRepository.updateTenantUserById(user.id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.isAdmin !== undefined ? { isAdmin: input.isAdmin } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...auditFields,
    });
  }

  async resetTenantUserPassword(
    tenantId: string,
    userId: string,
    input: ResetSupportTenantUserPasswordBody,
  ) {
    const { user } = await this.findTenantAndUserOrThrow(tenantId, userId);

    if (!user.keycloakUserId) {
      throw new AppError(409, 'User is not linked to a Keycloak account yet.');
    }

    await this.keycloakAdminService.resetPassword(user.keycloakUserId, input.password);

    return {
      success: true,
    };
  }

  async deactivateTenantUser(
    tenantId: string,
    userId: string,
    auditFields: UpdateAuditFields,
  ) {
    const { tenant, user } = await this.findTenantAndUserOrThrow(tenantId, userId);

    if (user.keycloakUserId) {
      await this.keycloakAdminService.updateUser({
        id: user.keycloakUserId,
        name: user.name,
        email: user.email,
        enabled: false,
        tenantId,
        tenantKey: tenant.key,
      });
    }

    return this.supportTenantsRepository.updateTenantUserById(user.id, {
      active: false,
      ...auditFields,
    });
  }

  async createTenantFarm(
    tenantId: string,
    input: CreateSupportTenantFarmBody,
    auditFields: CreateAuditFields,
  ) {
    const tenant = await this.supportTenantsRepository.findTenantById(tenantId);
    if (!tenant) {
      throw new AppError(404, 'Tenant not found.');
    }

    return this.supportTenantsRepository.createFarm({
      tenantId,
      name: input.name,
      description: input.description ?? null,
      active: true,
      ...auditFields,
    });
  }

  async updateTenantFarm(
    tenantId: string,
    farmId: string,
    input: UpdateSupportTenantFarmBody,
    auditFields: UpdateAuditFields,
  ) {
    const farm = await this.supportTenantsRepository.findFarmByIdAndTenant(farmId, tenantId);
    if (!farm) {
      throw new AppError(404, 'Farm not found for tenant.');
    }

    if (input.active === false) {
      return this.deactivateTenantFarm(tenantId, farmId, auditFields, input);
    }

    return this.supportTenantsRepository.updateFarmById(farm.id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...auditFields,
    });
  }

  async deactivateTenantFarm(
    tenantId: string,
    farmId: string,
    auditFields: UpdateAuditFields,
    input?: Pick<UpdateSupportTenantFarmBody, 'name' | 'description'>,
  ) {
    const farm = await this.supportTenantsRepository.findFarmByIdAndTenant(farmId, tenantId);
    if (!farm) {
      throw new AppError(404, 'Farm not found for tenant.');
    }

    return this.database.$transaction(async (transaction) => {
      const repository = new SupportTenantsRepository(transaction);
      const updatedFarm = await repository.updateFarmById(farm.id, {
        ...(input?.name !== undefined ? { name: input.name } : {}),
        ...(input?.description !== undefined ? { description: input.description } : {}),
        active: false,
        ...auditFields,
      });

      await repository.setFieldsActiveByFarmId(farm.id, false, auditFields);
      await repository.setPermissionsActiveByFarmId(farm.id, false, auditFields);

      return updatedFarm;
    });
  }

  async createTenantField(
    tenantId: string,
    input: CreateSupportTenantFieldBody,
    auditFields: CreateAuditFields,
  ) {
    const tenant = await this.supportTenantsRepository.findTenantById(tenantId);
    if (!tenant) {
      throw new AppError(404, 'Tenant not found.');
    }

    const farm = await this.supportTenantsRepository.findFarmByIdAndTenant(input.farmId, tenantId);
    if (!farm) {
      throw new AppError(404, 'Farm not found for tenant.');
    }

    return this.supportTenantsRepository.createField({
      farmId: input.farmId,
      name: input.name,
      areaHectares: input.areaHectares,
      description: input.description ?? null,
      active: true,
      ...auditFields,
    });
  }

  async updateTenantField(
    tenantId: string,
    fieldId: string,
    input: UpdateSupportTenantFieldBody,
    auditFields: UpdateAuditFields,
  ) {
    const field = await this.supportTenantsRepository.findFieldByIdAndTenant(fieldId, tenantId);
    if (!field) {
      throw new AppError(404, 'Field not found for tenant.');
    }

    return this.supportTenantsRepository.updateFieldById(field.id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.areaHectares !== undefined ? { areaHectares: input.areaHectares } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...auditFields,
    });
  }

  async deactivateTenantField(
    tenantId: string,
    fieldId: string,
    auditFields: UpdateAuditFields,
  ) {
    const field = await this.supportTenantsRepository.findFieldByIdAndTenant(fieldId, tenantId);
    if (!field) {
      throw new AppError(404, 'Field not found for tenant.');
    }

    return this.supportTenantsRepository.updateFieldById(field.id, {
      active: false,
      ...auditFields,
    });
  }

  async createTenantPermission(
    tenantId: string,
    input: CreateSupportTenantPermissionBody,
    auditFields: CreateAuditFields,
  ) {
    const [farm, user] = await Promise.all([
      this.supportTenantsRepository.findFarmByIdAndTenant(input.farmId, tenantId),
      this.supportTenantsRepository.findUserByIdAndTenant(input.userId, tenantId),
    ]);

    if (!farm) {
      throw new AppError(404, 'Farm not found for tenant.');
    }

    if (!user) {
      throw new AppError(404, 'User not found for tenant.');
    }

    const existingPermission =
      await this.supportTenantsRepository.findFarmPermissionByFarmAndUserId(input.farmId, user.id);

    if (existingPermission) {
      return this.supportTenantsRepository.updateFarmPermissionById(existingPermission.id, {
        role: input.role,
        active: true,
        updatedBy: auditFields.updatedBy,
        updatedByEmail: auditFields.updatedByEmail,
      });
    }

    return this.supportTenantsRepository.createFarmPermission({
      tenantId,
      farmId: input.farmId,
      userId: user.id,
      role: input.role,
      active: true,
      ...auditFields,
    });
  }

  async updateTenantPermission(
    tenantId: string,
    permissionId: string,
    input: UpdateSupportTenantPermissionBody,
    auditFields: UpdateAuditFields,
  ) {
    const permission = await this.supportTenantsRepository.findFarmPermissionByIdAndTenant(
      permissionId,
      tenantId,
    );
    if (!permission) {
      throw new AppError(404, 'Farm permission not found for tenant.');
    }

    return this.supportTenantsRepository.updateFarmPermissionById(permission.id, {
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...auditFields,
    });
  }

  async deactivateTenantPermission(
    tenantId: string,
    permissionId: string,
    auditFields: UpdateAuditFields,
  ) {
    const permission = await this.supportTenantsRepository.findFarmPermissionByIdAndTenant(
      permissionId,
      tenantId,
    );
    if (!permission) {
      throw new AppError(404, 'Farm permission not found for tenant.');
    }

    return this.supportTenantsRepository.updateFarmPermissionById(permission.id, {
      active: false,
      ...auditFields,
    });
  }

  private async createFarmsWithFieldsAndPermission(input: {
    repository: SupportTenantsRepository;
    tenantId: string;
    farms: NonNullable<CreateSupportTenantBody['farms']>;
    adminUser: Prisma.AppUserGetPayload<Record<string, never>>;
    auditFields: CreateAuditFields;
  }) {
    const farms = [];
    for (const farmInput of input.farms) {
      const farm = await input.repository.createFarm({
        tenantId: input.tenantId,
        name: farmInput.name,
        description: farmInput.description ?? null,
        active: true,
        ...input.auditFields,
      });

      await input.repository.createFarmPermission({
        tenantId: input.tenantId,
        farmId: farm.id,
        userId: input.adminUser.id,
        role: 'OWNER' as FarmUserRole,
        active: true,
        ...input.auditFields,
      });

      const fields = [];
      for (const fieldInput of farmInput.fields ?? []) {
        const field = await input.repository.createField({
          farmId: farm.id,
          name: fieldInput.name,
          areaHectares: fieldInput.areaHectares,
          description: fieldInput.description ?? null,
          active: true,
          ...input.auditFields,
        });
        fields.push(field);
      }

      farms.push({
        ...farm,
        fields,
      });
    }

    return farms;
  }

  private async findTenantAndUserOrThrow(tenantId: string, userId: string) {
    const [tenant, user] = await Promise.all([
      this.supportTenantsRepository.findTenantById(tenantId),
      this.supportTenantsRepository.findUserByIdAndTenant(userId, tenantId),
    ]);

    if (!tenant) {
      throw new AppError(404, 'Tenant not found.');
    }

    if (!user) {
      throw new AppError(404, 'User not found for tenant.');
    }

    return {
      tenant,
      user,
    };
  }
}
