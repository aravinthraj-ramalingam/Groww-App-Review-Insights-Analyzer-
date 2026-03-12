export function logInfo(message: string, meta?: unknown): void {
  if (meta !== undefined) {
    // eslint-disable-next-line no-console
    console.log(`[INFO] ${message}`, meta);
  } else {
    // eslint-disable-next-line no-console
    console.log(`[INFO] ${message}`);
  }
}

export function logError(message: string, meta?: unknown): void {
  if (meta !== undefined) {
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${message}`, meta);
  } else {
    // eslint-disable-next-line no-console
    console.error(`[ERROR] ${message}`);
  }
}

