import type { FastifyReply, FastifyRequest } from 'fastify';
import { buildCreateAuditFields } from '../../shared/utils/audit';
import { AppError } from '../../shared/errors/app-error';
import type { AuthProfileService } from './auth-profile.service';

export class AuthProfileController {
  constructor(private readonly authProfileService: AuthProfileService) {}

  me = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.authUser) {
      throw new AppError(401, 'Authentication required.');
    }

    const data = await this.authProfileService.me(request.authUser);

    return reply.send({
      data,
    });
  };

  syncUser = async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.authUser) {
      throw new AppError(401, 'Authentication required.');
    }

    const data = await this.authProfileService.syncUser(
      request.authUser,
      buildCreateAuditFields(request.authUser),
    );

    return reply.send({
      data,
    });
  };
}
