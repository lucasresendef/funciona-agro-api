import { AppError } from '../../shared/errors/app-error';
import type { CreateAuditFields } from '../../shared/utils/audit';
import type { UsersRepository } from '../users/users.repository';
import type { AuthenticatedUser } from './auth.types';
import type { FarmPermissionRepository } from './farm-permission.repository';

export class AuthProfileService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly farmPermissionRepository: FarmPermissionRepository,
  ) {}

  async me(authUser: AuthenticatedUser) {
    if (!authUser.tenantId) {
      return {
        authUser,
        user: null,
        permissions: [],
      };
    }

    const [user, permissions] = await Promise.all([
      this.usersRepository.findByKeycloakUserId(authUser.sub, authUser.tenantId),
      this.farmPermissionRepository.findActiveDetailedByKeycloakUserId(
        authUser.sub,
        authUser.tenantId,
      ),
    ]);

    return {
      authUser,
      user,
      permissions,
    };
  }

  async syncUser(authUser: AuthenticatedUser, auditFields: CreateAuditFields) {
    if (!authUser.email) {
      throw new AppError(400, 'Authenticated user token does not contain email.');
    }

    if (!authUser.tenantId) {
      return null;
    }

    const name = authUser.name ?? authUser.email;

    return this.usersRepository.upsertByKeycloakUserId({
      tenantId: authUser.tenantId,
      keycloakUserId: authUser.sub,
      name,
      email: authUser.email,
      active: true,
      isAdmin: authUser.realmRoles.includes('app-admin'),
      ...auditFields,
    });
  }
}
