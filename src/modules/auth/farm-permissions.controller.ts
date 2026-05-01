import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  buildCreateAuditFieldsFromRequest,
  buildUpdateAuditFieldsFromRequest,
} from '../../shared/utils/audit';
import {
  createFarmPermissionBodySchema,
  farmPermissionIdParamsSchema,
  listFarmPermissionsQuerySchema,
  updateFarmPermissionBodySchema,
} from './farm-permissions.schemas';
import type { FarmPermissionsService } from './farm-permissions.service';

export class FarmPermissionsController {
  constructor(private readonly farmPermissionsService: FarmPermissionsService) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = listFarmPermissionsQuerySchema.parse(request.query);
    const permissions = await this.farmPermissionsService.list(query, request.authUser);

    return reply.send(permissions);
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = createFarmPermissionBodySchema.parse(request.body);
    const permission = await this.farmPermissionsService.create(
      body,
      buildCreateAuditFieldsFromRequest(request),
      request.authUser,
    );

    return reply.status(201).send({
      data: permission,
    });
  };

  deactivate = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = farmPermissionIdParamsSchema.parse(request.params);
    const permission = await this.farmPermissionsService.deactivate(
      id,
      buildUpdateAuditFieldsFromRequest(request),
      request.authUser,
    );

    return reply.send({
      data: permission,
    });
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = farmPermissionIdParamsSchema.parse(request.params);
    const body = updateFarmPermissionBodySchema.parse(request.body);
    const permission = await this.farmPermissionsService.update(
      id,
      body,
      buildUpdateAuditFieldsFromRequest(request),
      request.authUser,
    );

    return reply.send({
      data: permission,
    });
  };
}
