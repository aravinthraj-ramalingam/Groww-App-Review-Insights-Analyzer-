"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logInfo = logInfo;
exports.logError = logError;
function logInfo(message, meta) {
    // Simple console logger for phase 1
    // In later phases this can be replaced with a structured logger.
    if (meta !== undefined) {
        // eslint-disable-next-line no-console
        console.log(`[INFO] ${message}`, meta);
    }
    else {
        // eslint-disable-next-line no-console
        console.log(`[INFO] ${message}`);
    }
}
function logError(message, meta) {
    if (meta !== undefined) {
        // eslint-disable-next-line no-console
        console.error(`[ERROR] ${message}`, meta);
    }
    else {
        // eslint-disable-next-line no-console
        console.error(`[ERROR] ${message}`);
    }
}
