import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../../shared/errors/app-error';
import {
  buildCreateAuditFieldsFromRequest,
  buildUpdateAuditFieldsFromRequest,
} from '../../shared/utils/audit';
import {
  createSupportTenantUserBodySchema,
  resetSupportTenantUserPasswordBodySchema,
  updateSupportTenantUserBodySchema,
} from '../support-tenants/support-tenants.schemas';
import type { SupportTenantsService } from '../support-tenants/support-tenants.service';
import { linkKeycloakUserBodySchema, listUsersQuerySchema, userIdParamsSchema } from './users.schemas';
import type { UsersService } from './users.service';

export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly supportTenantsService: SupportTenantsService,
  ) {}

  list = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = listUsersQuerySchema.parse(request.query);
    const users = await this.usersService.list(query, request.authUser);

    return reply.send(users);
  };

  create = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = createSupportTenantUserBodySchema.parse(request.body);
    if (!request.authUser) {
      throw new AppError(401, 'Authentication required.');
    }
    const result = await this.supportTenantsService.createTenantUser(
      request.authUser.tenantId,
      body,
      buildCreateAuditFieldsFromRequest(request),
    );

    return reply.status(201).send({
      data: result,
    });
  };

  update = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = userIdParamsSchema.parse(request.params);
    const body = updateSupportTenantUserBodySchema.parse(request.body);
    if (!request.authUser) {
      throw new AppError(401, 'Authentication required.');
    }
    const user = await this.supportTenantsService.updateTenantUser(
      request.authUser.tenantId,
      id,
      body,
      buildUpdateAuditFieldsFromRequest(request),
    );

    return reply.send({
      data: user,
    });
  };

  resetPassword = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = userIdParamsSchema.parse(request.params);
    const body = resetSupportTenantUserPasswordBodySchema.parse(request.body);
    if (!request.authUser) {
      throw new AppError(401, 'Authentication required.');
    }
    const result = await this.supportTenantsService.resetTenantUserPassword(
      request.authUser.tenantId,
      id,
      body,
    );

    return reply.send({
      data: result,
    });
  };

  deactivate = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = userIdParamsSchema.parse(request.params);
    if (!request.authUser) {
      throw new AppError(401, 'Authentication required.');
    }
    const user = await this.supportTenantsService.deactivateTenantUser(
      request.authUser.tenantId,
      id,
      buildUpdateAuditFieldsFromRequest(request),
    );

    return reply.send({
      data: user,
    });
  };

  linkKeycloak = async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = userIdParamsSchema.parse(request.params);
    const body = linkKeycloakUserBodySchema.parse(request.body);
    if (!request.authUser) {
      throw new AppError(401, 'Authentication required.');
    }
    const user = await this.usersService.linkKeycloak(
      id,
      body.keycloakUserId,
      buildUpdateAuditFieldsFromRequest(request),
      request.authUser,
    );

    return reply.send({
      data: user,
    });
  };
}
