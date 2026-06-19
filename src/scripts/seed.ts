import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../shared/config/env';
import { PrismaClient } from '../shared/database/prisma-client';
import productsFromPdf from './data/products-from-pdf.json';

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

const auditActor = { id: 'seed', email: 'seed@local' };

type ProductSeedItem = {
  name: string;
  unit: string;
};

type AllowedUnitSymbol = 'LT' | 'KG';

const FARMS = [
  { id: 'b1d2083a-83b8-40cb-b32e-82f0b7cb7f0a', name: 'Fazenda Funciona Norte' },
  { id: 'fa067f95-ed8d-40f0-8b1e-c13e0f3e53e1', name: 'Fazenda Funciona Sul' },
  { id: 'd5d5d148-f4dc-4fcb-9d52-95fd0d1608dd', name: 'Fazenda Funciona Leste' },
];

const FIELDS = [
  { farmIndex: 0, name: 'Talhão N1', areaHectares: 120.5 },
  { farmIndex: 0, name: 'Talhão N2', areaHectares: 98.2 },
  { farmIndex: 1, name: 'Talhão S1', areaHectares: 134.7 },
  { farmIndex: 1, name: 'Talhão S2', areaHectares: 87.9 },
  { farmIndex: 2, name: 'Talhão L1', areaHectares: 111.4 },
  { farmIndex: 2, name: 'Talhão L2', areaHectares: 92.6 },
];

const LOCATIONS = [
  { farmIndex: 0, name: 'Galpão Norte Central' },
  { farmIndex: 1, name: 'Galpão Sul Central' },
  { farmIndex: 2, name: 'Galpão Leste Central' },
];

const ALLOWED_UNIT_SYMBOLS: AllowedUnitSymbol[] = ['LT', 'KG'];
const ALLOWED_UNIT_NAME_BY_SYMBOL: Record<AllowedUnitSymbol, string> = {
  LT: 'Litro',
  KG: 'Quilograma',
};

function toProductCode(index: number): string {
  return `PRD-${String(index + 1).padStart(4, '0')}`;
}

function toCategory(name: string): string {
  const upper = name.toUpperCase();
  if (upper.includes('FUNG')) {
    return 'FUNGICIDE';
  }
  if (upper.includes('HERB')) {
    return 'HERBICIDE';
  }
  if (upper.includes('INSET')) {
    return 'INSECTICIDE';
  }
  if (upper.includes('FOLIAR') || upper.includes('FERT')) {
    return 'FERTILIZER';
  }
  return 'INPUT';
}

function calcQuantity(index: number): number {
  return Number((80 + ((index * 17) % 420)).toFixed(3));
}

function calcAverageUnitCost(index: number): number {
  return Number((8 + ((index * 11) % 260) / 3.7).toFixed(3));
}

function roundToPrecision(value: number): number {
  return Number(value.toFixed(6));
}

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { key: 'funcionagro' },
    update: {
      name: 'funcionagro',
      active: true,
    },
    create: {
      key: 'funcionagro',
      name: 'funcionagro',
      active: true,
    },
  });

  const farms = [];
  for (const farmSeed of FARMS) {
    const farm = await prisma.farm.upsert({
      where: { id: farmSeed.id },
      update: {
        tenantId: tenant.id,
        name: farmSeed.name,
        active: true,
        updatedBy: auditActor.id,
        updatedByEmail: auditActor.email,
      },
      create: {
        id: farmSeed.id,
        tenantId: tenant.id,
        name: farmSeed.name,
        description: `Unidade produtiva ${farmSeed.name}`,
        active: true,
        createdBy: auditActor.id,
        createdByEmail: auditActor.email,
        updatedBy: auditActor.id,
        updatedByEmail: auditActor.email,
      },
    });
    farms.push(farm);
  }

  for (const fieldSeed of FIELDS) {
    const farm = farms[fieldSeed.farmIndex];
    const existingField = await prisma.field.findFirst({
      where: {
        farmId: farm.id,
        name: fieldSeed.name,
      },
    });

    if (existingField) {
      await prisma.field.update({
        where: { id: existingField.id },
        data: {
          areaHectares: fieldSeed.areaHectares,
          active: true,
          updatedBy: auditActor.id,
          updatedByEmail: auditActor.email,
        },
      });
    } else {
      await prisma.field.create({
        data: {
          farmId: farm.id,
          name: fieldSeed.name,
          areaHectares: fieldSeed.areaHectares,
          description: `Área de produção ${fieldSeed.name}`,
          active: true,
          createdBy: auditActor.id,
          createdByEmail: auditActor.email,
          updatedBy: auditActor.id,
          updatedByEmail: auditActor.email,
        },
      });
    }
  }

  const locations = [];
  for (const locationSeed of LOCATIONS) {
    const farm = farms[locationSeed.farmIndex];
    const location = await prisma.inventoryLocation.upsert({
      where: {
        farmId_name: {
          farmId: farm.id,
          name: locationSeed.name,
        },
      },
      update: {
        active: true,
        updatedBy: auditActor.id,
        updatedByEmail: auditActor.email,
      },
      create: {
        farmId: farm.id,
        name: locationSeed.name,
        description: `Armazém ${locationSeed.name}`,
        active: true,
        createdBy: auditActor.id,
        createdByEmail: auditActor.email,
        updatedBy: auditActor.id,
        updatedByEmail: auditActor.email,
      },
    });
    locations.push(location);
  }

  const unitIdsBySymbol = new Map<string, string>();

  for (const unitSymbol of ALLOWED_UNIT_SYMBOLS) {
    const unit = await prisma.unitOfMeasure.upsert({
      where: { symbol: unitSymbol },
      update: {
        name: ALLOWED_UNIT_NAME_BY_SYMBOL[unitSymbol],
        active: true,
        updatedBy: auditActor.id,
        updatedByEmail: auditActor.email,
      },
      create: {
        name: ALLOWED_UNIT_NAME_BY_SYMBOL[unitSymbol],
        symbol: unitSymbol,
        active: true,
        createdBy: auditActor.id,
        createdByEmail: auditActor.email,
        updatedBy: auditActor.id,
        updatedByEmail: auditActor.email,
      },
    });
    unitIdsBySymbol.set(unitSymbol, unit.id);
  }

  await prisma.unitOfMeasure.updateMany({
    where: {
      createdBy: auditActor.id,
      symbol: {
        notIn: ALLOWED_UNIT_SYMBOLS,
      },
    },
    data: {
      active: false,
      updatedBy: auditActor.id,
      updatedByEmail: auditActor.email,
    },
  });

  const catalog = (productsFromPdf as ProductSeedItem[]).map((item, index) => ({
    ...item,
    code: toProductCode(index),
  }));
  const desiredProducts = catalog.filter(
    (item): item is ProductSeedItem & { code: string; unit: AllowedUnitSymbol } =>
      item.unit === 'LT' || item.unit === 'KG',
  );

  const createdProducts = [];
  for (const item of desiredProducts) {
    const existingProduct = await prisma.product.findFirst({
      where: {
        tenantId: tenant.id,
        code: item.code,
      },
    });

    const product = existingProduct
      ? await prisma.product.update({
          where: { id: existingProduct.id },
          data: {
            name: item.name,
            category: toCategory(item.name),
            unitOfMeasureId: unitIdsBySymbol.get(item.unit)!,
            active: true,
            updatedBy: auditActor.id,
            updatedByEmail: auditActor.email,
          },
        })
      : await prisma.product.create({
          data: {
            tenantId: tenant.id,
            name: item.name,
            code: item.code,
            category: toCategory(item.name),
            unitOfMeasureId: unitIdsBySymbol.get(item.unit)!,
            active: true,
            createdBy: auditActor.id,
            createdByEmail: auditActor.email,
            updatedBy: auditActor.id,
            updatedByEmail: auditActor.email,
          },
        });
    createdProducts.push(product);
  }

  const desiredProductCodes = new Set(desiredProducts.map((item) => item.code));
  const legacyProducts = await prisma.product.findMany({
    where: {
      tenantId: tenant.id,
      createdBy: auditActor.id,
      code: {
        startsWith: 'PRD-',
        notIn: [...desiredProductCodes],
      },
    },
    select: {
      id: true,
    },
  });

  const legacyLocations = await prisma.inventoryLocation.findMany({
    where: {
      farm: {
        tenantId: tenant.id,
      },
      createdBy: auditActor.id,
      name: {
        notIn: LOCATIONS.map((location) => location.name),
      },
    },
    select: {
      id: true,
    },
  });

  const legacyProductIds = legacyProducts.map((product) => product.id);
  const legacyLocationIds = legacyLocations.map((location) => location.id);

  if (legacyProductIds.length > 0) {
    await prisma.product.updateMany({
      where: {
        id: {
          in: legacyProductIds,
        },
      },
      data: {
        active: false,
        updatedBy: auditActor.id,
        updatedByEmail: auditActor.email,
      },
    });
  }

  if (legacyLocationIds.length > 0) {
    await prisma.inventoryLocation.updateMany({
      where: {
        id: {
          in: legacyLocationIds,
        },
      },
      data: {
        active: false,
        updatedBy: auditActor.id,
        updatedByEmail: auditActor.email,
      },
    });
  }

  if (legacyProductIds.length > 0 || legacyLocationIds.length > 0) {
    const inventoryBalanceWhere = {
      createdBy: auditActor.id,
      OR: [
        ...(legacyProductIds.length > 0
          ? [
              {
                productId: {
                  in: legacyProductIds,
                },
              },
            ]
          : []),
        ...(legacyLocationIds.length > 0
          ? [
              {
                inventoryLocationId: {
                  in: legacyLocationIds,
                },
              },
            ]
          : []),
      ],
    };

    await prisma.inventoryBalance.updateMany({
      where: inventoryBalanceWhere,
      data: {
        active: false,
        updatedBy: auditActor.id,
        updatedByEmail: auditActor.email,
      },
    });

    await prisma.inventoryMovement.updateMany({
      where: inventoryBalanceWhere,
      data: {
        active: false,
        updatedBy: auditActor.id,
        updatedByEmail: auditActor.email,
      },
    });
  }

  for (let index = 0; index < createdProducts.length; index += 1) {
    const product = createdProducts[index];
    const location = locations[index % locations.length];
    const quantity = calcQuantity(index);
    const averageUnitCost = calcAverageUnitCost(index);

    await prisma.inventoryBalance.upsert({
      where: {
        inventoryLocationId_productId: {
          inventoryLocationId: location.id,
          productId: product.id,
        },
      },
      update: {
        farmId: location.farmId,
        quantity,
        averageUnitCost,
        active: true,
        updatedBy: auditActor.id,
        updatedByEmail: auditActor.email,
      },
      create: {
        farmId: location.farmId,
        inventoryLocationId: location.id,
        productId: product.id,
        quantity,
        averageUnitCost,
        active: true,
        createdBy: auditActor.id,
        createdByEmail: auditActor.email,
        updatedBy: auditActor.id,
        updatedByEmail: auditActor.email,
      },
    });

    await prisma.inventoryMovement.create({
      data: {
        farmId: location.farmId,
        inventoryLocationId: location.id,
        productId: product.id,
        movementType: 'ENTRY',
        quantity,
        unitCost: averageUnitCost,
        totalCost: Number((quantity * averageUnitCost).toFixed(3)),
        occurredAt: new Date(),
        referenceType: 'SEED',
        referenceId: product.id,
        notes: 'Carga inicial do catálogo de produtos',
        active: true,
        createdBy: auditActor.id,
        createdByEmail: auditActor.email,
        updatedBy: auditActor.id,
        updatedByEmail: auditActor.email,
      },
    });
  }

  const farmNorth = farms[0];
  const northFields = await prisma.field.findMany({
    where: {
      farmId: farmNorth.id,
      active: true,
    },
    orderBy: {
      name: 'asc',
    },
    take: 2,
  });
  const northLocation = locations.find((location) => location.farmId === farmNorth.id);

  if (northFields.length >= 2 && northLocation && createdProducts.length >= 2) {
    const seedOperation = await prisma.fieldOperation.create({
      data: {
        farmId: farmNorth.id,
        inventoryLocationId: northLocation.id,
        operationDate: new Date(),
        status: 'FINISHED',
        description: 'Operação seed multi-talhão',
        startedAt: new Date(),
        finishedAt: new Date(),
        active: true,
        createdBy: auditActor.id,
        createdByEmail: auditActor.email,
        updatedBy: auditActor.id,
        updatedByEmail: auditActor.email,
        fields: {
          create: northFields.map((field) => ({
            fieldId: field.id,
            areaHectaresSnapshot: Number(field.areaHectares),
            active: true,
            createdBy: auditActor.id,
            createdByEmail: auditActor.email,
            updatedBy: auditActor.id,
            updatedByEmail: auditActor.email,
          })),
        },
        items: {
          create: [
            {
              productId: createdProducts[0].id,
              quantitySent: 20,
              quantityReturned: 0,
              quantityConsumed: 20,
              unitCostAtOperation: 10,
              totalCostConsumed: 200,
              active: true,
              createdBy: auditActor.id,
              createdByEmail: auditActor.email,
              updatedBy: auditActor.id,
              updatedByEmail: auditActor.email,
            },
            {
              productId: createdProducts[1].id,
              quantitySent: 10,
              quantityReturned: 1,
              quantityConsumed: 9,
              unitCostAtOperation: 8,
              totalCostConsumed: 72,
              active: true,
              createdBy: auditActor.id,
              createdByEmail: auditActor.email,
              updatedBy: auditActor.id,
              updatedByEmail: auditActor.email,
            },
          ],
        },
      },
      include: {
        fields: true,
        items: true,
      },
    });

    const totalArea = seedOperation.fields.reduce(
      (acc, entry) => acc + Number(entry.areaHectaresSnapshot),
      0,
    );

    for (const item of seedOperation.items) {
      let allocatedQtyRunning = 0;
      let allocatedCostRunning = 0;

      for (let index = 0; index < seedOperation.fields.length; index += 1) {
        const fieldLink = seedOperation.fields[index];
        const isLast = index === seedOperation.fields.length - 1;
        const fieldArea = Number(fieldLink.areaHectaresSnapshot);
        const itemConsumed = Number(item.quantityConsumed);
        const itemCost = Number(item.totalCostConsumed);

        const quantityAllocated = isLast
          ? roundToPrecision(itemConsumed - allocatedQtyRunning)
          : roundToPrecision((itemConsumed * fieldArea) / totalArea);

        const costAllocated = isLast
          ? roundToPrecision(itemCost - allocatedCostRunning)
          : roundToPrecision((itemCost * fieldArea) / totalArea);

        allocatedQtyRunning += quantityAllocated;
        allocatedCostRunning += costAllocated;

        await prisma.fieldOperationItemFieldResult.create({
          data: {
            fieldOperationItemId: item.id,
            fieldId: fieldLink.fieldId,
            allocatedQuantityConsumed: quantityAllocated,
            allocatedTotalCostConsumed: costAllocated,
            active: true,
            createdBy: auditActor.id,
            createdByEmail: auditActor.email,
            updatedBy: auditActor.id,
            updatedByEmail: auditActor.email,
          },
        });
      }
    }
  }

  console.log(
    `Seed concluída: tenant=${tenant.name}, farms=${farms.length}, fields=${FIELDS.length}, locations=${locations.length}, products=${createdProducts.length}.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
