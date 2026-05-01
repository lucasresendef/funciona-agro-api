import { AppError } from '../../shared/errors/app-error';
import type { CreateAuditFields } from '../../shared/utils/audit';
import type { UpdateAuditFields } from '../../shared/utils/audit';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { FarmAccessService } from '../auth/farm-access.service';
import type { FarmsRepository } from '../farms/farms.repository';
import type {
  CreateInventoryLocationBody,
  ListInventoryLocationsQuery,
  UpdateInventoryLocationBody,
} from './inventory-location.schemas';
import type { InventoryLocationRepository } from './inventory-location.repository';

export class InventoryLocationService {
  constructor(
    private readonly inventoryLocationRepository: InventoryLocationRepository,
    private readonly farmsRepository: FarmsRepository,
    private readonly farmAccessService: FarmAccessService,
  ) {}

  async list(filters: ListInventoryLocationsQuery, authUser: AuthenticatedUser | null) {
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

    return this.inventoryLocationRepository.findMany(
      filters,
      authUser.tenantId,
      allowedFarmIds ?? undefined,
    );
  }

  async create(
    input: CreateInventoryLocationBody,
    auditFields: CreateAuditFields,
    authUser: AuthenticatedUser | null,
  ) {
    await this.farmAccessService.assertUserCanAccessFarm({
      authUser,
      farmId: input.farmId,
    });

    const farm = await this.farmsRepository.findById(input.farmId, authUser?.tenantId);

    if (!farm) {
      throw new AppError(404, 'Farm not found.');
    }

    return this.inventoryLocationRepository.create({
      farmId: input.farmId,
      name: input.name,
      description: input.description ?? null,
      active: true,
      ...auditFields,
    });
  }

  async deactivate(
    id: string,
    auditFields: UpdateAuditFields,
    authUser: AuthenticatedUser | null,
  ) {
    const location = await this.inventoryLocationRepository.findById(id, authUser?.tenantId);

    if (!location) {
      throw new AppError(404, 'Inventory location not found.');
    }

    await this.farmAccessService.assertUserCanAccessFarm({
      authUser,
      farmId: location.farmId,
    });

    return this.inventoryLocationRepository.deactivateById(id, {
      active: false,
      ...auditFields,
    });
  }

  async update(
    id: string,
    input: UpdateInventoryLocationBody,
    auditFields: UpdateAuditFields,
    authUser: AuthenticatedUser | null,
  ) {
    const location = await this.inventoryLocationRepository.findById(id, authUser?.tenantId);

    if (!location) {
      throw new AppError(404, 'Inventory location not found.');
    }

    await this.farmAccessService.assertUserCanAccessFarm({
      authUser,
      farmId: location.farmId,
    });

    return this.inventoryLocationRepository.updateById(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...auditFields,
    });
  }
}
