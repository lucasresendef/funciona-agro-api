import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  buildCreateAuditFieldsFromRequest,
  buildUpdateAuditFieldsFromRequest,
} from '../../shared/utils/audit';
import {
  createUnitBodySchema,
  listUnitsQuerySchema,
  unitIdParamsSchema,
  updateUnitBodySchema,
} from './units.schemas';
import type { UnitsService } from './units.service';

export class UnitsController {
  constructor(private readonly unitsService: UnitsService) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = listUnitsQuerySchema.parse(request.query);
    const units = await this.unitsService.list(query);

    return reply.send(units);
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = createUnitBodySchema.parse(request.body);
    const unit = await this.unitsService.create(body, buildCreateAuditFieldsFromRequest(request));

    return reply.status(201).send({
      data: unit,
    });
  };

  deactivate = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = unitIdParamsSchema.parse(request.params);
    const unit = await this.unitsService.deactivate(id, buildUpdateAuditFieldsFromRequest(request));

    return reply.send({
      data: unit,
    });
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = unitIdParamsSchema.parse(request.params);
    const body = updateUnitBodySchema.parse(request.body);
    const unit = await this.unitsService.update(
      id,
      body,
      buildUpdateAuditFieldsFromRequest(request),
    );

    return reply.send({
      data: unit,
    });
  };
}
