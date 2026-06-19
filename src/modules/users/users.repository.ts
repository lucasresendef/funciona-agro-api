import type { Prisma, PrismaClient } from '@prisma/client';
import { AppError } from '../../shared/errors/app-error';
import {
  buildPaginatedResponse,
  calculatePaginationSkipTake,
} from '../../shared/utils/pagination';
import type { ListUsersQuery } from './users.schemas';

export class UsersRepository {
  constructor(private readonly database: PrismaClient | Prisma.TransactionClient) {}

  async findMany(filters: ListUsersQuery, tenantId: string) {
    const where: Prisma.AppUserWhereInput = {};
    where.tenantId = tenantId;

    if (typeof filters.active === 'boolean') {
      where.active = filters.active;
    } else {
      where.active = true;
    }

    if (typeof filters.isAdmin === 'boolean') {
      where.isAdmin = filters.isAdmin;
    }

    if (filters.search) {
      where.OR = [
        {
          name: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
        {
          keycloakUserId: {
            contains: filters.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const { skip, take } = calculatePaginationSkipTake(filters);
    const [data, total] = await Promise.all([
      this.database.appUser.findMany({
        where,
        skip,
        take,
        orderBy: {
          name: 'asc',
        },
      }),
      this.database.appUser.count({ where }),
    ]);

    return buildPaginatedResponse(data, filters, total);
  }

  async findById(id: string, tenantId: string) {
    return this.database.appUser.findFirst({
      where: { id, tenantId },
    });
  }

  async findByKeycloakUserId(keycloakUserId: string, tenantId: string) {
    return this.database.appUser.findFirst({
      where: { keycloakUserId, tenantId },
    });
  }

  async create(data: Prisma.AppUserUncheckedCreateInput) {
    return this.database.appUser.create({
      data,
    });
  }

  async updateById(id: string, tenantId: string, data: Prisma.AppUserUncheckedUpdateInput) {
    const user = await this.findById(id, tenantId);
    if (!user) {
      return null;
    }

    return this.database.appUser.update({
      where: { id: user.id },
      data,
    });
  }

  async deactivateById(id: string, tenantId: string, data: Prisma.AppUserUncheckedUpdateInput) {
    return this.updateById(id, tenantId, data);
  }

  async upsertByKeycloakUserId(data: Prisma.AppUserUncheckedCreateInput) {
    const { tenantId, email } = data;
    const keycloakUserId = data.keycloakUserId;

    if (!keycloakUserId) {
      throw new AppError(400, 'keycloakUserId is required to sync a user.');
    }

    const existingByKeycloak = await this.database.appUser.findUnique({
      where: {
        tenantId_keycloakUserId: { tenantId, keycloakUserId },
      },
    });

    if (existingByKeycloak) {
      return this.database.appUser.update({
        where: { id: existingByKeycloak.id },
        data: {
          name: data.name,
          email: data.email,
          isAdmin: data.isAdmin,
          active: data.active,
          updatedBy: data.updatedBy,
          updatedByEmail: data.updatedByEmail,
        },
      });
    }

    const existingByEmail = await this.database.appUser.findUnique({
      where: {
        tenantId_email: { tenantId, email },
      },
    });

    if (existingByEmail) {
      return null;
    }

    return this.database.appUser.create({ data });
  }
}
