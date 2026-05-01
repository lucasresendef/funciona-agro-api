import type { CreateAuditFields } from '../../shared/utils/audit';
import type { UpdateAuditFields } from '../../shared/utils/audit';
import { AppError } from '../../shared/errors/app-error';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { FarmAccessService } from '../auth/farm-access.service';
import type { CreateFarmBody, ListFarmsQuery, UpdateFarmBody } from './farms.schemas';
import type { FarmsRepository } from './farms.repository';

export class FarmsService {
  constructor(
    private readonly farmsRepository: FarmsRepository,
    private readonly farmAccessService: FarmAccessService,
  ) {}

  async list(filters: ListFarmsQuery, authUser: AuthenticatedUser | null) {
    if (!authUser) {
      throw new AppError(401, 'Authentication required.');
    }
    const allowedFarmIds = await this.farmAccessService.getAllowedFarmIds(authUser);
    return this.farmsRepository.findMany(filters, authUser.tenantId, allowedFarmIds ?? undefined);
  }

  async create(input: CreateFarmBody, auditFields: CreateAuditFields, authUser: AuthenticatedUser) {
    return this.farmsRepository.create({
      tenantId: authUser.tenantId,
      name: input.name,
      description: input.description ?? null,
      active: true,
      ...auditFields,
    });
  }

  async deactivate(id: string, auditFields: UpdateAuditFields, authUser: AuthenticatedUser) {
    const farm = await this.farmsRepository.findById(id, authUser.tenantId);

    if (!farm) {
      throw new AppError(404, 'Farm not found.');
    }

    return this.farmsRepository.deactivateById(id, {
      active: false,
      ...auditFields,
    });
  }

  async update(
    id: string,
    input: UpdateFarmBody,
    auditFields: UpdateAuditFields,
    authUser: AuthenticatedUser,
  ) {
    const farm = await this.farmsRepository.findById(id, authUser.tenantId);

    if (!farm) {
      throw new AppError(404, 'Farm not found.');
    }

    return this.farmsRepository.updateById(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...auditFields,
    });
  }
}
