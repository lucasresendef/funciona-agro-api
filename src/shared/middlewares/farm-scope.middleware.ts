import type { AuthenticatedUser } from '../../modules/auth/auth.types';

export interface FarmScopeContext {
  authUser: AuthenticatedUser | null;
  farmId: string;
}
