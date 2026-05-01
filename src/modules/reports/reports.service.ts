import { randomUUID } from 'node:crypto';
import { AppError } from '../../shared/errors/app-error';
import type { AuthenticatedUser } from '../auth/auth.types';
import type { FarmAccessService } from '../auth/farm-access.service';
import type { CreateInventoryMovementsReportBody } from './reports.schemas';
import type { ReportsRepository } from './reports.repository';

type ReportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

interface ReportJob {
  id: string;
  type: 'INVENTORY_MOVEMENTS_CSV';
  farmId: string;
  requestedBy: string;
  tenantId: string;
  createdAt: Date;
  completedAt: Date | null;
  status: ReportStatus;
  error: string | null;
  content: string | null;
  fileName: string | null;
}

const MAX_REPORT_RANGE_DAYS = 31;

function escapeCsv(value: unknown): string {
  const text = String(value ?? '');
  return `"${text.replaceAll('"', '""')}"`;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) {
    return 'occurredAt,movementType,farm,location,productCode,productName,unit,quantity,unitCost,totalCost,referenceType,referenceId,notes';
  }

  const headers = Object.keys(rows[0]);
  const lines = rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(','));
  return [headers.join(','), ...lines].join('\n');
}

export class ReportsService {
  private readonly jobs = new Map<string, ReportJob>();

  constructor(
    private readonly reportsRepository: ReportsRepository,
    private readonly farmAccessService: FarmAccessService,
  ) {}

  async createInventoryMovementsReport(
    input: CreateInventoryMovementsReportBody,
    authUser: AuthenticatedUser | null,
  ) {
    await this.farmAccessService.assertUserCanAccessFarm({
      authUser,
      farmId: input.farmId,
    });

    if (!authUser?.sub) {
      throw new AppError(401, 'Authentication required.');
    }

    if (input.to < input.from) {
      throw new AppError(400, '"to" must be greater than or equal to "from".');
    }
    const rangeMs = input.to.getTime() - input.from.getTime();
    const maxRangeMs = MAX_REPORT_RANGE_DAYS * 24 * 60 * 60 * 1000;
    if (rangeMs > maxRangeMs) {
      throw new AppError(400, `"from" and "to" range cannot exceed ${MAX_REPORT_RANGE_DAYS} days.`);
    }

    const jobId = randomUUID();
    const job: ReportJob = {
      id: jobId,
      type: 'INVENTORY_MOVEMENTS_CSV',
      farmId: input.farmId,
      requestedBy: authUser.sub,
      tenantId: authUser.tenantId,
      createdAt: new Date(),
      completedAt: null,
      status: 'PENDING',
      error: null,
      content: null,
      fileName: null,
    };

    this.jobs.set(jobId, job);
    void this.processInventoryMovementsReport(jobId, input, authUser.tenantId);

    return {
      jobId,
      status: job.status,
      createdAt: job.createdAt.toISOString(),
    };
  }

  async getJobStatus(jobId: string, authUser: AuthenticatedUser | null) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new AppError(404, 'Report job not found.');
    }

    await this.farmAccessService.assertUserCanAccessFarm({
      authUser,
      farmId: job.farmId,
    });

    return {
      jobId: job.id,
      type: job.type,
      status: job.status,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString() ?? null,
      error: job.error,
      hasFile: Boolean(job.content),
    };
  }

  async downloadJobResult(jobId: string, authUser: AuthenticatedUser | null) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new AppError(404, 'Report job not found.');
    }

    await this.farmAccessService.assertUserCanAccessFarm({
      authUser,
      farmId: job.farmId,
    });

    if (job.status !== 'COMPLETED' || !job.content || !job.fileName) {
      throw new AppError(409, 'Report is not ready yet.');
    }

    return {
      fileName: job.fileName,
      content: job.content,
    };
  }

  private async processInventoryMovementsReport(
    jobId: string,
    input: CreateInventoryMovementsReportBody,
    tenantId: string,
  ): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return;
    }

    job.status = 'PROCESSING';
    try {
      const movements = await this.reportsRepository.findInventoryMovementsByFarmAndPeriod({
        ...input,
        tenantId,
      });
      const rows = movements.map((movement) => ({
        occurredAt: movement.occurredAt.toISOString(),
        movementType: movement.movementType,
        farm: movement.farm.name,
        location: movement.inventoryLocation.name,
        productCode: movement.product.code,
        productName: movement.product.name,
        unit: movement.product.unitOfMeasure.symbol,
        quantity: Number(movement.quantity),
        unitCost: Number(movement.unitCost),
        totalCost: Number(movement.totalCost),
        referenceType: movement.referenceType ?? '',
        referenceId: movement.referenceId ?? '',
        notes: movement.notes ?? '',
      }));

      job.content = toCsv(rows);
      job.fileName = `inventory-movements-${input.farmId}-${Date.now()}.csv`;
      job.status = 'COMPLETED';
      job.completedAt = new Date();
    } catch (error) {
      job.status = 'FAILED';
      job.completedAt = new Date();
      job.error = error instanceof Error ? error.message : 'Unexpected report processing error.';
    }
  }
}
