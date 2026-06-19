import test from 'node:test';
import assert from 'node:assert/strict';
import { ReportsService } from '../../src/modules/reports/reports.service';
import type { CsvExportMode } from '../../src/shared/services/csv.service';

const authUser = {
  sub: 'user-1',
  tenantId: 'tenant-1',
  name: 'User',
  email: 'user@test.com',
  preferredUsername: 'user',
  scope: null,
  realmRoles: [],
  resourceRoles: {},
};

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  let output = '';
  for await (const chunk of stream) {
    output += chunk.toString();
  }
  return output;
}

test('ReportsService exports inventory movements CSV directly with mode=filtered', async () => {
  const service = new ReportsService(
    {
      streamInventoryMovements: async function* (input: { mode: CsvExportMode }) {
        assert.equal(input.mode, 'filtered');
        yield {
          occurredAt: new Date('2026-01-10T10:00:00.000Z'),
          movementType: 'ENTRY',
          farm: 'Farm A',
          location: 'Main Storage',
          productCode: 'PROD-1',
          productName: 'Product 1',
          unit: 'kg',
          quantity: 10,
          unitCost: 2.5,
          totalCost: 25,
          referenceType: 'MANUAL',
          referenceId: 'ref-1',
          notes: 'seed',
        };
      },
    } as never,
    {
      assertUserCanAccessFarm: async () => undefined,
      getAllowedFarmIds: async () => ['farm-1'],
    } as never,
  );

  const result = await service.exportInventoryMovementsCsv(
    {
      farmId: '2f3a5d2f-889a-4acd-9761-9be2be4f9f80',
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-01-31T23:59:59.000Z'),
      mode: 'filtered',
    },
    authUser,
  );

  const content = await streamToString(result.stream);
  assert.equal(result.fileName, 'inventory-movements.csv');
  assert.match(content, /"Tipo"/);
  assert.match(content, /"ENTRY"/);
});

test('ReportsService exports inventory movements CSV with mode=all without date and farm filters', async () => {
  const service = new ReportsService(
    {
      streamInventoryMovements: async function* (input: {
        mode: CsvExportMode;
        from?: Date;
        to?: Date;
        farmId?: string;
      }) {
        assert.equal(input.mode, 'all');
        assert.equal(input.from, undefined);
        assert.equal(input.to, undefined);
        assert.equal(input.farmId, undefined);
        yield {
          occurredAt: new Date('2026-01-10T10:00:00.000Z'),
          movementType: 'ENTRY',
          farm: 'Farm A',
          location: 'Main Storage',
          productCode: 'PROD-1',
          productName: 'Product 1',
          unit: 'kg',
          quantity: 10,
          unitCost: 2.5,
          totalCost: 25,
          referenceType: 'MANUAL',
          referenceId: 'ref-1',
          notes: 'seed',
        };
      },
    } as never,
    {
      assertUserCanAccessFarm: async () => undefined,
      getAllowedFarmIds: async () => ['farm-1'],
    } as never,
  );

  const result = await service.exportInventoryMovementsCsv(
    {
      mode: 'all',
    },
    authUser,
  );

  const content = await streamToString(result.stream);
  assert.equal(result.fileName, 'inventory-movements.csv');
  assert.match(content, /"Tipo"/);
  assert.match(content, /"ENTRY"/);
});

test('ReportsService returns dashboard metrics with date filter', async () => {
  const service = new ReportsService(
    {
      countFinishedOperationsByPeriod: async () => 12,
      aggregateOperationConsumptionByPeriod: async () => ({
        _sum: {
          quantityConsumed: 180.75,
          totalCostConsumed: 9450.2,
        },
      }),
      findMostUsedProductByPeriod: async () => ({
        productId: 'product-1',
        productCode: 'PRD-001',
        productName: 'Ureia',
        unit: 'KG',
        totalQuantityConsumed: 110.123456,
        totalCostConsumed: 5010.998877,
        operationItemCount: 8,
      }),
      findProductWithLowestEstimatedStockByDate: async () => ({
        productId: 'product-2',
        productCode: 'PRD-002',
        productName: 'Glifosato',
        unit: 'LT',
        estimatedStockQuantity: 14.338899,
      }),
      findFieldConsumptionExtremesByPeriod: async () => ({
        highest: {
          fieldId: 'field-1',
          fieldName: 'Talhao A',
          farmId: 'farm-1',
          farmName: 'Fazenda Norte',
          totalAllocatedQuantityConsumed: 78.123456,
          totalAllocatedCostConsumed: 4200.556677,
        },
        lowest: {
          fieldId: 'field-2',
          fieldName: 'Talhao B',
          farmId: 'farm-1',
          farmName: 'Fazenda Norte',
          totalAllocatedQuantityConsumed: 11.123456,
          totalAllocatedCostConsumed: 570.116677,
        },
      }),
    } as never,
    {
      assertUserCanAccessFarm: async () => undefined,
      getAllowedFarmIds: async () => ['farm-1'],
    } as never,
  );

  const data = await service.getDashboardMetrics(
    {
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-01-31T23:59:59.000Z'),
    },
    authUser,
  );

  assert.equal(data.operations.totalFinishedOperations, 12);
  assert.equal(data.operations.totalQuantityConsumed, 180.75);
  assert.equal(data.operations.totalCostConsumed, 9450.2);
  assert.equal(data.mostUsedProduct?.productCode, 'PRD-001');
  assert.equal(data.lowestStockProduct?.productCode, 'PRD-002');
  assert.equal(data.fieldConsumption.highest?.fieldName, 'Talhao A');
  assert.equal(data.fieldConsumption.lowest?.fieldName, 'Talhao B');
});
