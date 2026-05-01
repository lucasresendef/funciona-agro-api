import type { FastifyRequest } from 'fastify';
import type { AuthenticatedUser } from '../../modules/auth/auth.types';
import { AppError } from '../errors/app-error';

export interface CreateAuditFields {
  createdBy: string | null;
  createdByEmail: string | null;
  updatedBy: string | null;
  updatedByEmail: string | null;
}

export interface UpdateAuditFields {
  updatedBy: string | null;
  updatedByEmail: string | null;
}

export function buildCreateAuditFields(
  authUser: AuthenticatedUser | null | undefined,
): CreateAuditFields {
  return {
    createdBy: authUser?.sub ?? null,
    createdByEmail: authUser?.email ?? null,
    updatedBy: authUser?.sub ?? null,
    updatedByEmail: authUser?.email ?? null,
  };
}

export function buildUpdateAuditFields(
  authUser: AuthenticatedUser | null | undefined,
): UpdateAuditFields {
  return {
    updatedBy: authUser?.sub ?? null,
    updatedByEmail: authUser?.email ?? null,
  };
}

export function buildCreateAuditFieldsFromRequest(request: FastifyRequest): CreateAuditFields {
  if (!request.authUser?.sub) {
    throw new AppError(401, 'Authentication required for audit fields.');
  }

  return {
    createdBy: request.authUser.sub,
    createdByEmail: request.authUser.email,
    updatedBy: request.authUser.sub,
    updatedByEmail: request.authUser.email,
  };
}

export function buildUpdateAuditFieldsFromRequest(request: FastifyRequest): UpdateAuditFields {
  if (!request.authUser?.sub) {
    throw new AppError(401, 'Authentication required for audit fields.');
  }

  return {
    updatedBy: request.authUser.sub,
    updatedByEmail: request.authUser.email,
  };
}
