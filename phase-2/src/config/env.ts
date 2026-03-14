import path from 'path';
import * as dotenv from 'dotenv';

const repoRoot = path.resolve(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(repoRoot, 'phase-2', '.env') });

export const config = {
  // Phase 2 extends the same SQLite DB created in phase 1 by default.
  databaseFile:
    process.env.DATABASE_FILE || path.join(repoRoot, 'phase-1', 'phase1.db'),
  port: Number(process.env.PORT || 4002),

  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'llama-3.1-70b-versatile',

  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER || ''
};

