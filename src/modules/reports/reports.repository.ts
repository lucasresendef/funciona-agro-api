import type { MovementType, Prisma, PrismaClient } from '../../shared/database/prisma-client';

export class ReportsRepository {
  constructor(private readonly database: PrismaClient) {}

  async findFarmByIdAndTenant(farmId: string, tenantId: string) {
    return this.database.farm.findFirst({
      where: {
        id: farmId,
        tenantId,
      },
    });
  }

  async findFieldByIdAndTenant(fieldId: string, tenantId: string) {
    return this.database.field.findFirst({
      where: {
        id: fieldId,
        farm: {
          tenantId,
        },
      },
      include: {
        farm: true,
      },
    });
  }

  async *streamInventoryMovements(input: {
    mode: 'current' | 'filtered' | 'all';
    tenantId: string;
    farmId?: string;
    from?: Date;
    to?: Date;
    page?: number;
    pageSize?: number;
    allowedFarmIds?: string[];
  }) {
    const whereBase: Prisma.InventoryMovementWhereInput = {
      active: true,
      ...(input.from && input.to
        ? {
            occurredAt: {
              gte: input.from,
              lte: input.to,
            },
          }
        : {}),
      farm: this.buildFarmScopeWhere(input.tenantId, input.allowedFarmIds),
    };

    const whereWithFarm =
      input.mode === 'all' || !input.farmId ? whereBase : { ...whereBase, farmId: input.farmId };

    const take = input.mode === 'current' ? (input.pageSize ?? 50) : undefined;
    const skip =
      input.mode === 'current' ? ((input.page ?? 1) - 1) * (input.pageSize ?? 50) : undefined;

    const movements = await this.database.inventoryMovement.findMany({
      where: whereWithFarm,
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
      skip,
      take,
    });

    for (const movement of movements) {
      yield {
        occurredAt: movement.occurredAt,
        movementType: movement.movementType,
        farm: movement.farm.name,
        location: movement.inventoryLocation.name,
        productCode: movement.product.code,
        productName: movement.product.name,
        unit: movement.product.unitOfMeasure.symbol,
        quantity: Number(movement.quantity),
        unitCost: Number(movement.unitCost),
        totalCost: Number(movement.totalCost),
        referenceType: movement.referenceType ?? '',
        referenceId: movement.referenceId ?? '',
        notes: movement.notes ?? '',
      };
    }
  }

  async findFieldConsumptionByFieldAndPeriod(input: {
    fieldId: string;
    from: Date;
    to: Date;
    tenantId: string;
  }) {
    return this.database.fieldOperationItemFieldResult.findMany({
      where: {
        fieldId: input.fieldId,
        active: true,
        fieldOperationItem: {
          active: true,
          fieldOperation: {
            active: true,
            status: 'FINISHED',
            farm: {
              tenantId: input.tenantId,
            },
            operationDate: {
              gte: input.from,
              lte: input.to,
            },
          },
        },
      },
      include: {
        field: true,
        fieldOperationItem: {
          include: {
            product: {
              include: {
                unitOfMeasure: true,
              },
            },
            fieldOperation: {
              include: {
                farm: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async countFinishedOperationsByPeriod(input: {
    from: Date;
    to: Date;
    tenantId: string;
    farmIds?: string[];
  }) {
    return this.database.fieldOperation.count({
      where: {
        active: true,
        status: 'FINISHED',
        operationDate: {
          gte: input.from,
          lte: input.to,
        },
        farm: this.buildFarmScopeWhere(input.tenantId, input.farmIds),
      },
    });
  }

  async aggregateOperationConsumptionByPeriod(input: {
    from: Date;
    to: Date;
    tenantId: string;
    farmIds?: string[];
  }) {
    return this.database.fieldOperationItem.aggregate({
      where: {
        active: true,
        fieldOperation: {
          active: true,
          status: 'FINISHED',
          operationDate: {
            gte: input.from,
            lte: input.to,
          },
          farm: this.buildFarmScopeWhere(input.tenantId, input.farmIds),
        },
      },
      _sum: {
        quantityConsumed: true,
        totalCostConsumed: true,
      },
    });
  }

  async findMostUsedProductByPeriod(input: {
    from: Date;
    to: Date;
    tenantId: string;
    farmIds?: string[];
  }) {
    const grouped = await this.database.fieldOperationItem.groupBy({
      by: ['productId'],
      where: {
        active: true,
        fieldOperation: {
          active: true,
          status: 'FINISHED',
          operationDate: {
            gte: input.from,
            lte: input.to,
          },
          farm: this.buildFarmScopeWhere(input.tenantId, input.farmIds),
        },
      },
      _sum: {
        quantityConsumed: true,
        totalCostConsumed: true,
      },
      _count: {
        _all: true,
      },
      orderBy: {
        _sum: {
          quantityConsumed: 'desc',
        },
      },
      take: 1,
    });

    const top = grouped[0];
    if (!top) {
      return null;
    }

    const scopedProduct = await this.database.product.findFirst({
      where: {
        id: top.productId,
        tenantId: input.tenantId,
      },
      include: {
        unitOfMeasure: true,
      },
    });

    if (!scopedProduct) {
      return null;
    }

    return {
      productId: scopedProduct.id,
      productCode: scopedProduct.code,
      productName: scopedProduct.name,
      unit: scopedProduct.unitOfMeasure.symbol,
      totalQuantityConsumed: Number(top._sum.quantityConsumed ?? 0),
      totalCostConsumed: Number(top._sum.totalCostConsumed ?? 0),
      operationItemCount: top._count._all,
    };
  }

  async findProductWithLowestEstimatedStockByDate(input: {
    to: Date;
    tenantId: string;
    farmIds?: string[];
  }) {
    const grouped = await this.database.inventoryMovement.groupBy({
      by: ['productId', 'movementType'],
      where: {
        active: true,
        occurredAt: {
          lte: input.to,
        },
        farm: this.buildFarmScopeWhere(input.tenantId, input.farmIds),
      },
      _sum: {
        quantity: true,
      },
    });

    if (grouped.length === 0) {
      return null;
    }

    const quantityByProduct = new Map<string, number>();
    for (const row of grouped) {
      const current = quantityByProduct.get(row.productId) ?? 0;
      const quantity = Number(row._sum.quantity ?? 0);
      quantityByProduct.set(
        row.productId,
        current + this.toStockSignal(row.movementType as MovementType) * quantity,
      );
    }

    const productIds = [...quantityByProduct.keys()];
    const products = await this.database.product.findMany({
      where: {
        id: {
          in: productIds,
        },
        tenantId: input.tenantId,
      },
      include: {
        unitOfMeasure: true,
      },
    });

    let lowest: {
      productId: string;
      productCode: string;
      productName: string;
      unit: string;
      estimatedStockQuantity: number;
    } | null = null;

    for (const product of products) {
      const estimatedStockQuantity = quantityByProduct.get(product.id) ?? 0;
      if (!lowest || estimatedStockQuantity < lowest.estimatedStockQuantity) {
        lowest = {
          productId: product.id,
          productCode: product.code,
          productName: product.name,
          unit: product.unitOfMeasure.symbol,
          estimatedStockQuantity,
        };
      }
    }

    return lowest;
  }

  async findFieldConsumptionExtremesByPeriod(input: {
    from: Date;
    to: Date;
    tenantId: string;
    farmIds?: string[];
  }) {
    const grouped = await this.database.fieldOperationItemFieldResult.groupBy({
      by: ['fieldId'],
      where: {
        active: true,
        fieldOperationItem: {
          active: true,
          fieldOperation: {
            active: true,
            status: 'FINISHED',
            operationDate: {
              gte: input.from,
              lte: input.to,
            },
            farm: this.buildFarmScopeWhere(input.tenantId, input.farmIds),
          },
        },
      },
      _sum: {
        allocatedQuantityConsumed: true,
        allocatedTotalCostConsumed: true,
      },
    });

    if (grouped.length === 0) {
      return {
        highest: null,
        lowest: null,
      };
    }

    const sortedByCost = [...grouped].sort((a, b) => {
      const costA = Number(a._sum.allocatedTotalCostConsumed ?? 0);
      const costB = Number(b._sum.allocatedTotalCostConsumed ?? 0);
      return costA - costB;
    });

    const lowest = sortedByCost[0];
    const highest = sortedByCost[sortedByCost.length - 1];
    const fieldIds = [lowest.fieldId, highest.fieldId];

    const fields = await this.database.field.findMany({
      where: {
        id: {
          in: fieldIds,
        },
      },
      include: {
        farm: true,
      },
    });
    const fieldsById = new Map(fields.map((field) => [field.id, field]));

    return {
      highest: this.mapFieldConsumptionExtreme(highest, fieldsById),
      lowest: this.mapFieldConsumptionExtreme(lowest, fieldsById),
    };
  }

  private mapFieldConsumptionExtreme(
    input: {
      fieldId: string;
      _sum: {
        allocatedQuantityConsumed: Prisma.Decimal | null;
        allocatedTotalCostConsumed: Prisma.Decimal | null;
      };
    },
    fieldsById: Map<string, { id: string; name: string; farmId: string; farm: { name: string } }>,
  ) {
    const field = fieldsById.get(input.fieldId);
    if (!field) {
      return null;
    }

    return {
      fieldId: field.id,
      fieldName: field.name,
      farmId: field.farmId,
      farmName: field.farm.name,
      totalAllocatedQuantityConsumed: Number(input._sum.allocatedQuantityConsumed ?? 0),
      totalAllocatedCostConsumed: Number(input._sum.allocatedTotalCostConsumed ?? 0),
    };
  }

  private buildFarmScopeWhere(tenantId: string, farmIds?: string[]): Prisma.FarmWhereInput {
    if (farmIds) {
      return {
        tenantId,
        id: {
          in: farmIds,
        },
      };
    }

    return { tenantId };
  }

  private toStockSignal(movementType: MovementType): number {
    switch (movementType) {
      case 'ENTRY':
      case 'RETURN_FROM_FIELD':
      case 'ADJUSTMENT_IN':
        return 1;
      case 'OUTBOUND_TO_FIELD':
      case 'ADJUSTMENT_OUT':
        return -1;
      default:
        return 0;
    }
  }
}
