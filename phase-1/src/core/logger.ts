export function logInfo(message: string, meta?: unknown): void {
  // Simple console logger for phase 1
  // In later phases this can be replaced with a structured logger.
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

