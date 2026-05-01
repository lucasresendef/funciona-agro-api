import { AppError } from '../../shared/errors/app-error';
import type { CreateFieldOperationItemBody } from './field-operations.schemas';

export interface NormalizedFieldOperationItem {
  productId: string;
  quantitySent: number;
  quantityReturned: number;
  quantityConsumed: number;
  unitCostAtOperation: number;
  totalCostConsumed: number;
  notes: string | null;
}

export class FieldOperationCostService {
  normalizeItem(input: CreateFieldOperationItemBody): NormalizedFieldOperationItem {
    const quantityReturned = input.quantityReturned ?? 0;
    const quantityConsumed = input.quantityConsumed ?? input.quantitySent - quantityReturned;

    if (quantityReturned > input.quantitySent) {
      throw new AppError(400, 'Returned quantity cannot be greater than sent quantity.');
    }

    if (quantityConsumed < 0) {
      throw new AppError(400, 'Consumed quantity cannot be negative.');
    }

    if (quantityConsumed > input.quantitySent) {
      throw new AppError(400, 'Consumed quantity cannot be greater than sent quantity.');
    }

    if (quantityConsumed + quantityReturned > input.quantitySent) {
      throw new AppError(
        400,
        'Consumed quantity plus returned quantity cannot exceed sent quantity.',
      );
    }

    return {
      productId: input.productId,
      quantitySent: input.quantitySent,
      quantityReturned,
      quantityConsumed,
      unitCostAtOperation: input.unitCostAtOperation,
      totalCostConsumed: quantityConsumed * input.unitCostAtOperation,
      notes: input.notes ?? null,
    };
  }
}
