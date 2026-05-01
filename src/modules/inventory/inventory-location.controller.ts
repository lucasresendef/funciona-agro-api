import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  buildCreateAuditFieldsFromRequest,
  buildUpdateAuditFieldsFromRequest,
} from '../../shared/utils/audit';
import {
  createInventoryLocationBodySchema,
  inventoryLocationIdParamsSchema,
  listInventoryLocationsQuerySchema,
  updateInventoryLocationBodySchema,
} from './inventory-location.schemas';
import type { InventoryLocationService } from './inventory-location.service';

export class InventoryLocationController {
  constructor(private readonly inventoryLocationService: InventoryLocationService) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = listInventoryLocationsQuerySchema.parse(request.query);
    const locations = await this.inventoryLocationService.list(query, request.authUser);

    return reply.send(locations);
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = createInventoryLocationBodySchema.parse(request.body);
    const location = await this.inventoryLocationService.create(
      body,
      buildCreateAuditFieldsFromRequest(request),
      request.authUser,
    );

    return reply.status(201).send({
      data: location,
    });
  };

  deactivate = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = inventoryLocationIdParamsSchema.parse(request.params);
    const location = await this.inventoryLocationService.deactivate(
      id,
      buildUpdateAuditFieldsFromRequest(request),
      request.authUser,
    );

    return reply.send({
      data: location,
    });
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = inventoryLocationIdParamsSchema.parse(request.params);
    const body = updateInventoryLocationBodySchema.parse(request.body);
    const location = await this.inventoryLocationService.update(
      id,
      body,
      buildUpdateAuditFieldsFromRequest(request),
      request.authUser,
    );

    return reply.send({
      data: location,
    });
  };
}
