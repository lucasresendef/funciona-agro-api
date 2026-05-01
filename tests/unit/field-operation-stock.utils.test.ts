import test from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../../src/shared/errors/app-error';
import {
  calculateQuantityAfterOutboundAndReturn,
  calculateReturnedDelta,
} from '../../src/modules/field-operations/field-operation-stock.utils';

test('calculateQuantityAfterOutboundAndReturn consumes and returns stock in the same operation', () => {
  const quantity = calculateQuantityAfterOutboundAndReturn(100, 30, 5);

  assert.equal(quantity, 75);
});

test('calculateQuantityAfterOutboundAndReturn throws when outbound exceeds current stock', () => {
  assert.throws(
    () => calculateQuantityAfterOutboundAndReturn(10, 20, 0),
    (error: unknown) => error instanceof AppError && error.statusCode === 400,
  );
});

test('calculateReturnedDelta computes positive and negative return adjustments', () => {
  assert.equal(calculateReturnedDelta(2, 5), 3);
  assert.equal(calculateReturnedDelta(5, 2), -3);
});

