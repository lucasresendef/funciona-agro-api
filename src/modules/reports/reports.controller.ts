import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  dashboardMetricsQuerySchema,
  fieldConsumptionReportQuerySchema,
  inventoryMovementsCsvQuerySchema,
} from './reports.schemas';
import type { ReportsService } from './reports.service';

export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  exportInventoryMovementsCsv = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = inventoryMovementsCsvQuerySchema.parse(request.query);
    const data = await this.reportsService.exportInventoryMovementsCsv(query, request.authUser);
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="${data.fileName}"`);
    return reply.send(data.stream);
  };

  getFieldConsumptionReport = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = fieldConsumptionReportQuerySchema.parse(request.query);
    const data = await this.reportsService.getFieldConsumptionReport(query, request.authUser);
    return reply.send({ data });
  };

  getDashboardMetrics = async (request: FastifyRequest, reply: FastifyReply) => {
    const query = dashboardMetricsQuerySchema.parse(request.query);
    const data = await this.reportsService.getDashboardMetrics(query, request.authUser);
    return reply.send({ data });
  };
}
