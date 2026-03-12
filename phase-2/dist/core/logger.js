"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logInfo = logInfo;
exports.logError = logError;
function logInfo(message, meta) {
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
