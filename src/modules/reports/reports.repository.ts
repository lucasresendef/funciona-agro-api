import type { PrismaClient } from '@prisma/client';

export class ReportsRepository {
  constructor(private readonly database: PrismaClient) {}

  async findInventoryMovementsByFarmAndPeriod(input: {
    farmId: string;
    from: Date;
    to: Date;
    tenantId: string;
  }) {
    return this.database.inventoryMovement.findMany({
      where: {
        farmId: input.farmId,
        farm: {
          tenantId: input.tenantId,
        },
        active: true,
        occurredAt: {
          gte: input.from,
          lte: input.to,
        },
      },
      include: {
        farm: true,
        inventoryLocation: true,
        product: {
          include: {
            unitOfMeasure: true,
          },
        },
      },
      orderBy: {
        occurredAt: 'asc',
      },
    });
  }
}
