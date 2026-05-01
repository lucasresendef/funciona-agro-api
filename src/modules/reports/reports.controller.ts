import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  createInventoryMovementsReportBodySchema,
  reportJobIdParamsSchema,
} from './reports.schemas';
import type { ReportsService } from './reports.service';

export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  createInventoryMovementsCsv = async (request: FastifyRequest, reply: FastifyReply) => {
    const body = createInventoryMovementsReportBodySchema.parse(request.body);
    const data = await this.reportsService.createInventoryMovementsReport(body, request.authUser);
    return reply.status(202).send({ data });
  };

  getJobStatus = async (request: FastifyRequest, reply: FastifyReply) => {
    const { jobId } = reportJobIdParamsSchema.parse(request.params);
    const data = await this.reportsService.getJobStatus(jobId, request.authUser);
    return reply.send({ data });
  };

  downloadJobResult = async (request: FastifyRequest, reply: FastifyReply) => {
    const { jobId } = reportJobIdParamsSchema.parse(request.params);
    const data = await this.reportsService.downloadJobResult(jobId, request.authUser);
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="${data.fileName}"`);
    return reply.send(data.content);
  };
}
