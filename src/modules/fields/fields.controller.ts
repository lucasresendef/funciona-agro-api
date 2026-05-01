import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  buildCreateAuditFieldsFromRequest,
  buildUpdateAuditFieldsFromRequest,
} from '../../shared/utils/audit';
import {
  createFieldBodySchema,
  fieldIdParamsSchema,
  listFieldsQuerySchema,
  updateFieldBodySchema,
} from './fields.schemas';
import type { FieldsService } from './fields.service';

export class FieldsController {
  constructor(private readonly fieldsService: FieldsService) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = listFieldsQuerySchema.parse(request.query);
    const fields = await this.fieldsService.list(query, request.authUser);

    return reply.send(fields);
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = createFieldBodySchema.parse(request.body);
    const field = await this.fieldsService.create(
      body,
      buildCreateAuditFieldsFromRequest(request),
      request.authUser,
    );

    return reply.status(201).send({
      data: field,
    });
  };

  deactivate = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = fieldIdParamsSchema.parse(request.params);
    const field = await this.fieldsService.deactivate(
      id,
      buildUpdateAuditFieldsFromRequest(request),
      request.authUser,
    );

    return reply.send({
      data: field,
    });
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = fieldIdParamsSchema.parse(request.params);
    const body = updateFieldBodySchema.parse(request.body);
    const field = await this.fieldsService.update(
      id,
      body,
      buildUpdateAuditFieldsFromRequest(request),
      request.authUser,
    );

    return reply.send({
      data: field,
    });
  };
}
