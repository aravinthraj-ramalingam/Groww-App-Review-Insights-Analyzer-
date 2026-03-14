import nodemailer from 'nodemailer';
import { config } from '../src/config/env';
import { logInfo } from '../src/core/logger';

const content = `The system produces a **weekly one-page pulse** email with:
- **Top 3 themes**
- **3 real user quotes**
- **3 action ideas**
- **≤250 words**, scannable format
- **No PII** (no usernames/emails/phone numbers/IDs)
`;

async function sendContentEmail(to: string): Promise<void> {
  const transport = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465,
    auth: {
      user: config.smtpUser,
      pass: config.smtpPass
    }
  });

  const htmlContent = content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');

  const info = await transport.sendMail({
    from: `"Groww Review Insights" <${config.smtpFrom}>`,
    to,
    subject: 'Groww App Review Insights – Architecture Overview',
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Groww Review Insights</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 14px; color: #333; max-width: 640px; margin: 0 auto; padding: 24px; }
    h1   { font-size: 20px; color: #00b386; }
    ul   { padding-left: 20px; }
    li   { margin-bottom: 8px; }
  </style>
</head>
<body>
  <h1>Groww App Review Insights Analyzer</h1>
  <p>${htmlContent}</p>
  <hr/>
  <p style="font-size: 11px; color: #888;">Sent from ARCHITECTURE.md (lines 8-13)</p>
</body>
</html>`,
    text: `Groww App Review Insights Analyzer\n\n${content}\n---\nSent from ARCHITECTURE.md (lines 8-13)`
  });

  logInfo('Architecture content email sent', { messageId: info.messageId, to });
  console.log(`✅ Email sent successfully to ${to}`);
}

async function run() {
  try {
    const to = 'aaravinthraj3@gmail.com';
    console.log(`Sending ARCHITECTURE.md content to ${to}...`);
    await sendContentEmail(to);
  } catch (err: any) {
    console.error('❌ Failed to send email:');
    console.error(err.message);
    process.exit(1);
  }
}

run();
