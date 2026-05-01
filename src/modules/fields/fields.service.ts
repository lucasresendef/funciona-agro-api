import type { AuthenticatedUser } from '../auth/auth.types';
import type { FarmAccessService } from '../auth/farm-access.service';
import { AppError } from '../../shared/errors/app-error';
import type { CreateAuditFields } from '../../shared/utils/audit';
import type { UpdateAuditFields } from '../../shared/utils/audit';
import type { FarmsRepository } from '../farms/farms.repository';
import type { CreateFieldBody, ListFieldsQuery, UpdateFieldBody } from './fields.schemas';
import type { FieldsRepository } from './fields.repository';

export class FieldsService {
  constructor(
    private readonly fieldsRepository: FieldsRepository,
    private readonly farmsRepository: FarmsRepository,
    private readonly farmAccessService: FarmAccessService,
  ) {}

  async list(filters: ListFieldsQuery, authUser: AuthenticatedUser | null) {
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

    return this.fieldsRepository.findMany(filters, authUser.tenantId, allowedFarmIds ?? undefined);
  }

  async create(
    input: CreateFieldBody,
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

    return this.fieldsRepository.create({
      farmId: input.farmId,
      name: input.name,
      areaHectares: input.areaHectares,
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
    const field = await this.fieldsRepository.findById(id, authUser?.tenantId);

    if (!field) {
      throw new AppError(404, 'Field not found.');
    }

    await this.farmAccessService.assertUserCanAccessFarm({
      authUser,
      farmId: field.farmId,
    });

    return this.fieldsRepository.deactivateById(id, {
      active: false,
      ...auditFields,
    });
  }

  async update(
    id: string,
    input: UpdateFieldBody,
    auditFields: UpdateAuditFields,
    authUser: AuthenticatedUser | null,
  ) {
    const field = await this.fieldsRepository.findById(id, authUser?.tenantId);

    if (!field) {
      throw new AppError(404, 'Field not found.');
    }

    await this.farmAccessService.assertUserCanAccessFarm({
      authUser,
      farmId: field.farmId,
    });

    return this.fieldsRepository.updateById(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.areaHectares !== undefined ? { areaHectares: input.areaHectares } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...auditFields,
    });
  }
}
