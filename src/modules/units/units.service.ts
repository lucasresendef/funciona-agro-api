import type { CreateAuditFields } from '../../shared/utils/audit';
import type { UpdateAuditFields } from '../../shared/utils/audit';
import { AppError } from '../../shared/errors/app-error';
import type { CreateUnitBody, ListUnitsQuery, UpdateUnitBody } from './units.schemas';
import type { UnitsRepository } from './units.repository';

export class UnitsService {
  constructor(private readonly unitsRepository: UnitsRepository) {}

  async list(filters: ListUnitsQuery) {
    return this.unitsRepository.findMany(filters);
  }

  async findById(id: string) {
    return this.unitsRepository.findById(id);
  }

  async create(input: CreateUnitBody, auditFields: CreateAuditFields) {
    return this.unitsRepository.create({
      name: input.name,
      symbol: input.symbol,
      active: true,
      ...auditFields,
    });
  }

  async deactivate(id: string, auditFields: UpdateAuditFields) {
    const unit = await this.unitsRepository.findById(id);

    if (!unit) {
      throw new AppError(404, 'Unit of measure not found.');
    }

    return this.unitsRepository.deactivateById(id, {
      active: false,
      ...auditFields,
    });
  }

  async update(id: string, input: UpdateUnitBody, auditFields: UpdateAuditFields) {
    const unit = await this.unitsRepository.findById(id);

    if (!unit) {
      throw new AppError(404, 'Unit of measure not found.');
    }

    return this.unitsRepository.updateById(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.symbol !== undefined ? { symbol: input.symbol } : {}),
      ...auditFields,
    });
  }
}
