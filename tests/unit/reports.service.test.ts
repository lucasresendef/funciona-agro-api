import test from 'node:test';
import assert from 'node:assert/strict';
import { ReportsService } from '../../src/modules/reports/reports.service';

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

test('ReportsService creates CSV job and allows download when completed', async () => {
  const service = new ReportsService(
    {
      findInventoryMovementsByFarmAndPeriod: async () => [
        {
          occurredAt: new Date('2026-01-10T10:00:00.000Z'),
          movementType: 'ENTRY',
          quantity: 10,
          unitCost: 2.5,
          totalCost: 25,
          referenceType: 'MANUAL',
          referenceId: 'ref-1',
          notes: 'seed',
          farm: { name: 'Farm A' },
          inventoryLocation: { name: 'Main Storage' },
          product: {
            code: 'PROD-1',
            name: 'Product 1',
            unitOfMeasure: { symbol: 'kg' },
          },
        },
      ],
    } as never,
    {
      assertUserCanAccessFarm: async () => undefined,
    } as never,
  );

  const job = await service.createInventoryMovementsReport(
    {
      farmId: '2f3a5d2f-889a-4acd-9761-9be2be4f9f80',
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-01-31T23:59:59.000Z'),
    },
    authUser,
  );

  let status = await service.getJobStatus(job.jobId, authUser);
  for (let i = 0; i < 5 && status.status !== 'COMPLETED'; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    status = await service.getJobStatus(job.jobId, authUser);
  }

  assert.equal(status.status, 'COMPLETED');

  const file = await service.downloadJobResult(job.jobId, authUser);
  assert.match(file.fileName, /inventory-movements/);
  assert.match(file.content, /movementType/);
  assert.match(file.content, /ENTRY/);
});
