import test from 'node:test';
import assert from 'node:assert/strict';
import { ProductsService } from '../../src/modules/products/products.service';

test('ProductsService.list returns stockByLocation and totalStockQuantity for each product', async () => {
  const productsRepository = {
    findMany: async () => ({
      data: [
        {
          id: 'product-1',
          name: 'Produto A',
          code: 'PROD-A',
          category: 'FERTILIZER',
          description: null,
          activeIngredient: null,
          unitOfMeasureId: 'unit-1',
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: null,
          createdByEmail: null,
          updatedBy: null,
          updatedByEmail: null,
          unitOfMeasure: {
            id: 'unit-1',
            name: 'Quilograma',
            symbol: 'kg',
            active: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: null,
            createdByEmail: null,
            updatedBy: null,
            updatedByEmail: null,
          },
          inventoryBalances: [
            {
              inventoryLocationId: 'loc-1',
              quantity: 10,
              averageUnitCost: 2.5,
              inventoryLocation: {
                id: 'loc-1',
                name: 'Galpao 1',
                farmId: 'farm-1',
                farm: {
                  id: 'farm-1',
                  name: 'Fazenda A',
                },
              },
            },
            {
              inventoryLocationId: 'loc-2',
              quantity: 7,
              averageUnitCost: 2.75,
              inventoryLocation: {
                id: 'loc-2',
                name: 'Galpao 2',
                farmId: 'farm-1',
                farm: {
                  id: 'farm-1',
                  name: 'Fazenda A',
                },
              },
            },
          ],
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    }),
  };

  const unitsRepository = {} as never;
  const inventoryLocationRepository = {} as never;
  const farmAccessService = {
    getAllowedFarmIds: async () => null,
  } as never;
  const service = new ProductsService(
    productsRepository as never,
    unitsRepository,
    inventoryLocationRepository,
    farmAccessService,
  );

  const authUser = {
    sub: 'admin-1',
    tenantId: 'tenant-1',
    name: 'Admin',
    email: 'admin@test.com',
    preferredUsername: 'admin',
    scope: null,
    realmRoles: ['app-admin'],
    resourceRoles: {},
  };
  const result = await service.list({ page: 1, limit: 10 }, authUser);
  assert.equal(result.data.length, 1);
  assert.equal(result.data[0].stockByLocation.length, 2);
  assert.equal(result.data[0].totalStockQuantity, 17);
  assert.equal(result.data[0].stockByLocation[0].inventoryLocationName, 'Galpao 1');
  assert.equal(result.pagination.total, 1);
});
