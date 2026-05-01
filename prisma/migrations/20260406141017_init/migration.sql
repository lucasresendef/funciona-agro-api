-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('ENTRY', 'OUTBOUND_TO_FIELD', 'RETURN_FROM_FIELD', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT');

-- CreateEnum
CREATE TYPE "FieldOperationStatus" AS ENUM ('OPEN', 'FINISHED', 'CANCELED');

-- CreateEnum
CREATE TYPE "FarmUserRole" AS ENUM ('OWNER', 'MANAGER', 'OPERATOR', 'VIEWER');

-- CreateTable
CREATE TABLE "tenant" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_user" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "keycloak_user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "created_by_email" TEXT,
    "updated_by" TEXT,
    "updated_by_email" TEXT,

    CONSTRAINT "app_user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farm" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "created_by_email" TEXT,
    "updated_by" TEXT,
    "updated_by_email" TEXT,

    CONSTRAINT "farm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field" (
    "id" UUID NOT NULL,
    "farm_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "area_hectares" DECIMAL(14,4) NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "created_by_email" TEXT,
    "updated_by" TEXT,
    "updated_by_email" TEXT,

    CONSTRAINT "field_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unit_of_measure" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "created_by_email" TEXT,
    "updated_by" TEXT,
    "updated_by_email" TEXT,

    CONSTRAINT "unit_of_measure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "active_ingredient" TEXT,
    "unit_of_measure_id" UUID NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "created_by_email" TEXT,
    "updated_by" TEXT,
    "updated_by_email" TEXT,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_location" (
    "id" UUID NOT NULL,
    "farm_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "created_by_email" TEXT,
    "updated_by" TEXT,
    "updated_by_email" TEXT,

    CONSTRAINT "inventory_location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_balance" (
    "id" UUID NOT NULL,
    "farm_id" UUID NOT NULL,
    "inventory_location_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" DECIMAL(18,6) NOT NULL,
    "average_unit_cost" DECIMAL(18,6) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "created_by_email" TEXT,
    "updated_by" TEXT,
    "updated_by_email" TEXT,

    CONSTRAINT "inventory_balance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movement" (
    "id" UUID NOT NULL,
    "farm_id" UUID NOT NULL,
    "inventory_location_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "movement_type" "MovementType" NOT NULL,
    "quantity" DECIMAL(18,6) NOT NULL,
    "unit_cost" DECIMAL(18,6) NOT NULL,
    "total_cost" DECIMAL(18,6) NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "created_by_email" TEXT,
    "updated_by" TEXT,
    "updated_by_email" TEXT,

    CONSTRAINT "inventory_movement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_operation" (
    "id" UUID NOT NULL,
    "farm_id" UUID NOT NULL,
    "field_id" UUID NOT NULL,
    "inventory_location_id" UUID,
    "operation_date" TIMESTAMP(3) NOT NULL,
    "status" "FieldOperationStatus" NOT NULL DEFAULT 'OPEN',
    "description" TEXT,
    "responsible_user_id" UUID,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "created_by_email" TEXT,
    "updated_by" TEXT,
    "updated_by_email" TEXT,

    CONSTRAINT "field_operation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_operation_item" (
    "id" UUID NOT NULL,
    "field_operation_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity_sent" DECIMAL(18,6) NOT NULL,
    "quantity_returned" DECIMAL(18,6) NOT NULL DEFAULT 0,
    "quantity_consumed" DECIMAL(18,6) NOT NULL,
    "unit_cost_at_operation" DECIMAL(18,6) NOT NULL,
    "total_cost_consumed" DECIMAL(18,6) NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "created_by_email" TEXT,
    "updated_by" TEXT,
    "updated_by_email" TEXT,

    CONSTRAINT "field_operation_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farm_user_permission" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "farm_id" UUID NOT NULL,
    "keycloak_user_id" TEXT NOT NULL,
    "user_name" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "role" "FarmUserRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "created_by_email" TEXT,
    "updated_by" TEXT,
    "updated_by_email" TEXT,

    CONSTRAINT "farm_user_permission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_key_key" ON "tenant"("key");

-- CreateIndex
CREATE INDEX "app_user_tenant_id_idx" ON "app_user"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_user_tenant_id_keycloak_user_id_key" ON "app_user"("tenant_id", "keycloak_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_user_tenant_id_email_key" ON "app_user"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "farm_tenant_id_idx" ON "farm"("tenant_id");

-- CreateIndex
CREATE INDEX "field_farm_id_idx" ON "field"("farm_id");

-- CreateIndex
CREATE UNIQUE INDEX "unit_of_measure_symbol_key" ON "unit_of_measure"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "product_code_key" ON "product"("code");

-- CreateIndex
CREATE INDEX "product_unit_of_measure_id_idx" ON "product"("unit_of_measure_id");

-- CreateIndex
CREATE INDEX "inventory_location_farm_id_idx" ON "inventory_location"("farm_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_location_farm_id_name_key" ON "inventory_location"("farm_id", "name");

-- CreateIndex
CREATE INDEX "inventory_balance_farm_id_idx" ON "inventory_balance"("farm_id");

-- CreateIndex
CREATE INDEX "inventory_balance_product_id_idx" ON "inventory_balance"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_balance_inventory_location_id_product_id_key" ON "inventory_balance"("inventory_location_id", "product_id");

-- CreateIndex
CREATE INDEX "inventory_movement_farm_id_occurred_at_idx" ON "inventory_movement"("farm_id", "occurred_at");

-- CreateIndex
CREATE INDEX "inventory_movement_reference_type_reference_id_idx" ON "inventory_movement"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "inventory_movement_product_id_idx" ON "inventory_movement"("product_id");

-- CreateIndex
CREATE INDEX "field_operation_farm_id_operation_date_idx" ON "field_operation"("farm_id", "operation_date");

-- CreateIndex
CREATE INDEX "field_operation_field_id_idx" ON "field_operation"("field_id");

-- CreateIndex
CREATE INDEX "field_operation_inventory_location_id_idx" ON "field_operation"("inventory_location_id");

-- CreateIndex
CREATE INDEX "field_operation_responsible_user_id_idx" ON "field_operation"("responsible_user_id");

-- CreateIndex
CREATE INDEX "field_operation_item_field_operation_id_idx" ON "field_operation_item"("field_operation_id");

-- CreateIndex
CREATE INDEX "field_operation_item_product_id_idx" ON "field_operation_item"("product_id");

-- CreateIndex
CREATE INDEX "farm_user_permission_keycloak_user_id_idx" ON "farm_user_permission"("keycloak_user_id");

-- CreateIndex
CREATE INDEX "farm_user_permission_tenant_id_idx" ON "farm_user_permission"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "farm_user_permission_tenant_id_farm_id_keycloak_user_id_key" ON "farm_user_permission"("tenant_id", "farm_id", "keycloak_user_id");

-- AddForeignKey
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm" ADD CONSTRAINT "farm_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field" ADD CONSTRAINT "field_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product" ADD CONSTRAINT "product_unit_of_measure_id_fkey" FOREIGN KEY ("unit_of_measure_id") REFERENCES "unit_of_measure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_location" ADD CONSTRAINT "inventory_location_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_balance" ADD CONSTRAINT "inventory_balance_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_balance" ADD CONSTRAINT "inventory_balance_inventory_location_id_fkey" FOREIGN KEY ("inventory_location_id") REFERENCES "inventory_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_balance" ADD CONSTRAINT "inventory_balance_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movement" ADD CONSTRAINT "inventory_movement_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movement" ADD CONSTRAINT "inventory_movement_inventory_location_id_fkey" FOREIGN KEY ("inventory_location_id") REFERENCES "inventory_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movement" ADD CONSTRAINT "inventory_movement_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_operation" ADD CONSTRAINT "field_operation_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_operation" ADD CONSTRAINT "field_operation_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "field"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_operation" ADD CONSTRAINT "field_operation_inventory_location_id_fkey" FOREIGN KEY ("inventory_location_id") REFERENCES "inventory_location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_operation" ADD CONSTRAINT "field_operation_responsible_user_id_fkey" FOREIGN KEY ("responsible_user_id") REFERENCES "app_user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_operation_item" ADD CONSTRAINT "field_operation_item_field_operation_id_fkey" FOREIGN KEY ("field_operation_id") REFERENCES "field_operation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_operation_item" ADD CONSTRAINT "field_operation_item_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_user_permission" ADD CONSTRAINT "farm_user_permission_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_user_permission" ADD CONSTRAINT "farm_user_permission_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
