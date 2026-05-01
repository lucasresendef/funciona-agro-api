import { AppError } from '../../shared/errors/app-error';
import type { AuthenticatedUser } from './auth.types';
import type { FarmPermissionRepository } from './farm-permission.repository';

interface AssertFarmAccessInput {
  authUser: AuthenticatedUser | null;
  farmId: string;
}

export class FarmAccessService {
  constructor(private readonly farmPermissionRepository: FarmPermissionRepository) {}

  async assertUserCanAccessFarm(input: AssertFarmAccessInput): Promise<void> {
    if (!input.authUser) {
      throw new AppError(401, 'Authentication required.');
    }

    if (input.authUser.realmRoles.includes('app-admin')) {
      return;
    }

    const permissions = await this.farmPermissionRepository.findActiveByKeycloakUserId(
      input.authUser.sub,
      input.authUser.tenantId,
    );

    if (permissions.length === 0) {
      throw new AppError(403, 'User has no farm permissions.');
    }

    const hasAccess = permissions.some((permission) => permission.farmId === input.farmId);

    if (!hasAccess) {
      throw new AppError(403, 'User has no access to the requested farm.');
    }
  }

  async getAllowedFarmIds(authUser: AuthenticatedUser | null): Promise<string[] | null> {
    if (!authUser) {
      throw new AppError(401, 'Authentication required.');
    }

    if (authUser.realmRoles.includes('app-admin')) {
      return null;
    }

    return this.farmPermissionRepository.findActiveFarmIdsByKeycloakUserId(
      authUser.sub,
      authUser.tenantId,
    );
  }
}
