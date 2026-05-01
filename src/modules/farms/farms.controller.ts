import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../../shared/errors/app-error';
import {
  buildCreateAuditFieldsFromRequest,
  buildUpdateAuditFieldsFromRequest,
} from '../../shared/utils/audit';
import {
  createFarmBodySchema,
  farmIdParamsSchema,
  listFarmsQuerySchema,
  updateFarmBodySchema,
} from './farms.schemas';
import type { FarmsService } from './farms.service';

export class FarmsController {
  constructor(private readonly farmsService: FarmsService) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = listFarmsQuerySchema.parse(request.query);
    const farms = await this.farmsService.list(query, request.authUser);

    return reply.send(farms);
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = createFarmBodySchema.parse(request.body);
    if (!request.authUser) {
      throw new AppError(401, 'Authentication required.');
    }
    const farm = await this.farmsService.create(
      body,
      buildCreateAuditFieldsFromRequest(request),
      request.authUser,
    );

    return reply.status(201).send({
      data: farm,
    });
  };

  deactivate = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = farmIdParamsSchema.parse(request.params);
    if (!request.authUser) {
      throw new AppError(401, 'Authentication required.');
    }
    const farm = await this.farmsService.deactivate(
      id,
      buildUpdateAuditFieldsFromRequest(request),
      request.authUser,
    );

    return reply.send({
      data: farm,
    });
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = farmIdParamsSchema.parse(request.params);
    const body = updateFarmBodySchema.parse(request.body);
    if (!request.authUser) {
      throw new AppError(401, 'Authentication required.');
    }
    const farm = await this.farmsService.update(
      id,
      body,
      buildUpdateAuditFieldsFromRequest(request),
      request.authUser,
    );

    return reply.send({
      data: farm,
    });
  };
}
