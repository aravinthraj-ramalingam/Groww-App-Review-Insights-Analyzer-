"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const path_1 = __importDefault(require("path"));
const repoRoot = path_1.default.resolve(__dirname, '..', '..', '..');
exports.config = {
    // Phase 2 extends the same SQLite DB created in phase 1 by default.
    databaseFile: process.env.DATABASE_FILE || path_1.default.join(repoRoot, 'phase-1', 'phase1.db'),
    port: Number(process.env.PORT || 4002),
    groqApiKey: process.env.GROQ_API_KEY || '',
    groqModel: process.env.GROQ_MODEL || 'llama-3.1-70b-versatile',
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: Number(process.env.SMTP_PORT || 587),
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',
    smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER || ''
};
