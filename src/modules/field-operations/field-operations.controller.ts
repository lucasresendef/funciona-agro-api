import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  buildCreateAuditFieldsFromRequest,
  buildUpdateAuditFieldsFromRequest,
} from '../../shared/utils/audit';
import {
  createFieldOperationBodySchema,
  fieldOperationIdParamsSchema,
  listFieldOperationsQuerySchema,
  updateFieldOperationBodySchema,
} from './field-operations.schemas';
import type { FieldOperationsService } from './field-operations.service';

export class FieldOperationsController {
  constructor(private readonly fieldOperationsService: FieldOperationsService) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = listFieldOperationsQuerySchema.parse(request.query);
    const operations = await this.fieldOperationsService.list(query, request.authUser);

    return reply.send(operations);
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = createFieldOperationBodySchema.parse(request.body);
    const operation = await this.fieldOperationsService.create(
      body,
      buildCreateAuditFieldsFromRequest(request),
      request.authUser,
    );

    return reply.status(201).send({
      data: operation,
    });
  };

  deactivate = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = fieldOperationIdParamsSchema.parse(request.params);
    const operation = await this.fieldOperationsService.deactivate(
      id,
      buildUpdateAuditFieldsFromRequest(request),
      request.authUser,
    );

    return reply.send({
      data: operation,
    });
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = fieldOperationIdParamsSchema.parse(request.params);
    const body = updateFieldOperationBodySchema.parse(request.body);
    const operation = await this.fieldOperationsService.update(
      id,
      body,
      buildUpdateAuditFieldsFromRequest(request),
      request.authUser,
    );

    return reply.send({
      data: operation,
    });
  };
}
