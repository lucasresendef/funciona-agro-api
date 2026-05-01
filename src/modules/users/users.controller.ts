import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../../shared/errors/app-error';
import {
  buildCreateAuditFieldsFromRequest,
  buildUpdateAuditFieldsFromRequest,
} from '../../shared/utils/audit';
import {
  createUserBodySchema,
  listUsersQuerySchema,
  updateUserBodySchema,
  userIdParamsSchema,
} from './users.schemas';
import type { UsersService } from './users.service';

export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = listUsersQuerySchema.parse(request.query);
    const users = await this.usersService.list(query, request.authUser);

    return reply.send(users);
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = createUserBodySchema.parse(request.body);
    if (!request.authUser) {
      throw new AppError(401, 'Authentication required.');
    }
    const user = await this.usersService.create(
      body,
      buildCreateAuditFieldsFromRequest(request),
      request.authUser,
    );

    return reply.status(201).send({
      data: user,
    });
  };

  deactivate = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = userIdParamsSchema.parse(request.params);
    if (!request.authUser) {
      throw new AppError(401, 'Authentication required.');
    }
    const user = await this.usersService.deactivate(
      id,
      buildUpdateAuditFieldsFromRequest(request),
      request.authUser,
    );

    return reply.send({
      data: user,
    });
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = userIdParamsSchema.parse(request.params);
    const body = updateUserBodySchema.parse(request.body);
    if (!request.authUser) {
      throw new AppError(401, 'Authentication required.');
    }
    const user = await this.usersService.update(
      id,
      body,
      buildUpdateAuditFieldsFromRequest(request),
      request.authUser,
    );

    return reply.send({
      data: user,
    });
  };
}
