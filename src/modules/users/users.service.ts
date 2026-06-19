import type { CreateAuditFields } from '../../shared/utils/audit';
import type { UpdateAuditFields } from '../../shared/utils/audit';
import { AppError } from '../../shared/errors/app-error';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { CreateUserBody, ListUsersQuery, UpdateUserBody } from './users.schemas';
import type { UsersRepository } from './users.repository';

export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async list(filters: ListUsersQuery, authUser: AuthenticatedUser | null) {
    if (!authUser) {
      throw new AppError(401, 'Authentication required.');
    }

    return this.usersRepository.findMany(filters, authUser.tenantId);
  }

  async findById(id: string, tenantId: string) {
    return this.usersRepository.findById(id, tenantId);
  }

  async findByKeycloakUserId(keycloakUserId: string, tenantId: string) {
    return this.usersRepository.findByKeycloakUserId(keycloakUserId, tenantId);
  }

  async create(input: CreateUserBody, auditFields: CreateAuditFields, authUser: AuthenticatedUser) {
    return this.usersRepository.create({
      tenantId: authUser.tenantId,
      keycloakUserId: input.keycloakUserId,
      name: input.name,
      email: input.email,
      isAdmin: input.isAdmin ?? false,
      active: true,
      ...auditFields,
    });
  }

  async linkKeycloak(
    id: string,
    keycloakUserId: string,
    auditFields: UpdateAuditFields,
    authUser: AuthenticatedUser,
  ) {
    const user = await this.usersRepository.findById(id, authUser.tenantId);

    if (!user) {
      throw new AppError(404, 'User not found.');
    }

    if (user.keycloakUserId === keycloakUserId) {
      return user;
    }

    if (user.keycloakUserId) {
      throw new AppError(409, 'User is already linked to a Keycloak account.');
    }

    const existing = await this.usersRepository.findByKeycloakUserId(
      keycloakUserId,
      authUser.tenantId,
    );

    if (existing) {
      throw new AppError(409, 'This Keycloak account is already linked to another user.');
    }

    return this.usersRepository.updateById(id, authUser.tenantId, {
      keycloakUserId,
      ...auditFields,
    });
  }

  async deactivate(id: string, auditFields: UpdateAuditFields, authUser: AuthenticatedUser) {
    const user = await this.usersRepository.findById(id, authUser.tenantId);

    if (!user) {
      throw new AppError(404, 'User not found.');
    }

    return this.usersRepository.deactivateById(id, authUser.tenantId, {
      active: false,
      ...auditFields,
    });
  }

  async update(
    id: string,
    input: UpdateUserBody,
    auditFields: UpdateAuditFields,
    authUser: AuthenticatedUser,
  ) {
    const user = await this.usersRepository.findById(id, authUser.tenantId);

    if (!user) {
      throw new AppError(404, 'User not found.');
    }

    return this.usersRepository.updateById(id, authUser.tenantId, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.email !== undefined ? { email: input.email } : {}),
      ...(input.isAdmin !== undefined ? { isAdmin: input.isAdmin } : {}),
      ...auditFields,
    });
  }
}
