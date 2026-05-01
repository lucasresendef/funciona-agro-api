import type { FastifyReply, FastifyRequest } from 'fastify';
import type { KeycloakAuthService } from './keycloak-auth.service';
import { loginBodySchema, refreshBodySchema } from './auth-public.schemas';

export class AuthPublicController {
  constructor(private readonly keycloakAuthService: KeycloakAuthService) {}

  login = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = loginBodySchema.parse(request.body);
    const data = await this.keycloakAuthService.login(body);

    return reply.send({
      data,
    });
  };

  refresh = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = refreshBodySchema.parse(request.body);
    const data = await this.keycloakAuthService.refresh(body);

    return reply.send({
      data,
    });
  };
}
