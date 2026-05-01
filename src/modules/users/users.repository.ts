import type { Prisma, PrismaClient } from '@prisma/client';
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
    // Try to find existing user by keycloakUserId
    const existingUser = await this.database.appUser.findUnique({
      where: {
        tenantId_keycloakUserId: {
          tenantId: data.tenantId,
          keycloakUserId: data.keycloakUserId,
        },
      },
    });

    if (existingUser) {
      // Update existing user
      return this.database.appUser.update({
        where: { id: existingUser.id },
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

    // Try to find user by email
    const userByEmail = await this.database.appUser.findUnique({
      where: {
        tenantId_email: {
          tenantId: data.tenantId,
          email: data.email!,
        },
      },
    });

    if (userByEmail) {
      // Update existing user by email
      return this.database.appUser.update({
        where: { id: userByEmail.id },
        data: {
          keycloakUserId: data.keycloakUserId,
          name: data.name,
          isAdmin: data.isAdmin,
          active: data.active,
          updatedBy: data.updatedBy,
          updatedByEmail: data.updatedByEmail,
        },
      });
    }

    // Create new user
    return this.database.appUser.create({
      data,
    });
  }
}
