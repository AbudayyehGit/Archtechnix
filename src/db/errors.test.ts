import test from 'node:test';
import assert from 'node:assert/strict';
import { isSqlConnectionError } from './errors';

test('detects DrizzleQueryError wrapping pg connection timeout', () => {
  const pgTimeout = new Error('Connection terminated due to connection timeout');
  const drizzleErr = Object.assign(
    new Error('Failed query: select count(*)::int from "retainers" where "retainers"."status" = $1'),
    { cause: pgTimeout }
  );
  assert.equal(isSqlConnectionError(drizzleErr), true);
});

test('detects transient node/postgres connection codes', () => {
  assert.equal(isSqlConnectionError(Object.assign(new Error('connect failed'), { code: 'ECONNREFUSED' })), true);
  assert.equal(isSqlConnectionError(Object.assign(new Error('starting up'), { code: '57P03' })), true);
  assert.equal(isSqlConnectionError(Object.assign(new Error('socket reset'), { code: 'ECONNRESET' })), true);
  assert.equal(isSqlConnectionError(Object.assign(new Error('conn failure'), { code: '08006' })), true);
});

test('detects AggregateError containing transient timeout errors', () => {
  const agg = new AggregateError(
    [Object.assign(new Error('connect ETIMEDOUT'), { code: 'ETIMEDOUT' })],
    'All connection attempts failed'
  );
  assert.equal(isSqlConnectionError(agg), true);
});

test('does not classify non-connection constraint or logic errors as connection errors', () => {
  const uniqueViolation = Object.assign(new Error('duplicate key value violates unique constraint'), {
    code: '23505',
  });
  assert.equal(isSqlConnectionError(uniqueViolation), false);
  assert.equal(isSqlConnectionError(new Error('Invalid compliance metric payload')), false);
  assert.equal(isSqlConnectionError(null), false);
});
