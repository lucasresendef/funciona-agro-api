import { AppError } from '../../shared/errors/app-error';
import type { CreateAuditFields } from '../../shared/utils/audit';
import type { UpdateAuditFields } from '../../shared/utils/audit';
import type { FarmsRepository } from '../farms/farms.repository';
import type { UsersRepository } from '../users/users.repository';
import type { AuthenticatedUser } from './auth.types';
import type {
  CreateFarmPermissionBody,
  ListFarmPermissionsQuery,
  UpdateFarmPermissionBody,
} from './farm-permissions.schemas';
import type { FarmAccessService } from './farm-access.service';
import type { FarmPermissionRepository } from './farm-permission.repository';

export class FarmPermissionsService {
  constructor(
    private readonly farmPermissionRepository: FarmPermissionRepository,
    private readonly farmsRepository: FarmsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly farmAccessService: FarmAccessService,
  ) {}

  async list(filters: ListFarmPermissionsQuery, authUser: AuthenticatedUser | null) {
    if (!authUser) {
      throw new AppError(401, 'Authentication required.');
    }

    const allowedFarmIds = await this.farmAccessService.getAllowedFarmIds(authUser);

    if (filters.farmId) {
      await this.farmAccessService.assertUserCanAccessFarm({
        authUser,
        farmId: filters.farmId,
      });
    }

    return this.farmPermissionRepository.findMany(
      filters,
      authUser.tenantId,
      allowedFarmIds ?? undefined,
    );
  }

  async create(
    input: CreateFarmPermissionBody,
    auditFields: CreateAuditFields,
    authUser: AuthenticatedUser | null,
  ) {
    if (!authUser) {
      throw new AppError(401, 'Authentication required.');
    }

    await this.farmAccessService.assertUserCanAccessFarm({
      authUser,
      farmId: input.farmId,
    });

    const farm = await this.farmsRepository.findById(input.farmId, authUser.tenantId);

    if (!farm) {
      throw new AppError(404, 'Farm not found.');
    }

    if ('userId' in input) {
      const user = await this.usersRepository.findById(input.userId, authUser.tenantId);

      if (!user) {
        throw new AppError(404, 'User not found.');
      }

      return this.farmPermissionRepository.create({
        tenantId: authUser.tenantId,
        farmId: input.farmId,
        keycloakUserId: user.keycloakUserId,
        userName: user.name,
        userEmail: user.email,
        role: input.role,
        active: true,
        ...auditFields,
      });
    }

    return this.farmPermissionRepository.create({
      tenantId: authUser.tenantId,
      farmId: input.farmId,
      keycloakUserId: input.keycloakUserId,
      userName: input.userName,
      userEmail: input.userEmail,
      role: input.role,
      active: true,
      ...auditFields,
    });
  }

  async deactivate(
    id: string,
    auditFields: UpdateAuditFields,
    authUser: AuthenticatedUser | null,
  ) {
    const permission = await this.farmPermissionRepository.findById(id);

    if (!permission) {
      throw new AppError(404, 'Farm permission not found.');
    }

    await this.farmAccessService.assertUserCanAccessFarm({
      authUser,
      farmId: permission.farmId,
    });

    return this.farmPermissionRepository.deactivateById(id, {
      active: false,
      ...auditFields,
    });
  }

  async update(
    id: string,
    input: UpdateFarmPermissionBody,
    auditFields: UpdateAuditFields,
    authUser: AuthenticatedUser | null,
  ) {
    const permission = await this.farmPermissionRepository.findById(id);

    if (!permission) {
      throw new AppError(404, 'Farm permission not found.');
    }

    await this.farmAccessService.assertUserCanAccessFarm({
      authUser,
      farmId: permission.farmId,
    });

    return this.farmPermissionRepository.updateById(id, {
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...auditFields,
    });
  }
}
