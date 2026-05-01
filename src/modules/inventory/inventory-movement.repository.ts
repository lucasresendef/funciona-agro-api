import type { Prisma, PrismaClient } from '@prisma/client';

type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export class InventoryMovementRepository {
  constructor(private readonly database: DatabaseClient) {}

  async createMany(data: Prisma.InventoryMovementCreateManyInput[]) {
    return this.database.inventoryMovement.createMany({
      data,
    });
  }

  async create(data: Prisma.InventoryMovementUncheckedCreateInput) {
    return this.database.inventoryMovement.create({
      data,
    });
  }
}
