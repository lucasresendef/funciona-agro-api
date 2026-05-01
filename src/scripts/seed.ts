import { PrismaClient } from '@prisma/client';
import productsFromPdf from './data/products-from-pdf.json';

const prisma = new PrismaClient();

type ProductSeedItem = {
  name: string;
  unit: string;
};

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
  { farmIndex: 0, name: 'Depósito Norte 2' },
  { farmIndex: 1, name: 'Galpão Sul Central' },
  { farmIndex: 1, name: 'Depósito Sul 2' },
  { farmIndex: 2, name: 'Galpão Leste Central' },
  { farmIndex: 2, name: 'Depósito Leste 2' },
];

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

  const admin = await prisma.appUser.upsert({
    where: {
      tenantId_keycloakUserId: {
        tenantId: tenant.id,
        keycloakUserId: 'keycloak-admin-demo',
      },
    },
    update: {
      name: 'Lucas Resende',
      email: 'lucas@funcionagro.com.br',
      isAdmin: true,
      active: true,
      updatedBy: 'seed',
      updatedByEmail: 'seed@local',
    },
    create: {
      tenantId: tenant.id,
      keycloakUserId: 'keycloak-admin-demo',
      name: 'Lucas Resende',
      email: 'lucas@funcionagro.com.br',
      isAdmin: true,
      active: true,
      createdBy: 'seed',
      createdByEmail: 'seed@local',
      updatedBy: 'seed',
      updatedByEmail: 'seed@local',
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
        updatedBy: admin.keycloakUserId,
        updatedByEmail: admin.email,
      },
      create: {
        id: farmSeed.id,
        tenantId: tenant.id,
        name: farmSeed.name,
        description: `Unidade produtiva ${farmSeed.name}`,
        active: true,
        createdBy: admin.keycloakUserId,
        createdByEmail: admin.email,
        updatedBy: admin.keycloakUserId,
        updatedByEmail: admin.email,
      },
    });
    farms.push(farm);

    await prisma.farmUserPermission.upsert({
      where: {
        tenantId_farmId_keycloakUserId: {
          tenantId: tenant.id,
          farmId: farm.id,
          keycloakUserId: admin.keycloakUserId,
        },
      },
      update: {
        role: 'OWNER',
        active: true,
        updatedBy: admin.keycloakUserId,
        updatedByEmail: admin.email,
      },
      create: {
        tenantId: tenant.id,
        farmId: farm.id,
        keycloakUserId: admin.keycloakUserId,
        userName: admin.name,
        userEmail: admin.email,
        role: 'OWNER',
        active: true,
        createdBy: admin.keycloakUserId,
        createdByEmail: admin.email,
        updatedBy: admin.keycloakUserId,
        updatedByEmail: admin.email,
      },
    });
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
          updatedBy: admin.keycloakUserId,
          updatedByEmail: admin.email,
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
          createdBy: admin.keycloakUserId,
          createdByEmail: admin.email,
          updatedBy: admin.keycloakUserId,
          updatedByEmail: admin.email,
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
        updatedBy: admin.keycloakUserId,
        updatedByEmail: admin.email,
      },
      create: {
        farmId: farm.id,
        name: locationSeed.name,
        description: `Armazém ${locationSeed.name}`,
        active: true,
        createdBy: admin.keycloakUserId,
        createdByEmail: admin.email,
        updatedBy: admin.keycloakUserId,
        updatedByEmail: admin.email,
      },
    });
    locations.push(location);
  }

  const unitIdsBySymbol = new Map<string, string>();
  const unitNameBySymbol: Record<string, string> = {
    LT: 'Litro',
    KG: 'Quilograma',
    SC: 'Saco',
    DS: 'Dose',
    UN: 'Unidade',
  };

  for (const productSeed of productsFromPdf as ProductSeedItem[]) {
    if (!unitIdsBySymbol.has(productSeed.unit)) {
      const unit = await prisma.unitOfMeasure.upsert({
        where: { symbol: productSeed.unit },
        update: {
          name: unitNameBySymbol[productSeed.unit] ?? productSeed.unit,
          active: true,
          updatedBy: admin.keycloakUserId,
          updatedByEmail: admin.email,
        },
        create: {
          name: unitNameBySymbol[productSeed.unit] ?? productSeed.unit,
          symbol: productSeed.unit,
          active: true,
          createdBy: admin.keycloakUserId,
          createdByEmail: admin.email,
          updatedBy: admin.keycloakUserId,
          updatedByEmail: admin.email,
        },
      });
      unitIdsBySymbol.set(productSeed.unit, unit.id);
    }
  }

  const createdProducts = [];
  const catalog = productsFromPdf as ProductSeedItem[];
  for (let index = 0; index < catalog.length; index += 1) {
    const item = catalog[index];
    const product = await prisma.product.upsert({
      where: { code: toProductCode(index) },
      update: {
        name: item.name,
        category: toCategory(item.name),
        unitOfMeasureId: unitIdsBySymbol.get(item.unit)!,
        active: true,
        updatedBy: admin.keycloakUserId,
        updatedByEmail: admin.email,
      },
      create: {
        name: item.name,
        code: toProductCode(index),
        category: toCategory(item.name),
        unitOfMeasureId: unitIdsBySymbol.get(item.unit)!,
        active: true,
        createdBy: admin.keycloakUserId,
        createdByEmail: admin.email,
        updatedBy: admin.keycloakUserId,
        updatedByEmail: admin.email,
      },
    });
    createdProducts.push(product);
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
        updatedBy: admin.keycloakUserId,
        updatedByEmail: admin.email,
      },
      create: {
        farmId: location.farmId,
        inventoryLocationId: location.id,
        productId: product.id,
        quantity,
        averageUnitCost,
        active: true,
        createdBy: admin.keycloakUserId,
        createdByEmail: admin.email,
        updatedBy: admin.keycloakUserId,
        updatedByEmail: admin.email,
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
        createdBy: admin.keycloakUserId,
        createdByEmail: admin.email,
        updatedBy: admin.keycloakUserId,
        updatedByEmail: admin.email,
      },
    });
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
