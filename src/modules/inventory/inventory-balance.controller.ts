import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  buildCreateAuditFieldsFromRequest,
  buildUpdateAuditFieldsFromRequest,
} from '../../shared/utils/audit';
import {
  createInventoryBalanceBodySchema,
  inventoryBalanceIdParamsSchema,
  listInventoryBalanceQuerySchema,
  updateInventoryBalanceBodySchema,
} from './inventory-balance.schemas';
import type { InventoryBalanceService } from './inventory-balance.service';

export class InventoryBalanceController {
  constructor(private readonly inventoryBalanceService: InventoryBalanceService) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = listInventoryBalanceQuerySchema.parse(request.query);
    const balances = await this.inventoryBalanceService.list(query, request.authUser);

    return reply.send(balances);
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = createInventoryBalanceBodySchema.parse(request.body);
    const balance = await this.inventoryBalanceService.createOrAdjust(
      body,
      buildCreateAuditFieldsFromRequest(request),
      request.authUser,
    );

    return reply.status(201).send({
      data: balance,
    });
  };

  deactivate = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = inventoryBalanceIdParamsSchema.parse(request.params);
    const balance = await this.inventoryBalanceService.deactivate(
      id,
      buildUpdateAuditFieldsFromRequest(request),
      request.authUser,
    );

    return reply.send({
      data: balance,
    });
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = inventoryBalanceIdParamsSchema.parse(request.params);
    const body = updateInventoryBalanceBodySchema.parse(request.body);
    const balance = await this.inventoryBalanceService.update(
      id,
      body,
      buildUpdateAuditFieldsFromRequest(request),
      request.authUser,
    );

    return reply.send({
      data: balance,
    });
  };
}
