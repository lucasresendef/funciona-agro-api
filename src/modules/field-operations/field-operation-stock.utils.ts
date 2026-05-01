import { AppError } from '../../shared/errors/app-error';

export function calculateQuantityAfterOutboundAndReturn(
  currentQuantity: number,
  quantitySent: number,
  quantityReturned: number,
): number {
  if (currentQuantity < quantitySent) {
    throw new AppError(
      400,
      `Insufficient stock. Available: ${currentQuantity}, required: ${quantitySent}.`,
    );
  }

  return currentQuantity - quantitySent + quantityReturned;
}

export function calculateReturnedDelta(
  previousReturned: number,
  nextReturned: number,
): number {
  return nextReturned - previousReturned;
}

