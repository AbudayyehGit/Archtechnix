const TRANSIENT_SQL_CODES = new Set([
  'ECONNREFUSED',
  'ENOENT',
  'ENOTFOUND',
  'ETIMEDOUT',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EPIPE',
  'EAI_AGAIN',
  '57P01', // admin_shutdown
  '57P02', // crash_shutdown
  '57P03', // cannot_connect_now (database starting up)
  '08000', // connection_exception
  '08001', // sqlclient_unable_to_establish_sqlconnection
  '08003', // connection_does_not_exist
  '08004', // sqlserver_rejected_establishment_of_sqlconnection
  '08006', // connection_failure
]);

const TRANSIENT_SQL_MESSAGE_PATTERNS = [
  'econnrefused',
  'connection terminated',
  'connection timeout',
  'timeout expired',
  'timed out',
  'server closed the connection',
  'cannot connect now',
  'the database system is starting up',
  'client has encountered a connection error',
  'socket hang up',
];

export function isSqlConnectionError(err: unknown): boolean {
  const visited = new Set<unknown>();
  const queue: unknown[] = [err];

  while (queue.length > 0) {
    const cur = queue.shift();
    if (!cur || typeof cur !== 'object' || visited.has(cur)) continue;
    visited.add(cur);

    const record = cur as {
      code?: unknown;
      message?: unknown;
      cause?: unknown;
      errors?: unknown;
    };

    if (typeof record.code === 'string' && TRANSIENT_SQL_CODES.has(record.code)) {
      return true;
    }

    if (typeof record.message === 'string') {
      const lower = record.message.toLowerCase();
      if (TRANSIENT_SQL_MESSAGE_PATTERNS.some((pattern) => lower.includes(pattern))) {
        return true;
      }
    }

    if (record.cause) {
      queue.push(record.cause);
    }

    if (Array.isArray(record.errors)) {
      for (const nested of record.errors) {
        queue.push(nested);
      }
    }
  }

  return false;
}
