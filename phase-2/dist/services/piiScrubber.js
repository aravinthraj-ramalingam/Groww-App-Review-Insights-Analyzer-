"use strict";
/**
 * Regex-based PII scrubber.
 * Redacts emails, phone numbers (Indian 10-digit, international), and URLs.
 * Used as a final pass before storing or sending any user-facing text.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.scrubPii = scrubPii;
const PATTERNS = [
    // Email addresses
    /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
    // Indian mobile numbers (6–9 start, 10 digits)
    /\b[6-9]\d{9}\b/g,
    // Generic international phone (10–13 digits, optional country code)
    /(\+?\d{1,3}[\s\-]?)?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4,6}/g,
    // URLs
    /https?:\/\/[^\s"'>]+/g,
    // @handles
    /@[A-Za-z0-9_]+/g
];
const REDACT = '[redacted]';
function scrubPii(text) {
    let result = text;
    for (const pattern of PATTERNS) {
        result = result.replace(pattern, REDACT);
    }
    return result;
}
