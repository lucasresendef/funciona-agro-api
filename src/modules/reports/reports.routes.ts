import type { FastifyInstance } from 'fastify';
import { FarmAccessService } from '../auth/farm-access.service';
import { FarmPermissionRepository } from '../auth/farm-permission.repository';
import { prisma } from '../../shared/database/prisma';
import { ReportsController } from './reports.controller';
import { ReportsRepository } from './reports.repository';
import { ReportsService } from './reports.service';

export async function reportsRoutes(app: FastifyInstance): Promise<void> {
  const reportsRepository = new ReportsRepository(prisma);
  const farmPermissionRepository = new FarmPermissionRepository(prisma);
  const farmAccessService = new FarmAccessService(farmPermissionRepository);
  const reportsService = new ReportsService(reportsRepository, farmAccessService);
  const reportsController = new ReportsController(reportsService);

  app.get('/reports/inventory-movements/csv', reportsController.exportInventoryMovementsCsv);
  app.get('/reports/field-operations/csv', reportsController.exportFieldOperationsCsv);
  app.get('/reports/field-consumption', reportsController.getFieldConsumptionReport);
  app.get('/reports/dashboard-metrics', reportsController.getDashboardMetrics);
}
