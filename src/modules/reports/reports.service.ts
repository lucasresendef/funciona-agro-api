import { AppError } from '../../shared/errors/app-error';
import { CsvService } from '../../shared/services/csv.service';
import type { CsvExportMode } from '../../shared/services/csv.service';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { FarmAccessService } from '../auth/farm-access.service';
import type { DashboardMetricsQuery } from './reports.schemas';
import type { FieldConsumptionReportQuery } from './reports.schemas';
import type { InventoryMovementsCsvQuery } from './reports.schemas';
import type { ReportsRepository } from './reports.repository';

const MAX_REPORT_RANGE_DAYS = 31;
const MAX_DASHBOARD_RANGE_DAYS = 366;

function round6(value: number): number {
  return Number(value.toFixed(6));
}

export class ReportsService {
  constructor(
    private readonly reportsRepository: ReportsRepository,
    private readonly farmAccessService: FarmAccessService,
    private readonly csvService: CsvService = new CsvService(),
  ) {}

  async exportInventoryMovementsCsv(input: InventoryMovementsCsvQuery, authUser: AuthenticatedUser | null) {
    if (!authUser) {
      throw new AppError(401, 'Authentication required.');
    }

    if (input.mode !== 'all') {
      if (!input.from || !input.to) {
        throw new AppError(400, '"from" and "to" are required when mode is not "all".');
      }
      if (input.to < input.from) {
        throw new AppError(400, '"to" must be greater than or equal to "from".');
      }
      const rangeMs = input.to.getTime() - input.from.getTime();
      const maxRangeMs = MAX_REPORT_RANGE_DAYS * 24 * 60 * 60 * 1000;
      if (rangeMs > maxRangeMs) {
        throw new AppError(
          400,
          `"from" and "to" range cannot exceed ${MAX_REPORT_RANGE_DAYS} days.`,
        );
      }
      if (!input.farmId) {
        throw new AppError(400, '"farmId" is required when mode is not "all".');
      }
    }

    const mode = input.mode as CsvExportMode;
    const allowedFarmIds = await this.farmAccessService.getAllowedFarmIds(authUser);
    if (allowedFarmIds && allowedFarmIds.length === 0) {
      const empty = this.csvService.generateStream({
        screen: 'inventory-movements',
        mode,
        filename: 'inventory-movements.csv',
        source: [],
        columns: this.inventoryMovementCsvColumns(),
      });
      return { fileName: empty.filename, stream: empty.stream };
    }

    if (input.farmId) {
      await this.farmAccessService.assertUserCanAccessFarm({
        authUser,
        farmId: input.farmId,
      });
    }

    const source = this.reportsRepository.streamInventoryMovements({
      mode,
      tenantId: authUser.tenantId,
      farmId: input.farmId,
      from: input.from,
      to: input.to,
      page: input.page,
      pageSize: input.pageSize,
      allowedFarmIds: allowedFarmIds ?? undefined,
    });

    const csv = this.csvService.generateStream({
      screen: 'inventory-movements',
      mode,
      filename: 'inventory-movements.csv',
      source,
      columns: this.inventoryMovementCsvColumns(),
    });

    return {
      fileName: csv.filename,
      stream: csv.stream,
    };
  }

  async getFieldConsumptionReport(
    input: FieldConsumptionReportQuery,
    authUser: AuthenticatedUser | null,
  ) {
    if (!authUser) {
      throw new AppError(401, 'Authentication required.');
    }

    if (input.to < input.from) {
      throw new AppError(400, '"to" must be greater than or equal to "from".');
    }

    const field = await this.reportsRepository.findFieldByIdAndTenant(
      input.fieldId,
      authUser.tenantId,
    );

    if (!field) {
      throw new AppError(404, 'Field not found for the authenticated tenant.');
    }

    await this.farmAccessService.assertUserCanAccessFarm({
      authUser,
      farmId: field.farmId,
    });

    const results = await this.reportsRepository.findFieldConsumptionByFieldAndPeriod({
      fieldId: input.fieldId,
      from: input.from,
      to: input.to,
      tenantId: authUser.tenantId,
    });

    if (results.length === 0) {
      return {
        fieldId: field.id,
        fieldName: field.name,
        farmId: field.farmId,
        farmName: field.farm.name,
        period: {
          from: input.from.toISOString(),
          to: input.to.toISOString(),
        },
        summary: {
          totalAllocatedQuantityConsumed: 0,
          totalAllocatedCostConsumed: 0,
          operationCount: 0,
          itemCount: 0,
        },
        items: [],
      };
    }
    const first = results[0];

    const byProduct = new Map<
      string,
      {
        productId: string;
        productCode: string;
        productName: string;
        unit: string;
        totalAllocatedQuantityConsumed: number;
        totalAllocatedCostConsumed: number;
      }
    >();
    const operationIds = new Set<string>();

    for (const result of results) {
      const product = result.fieldOperationItem.product;
      const operation = result.fieldOperationItem.fieldOperation;
      operationIds.add(operation.id);

      const current = byProduct.get(product.id) ?? {
        productId: product.id,
        productCode: product.code,
        productName: product.name,
        unit: product.unitOfMeasure.symbol,
        totalAllocatedQuantityConsumed: 0,
        totalAllocatedCostConsumed: 0,
      };

      current.totalAllocatedQuantityConsumed += Number(result.allocatedQuantityConsumed);
      current.totalAllocatedCostConsumed += Number(result.allocatedTotalCostConsumed);
      byProduct.set(product.id, current);
    }

    const items = [...byProduct.values()].map((item) => ({
      ...item,
      totalAllocatedQuantityConsumed: Number(item.totalAllocatedQuantityConsumed.toFixed(6)),
      totalAllocatedCostConsumed: Number(item.totalAllocatedCostConsumed.toFixed(6)),
    }));

    const summary = items.reduce(
      (acc, item) => ({
        totalAllocatedQuantityConsumed:
          acc.totalAllocatedQuantityConsumed + item.totalAllocatedQuantityConsumed,
        totalAllocatedCostConsumed: acc.totalAllocatedCostConsumed + item.totalAllocatedCostConsumed,
      }),
      {
        totalAllocatedQuantityConsumed: 0,
        totalAllocatedCostConsumed: 0,
      },
    );

    return {
      fieldId: first.field.id,
      fieldName: first.field.name,
      farmId: first.fieldOperationItem.fieldOperation.farmId,
      farmName: first.fieldOperationItem.fieldOperation.farm.name,
      period: {
        from: input.from.toISOString(),
        to: input.to.toISOString(),
      },
      summary: {
        totalAllocatedQuantityConsumed: Number(summary.totalAllocatedQuantityConsumed.toFixed(6)),
        totalAllocatedCostConsumed: Number(summary.totalAllocatedCostConsumed.toFixed(6)),
        operationCount: operationIds.size,
        itemCount: items.length,
      },
      items,
    };
  }

  async getDashboardMetrics(input: DashboardMetricsQuery, authUser: AuthenticatedUser | null) {
    if (!authUser) {
      throw new AppError(401, 'Authentication required.');
    }

    if (input.to < input.from) {
      throw new AppError(400, '"to" must be greater than or equal to "from".');
    }

    const rangeMs = input.to.getTime() - input.from.getTime();
    const maxRangeMs = MAX_DASHBOARD_RANGE_DAYS * 24 * 60 * 60 * 1000;
    if (rangeMs > maxRangeMs) {
      throw new AppError(
        400,
        `"from" and "to" range cannot exceed ${MAX_DASHBOARD_RANGE_DAYS} days.`,
      );
    }

    let scopedFarmIds: string[] | undefined;
    if (input.farmId) {
      const farm = await this.reportsRepository.findFarmByIdAndTenant(input.farmId, authUser.tenantId);
      if (!farm) {
        throw new AppError(404, 'Farm not found for the authenticated tenant.');
      }

      await this.farmAccessService.assertUserCanAccessFarm({
        authUser,
        farmId: input.farmId,
      });
      scopedFarmIds = [input.farmId];
    } else {
      const allowedFarmIds = await this.farmAccessService.getAllowedFarmIds(authUser);
      if (allowedFarmIds && allowedFarmIds.length === 0) {
        return this.buildEmptyDashboardMetrics(input);
      }
      scopedFarmIds = allowedFarmIds ?? undefined;
    }

    const [operationCount, operationConsumption, mostUsedProduct, lowestStockProduct, fieldExtremes] =
      await Promise.all([
        this.reportsRepository.countFinishedOperationsByPeriod({
          from: input.from,
          to: input.to,
          tenantId: authUser.tenantId,
          farmIds: scopedFarmIds,
        }),
        this.reportsRepository.aggregateOperationConsumptionByPeriod({
          from: input.from,
          to: input.to,
          tenantId: authUser.tenantId,
          farmIds: scopedFarmIds,
        }),
        this.reportsRepository.findMostUsedProductByPeriod({
          from: input.from,
          to: input.to,
          tenantId: authUser.tenantId,
          farmIds: scopedFarmIds,
        }),
        this.reportsRepository.findProductWithLowestEstimatedStockByDate({
          to: input.to,
          tenantId: authUser.tenantId,
          farmIds: scopedFarmIds,
        }),
        this.reportsRepository.findFieldConsumptionExtremesByPeriod({
          from: input.from,
          to: input.to,
          tenantId: authUser.tenantId,
          farmIds: scopedFarmIds,
        }),
      ]);

    return {
      period: {
        from: input.from.toISOString(),
        to: input.to.toISOString(),
      },
      filters: {
        farmId: input.farmId ?? null,
      },
      operations: {
        totalFinishedOperations: operationCount,
        totalQuantityConsumed: round6(Number(operationConsumption._sum.quantityConsumed ?? 0)),
        totalCostConsumed: round6(Number(operationConsumption._sum.totalCostConsumed ?? 0)),
      },
      mostUsedProduct: mostUsedProduct
        ? {
            ...mostUsedProduct,
            totalQuantityConsumed: round6(mostUsedProduct.totalQuantityConsumed),
            totalCostConsumed: round6(mostUsedProduct.totalCostConsumed),
          }
        : null,
      lowestStockProduct: lowestStockProduct
        ? {
            ...lowestStockProduct,
            estimatedStockQuantity: round6(lowestStockProduct.estimatedStockQuantity),
            calculatedUntil: input.to.toISOString(),
          }
        : null,
      fieldConsumption: {
        highest: fieldExtremes.highest
          ? {
              ...fieldExtremes.highest,
              totalAllocatedQuantityConsumed: round6(
                fieldExtremes.highest.totalAllocatedQuantityConsumed,
              ),
              totalAllocatedCostConsumed: round6(fieldExtremes.highest.totalAllocatedCostConsumed),
            }
          : null,
        lowest: fieldExtremes.lowest
          ? {
              ...fieldExtremes.lowest,
              totalAllocatedQuantityConsumed: round6(
                fieldExtremes.lowest.totalAllocatedQuantityConsumed,
              ),
              totalAllocatedCostConsumed: round6(fieldExtremes.lowest.totalAllocatedCostConsumed),
            }
          : null,
      },
    };
  }

  private buildEmptyDashboardMetrics(input: DashboardMetricsQuery) {
    return {
      period: {
        from: input.from.toISOString(),
        to: input.to.toISOString(),
      },
      filters: {
        farmId: input.farmId ?? null,
      },
      operations: {
        totalFinishedOperations: 0,
        totalQuantityConsumed: 0,
        totalCostConsumed: 0,
      },
      mostUsedProduct: null,
      lowestStockProduct: null,
      fieldConsumption: {
        highest: null,
        lowest: null,
      },
    };
  }

  private inventoryMovementCsvColumns() {
    return [
      { header: 'Data/Hora', value: (row: InventoryMovementCsvRow) => row.occurredAt },
      { header: 'Tipo', value: (row: InventoryMovementCsvRow) => row.movementType },
      { header: 'Fazenda', value: (row: InventoryMovementCsvRow) => row.farm },
      { header: 'Local', value: (row: InventoryMovementCsvRow) => row.location },
      { header: 'Produto Cod.', value: (row: InventoryMovementCsvRow) => row.productCode },
      { header: 'Produto', value: (row: InventoryMovementCsvRow) => row.productName },
      { header: 'Unidade', value: (row: InventoryMovementCsvRow) => row.unit },
      { header: 'Quantidade', value: (row: InventoryMovementCsvRow) => row.quantity },
      { header: 'Custo Unit.', value: (row: InventoryMovementCsvRow) => row.unitCost },
      { header: 'Custo Total', value: (row: InventoryMovementCsvRow) => row.totalCost },
      { header: 'Tipo Ref.', value: (row: InventoryMovementCsvRow) => row.referenceType },
      { header: 'Ref. ID', value: (row: InventoryMovementCsvRow) => row.referenceId },
      { header: 'Observacoes', value: (row: InventoryMovementCsvRow) => row.notes },
    ] as const;
  }
}

interface InventoryMovementCsvRow {
  occurredAt: Date;
  movementType: string;
  farm: string;
  location: string;
  productCode: string;
  productName: string;
  unit: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  referenceType: string;
  referenceId: string;
  notes: string;
}
