"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildEmailHtml = buildEmailHtml;
exports.buildEmailText = buildEmailText;
exports.sendPulseEmail = sendPulseEmail;
exports.sendTestEmail = sendTestEmail;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../config/env");
const piiScrubber_1 = require("./piiScrubber");
const logger_1 = require("../core/logger");
// ── Email body builders ───────────────────────────────────────────────────────
function buildEmailHtml(pulse) {
    const themes = pulse.top_themes
        .map((t) => `<li><strong>${t.name}</strong> – ${t.description} <em>(${t.review_count} mentions, avg ${t.avg_rating}★)</em></li>`)
        .join('\n');
    const quotes = pulse.user_quotes
        .map((q) => `<li>"${q.text}" <span style="color:#888">(${q.rating}★)</span></li>`)
        .join('\n');
    const actions = pulse.action_ideas
        .map((a) => `<li>${a.idea}</li>`)
        .join('\n');
    const noteHtml = pulse.note_body.replace(/\n/g, '<br/>');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Groww Weekly Reviews Pulse</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 14px; color: #333; max-width: 640px; margin: 0 auto; padding: 24px; }
    h1   { font-size: 20px; color: #00b386; }
    h2   { font-size: 16px; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; margin-top: 24px; }
    ul   { padding-left: 20px; }
    li   { margin-bottom: 8px; }
    .note { background: #f8f8f8; border-left: 4px solid #00b386; padding: 12px 16px; line-height: 1.6; }
    .footer { font-size: 11px; color: #aaa; margin-top: 32px; }
  </style>
</head>
<body>
  <h1>Groww Weekly Reviews Pulse – Week of ${pulse.week_start}</h1>

  <h2>This Week's Top ${pulse.top_themes.length} Themes</h2>
  <ul>${themes}</ul>

  <h2>User Quotes</h2>
  <ul>${quotes}</ul>

  <h2>Recommended Actions</h2>
  <ul>${actions}</ul>

  <h2>Weekly Note</h2>
  <div class="note">${noteHtml}</div>

  <div class="footer">
    This is an internal pulse report generated from public Groww Play Store reviews. No PII is included.
  </div>
</body>
</html>`;
}
function buildEmailText(pulse) {
    const themes = pulse.top_themes
        .map((t) => `• ${t.name}: ${t.description} (${t.review_count} mentions, ${t.avg_rating}★)`)
        .join('\n');
    const quotes = pulse.user_quotes
        .map((q, i) => `${i + 1}. "${q.text}" (${q.rating}★)`)
        .join('\n');
    const actions = pulse.action_ideas
        .map((a, i) => `${i + 1}. ${a.idea}`)
        .join('\n');
    return [
        `GROWW WEEKLY REVIEWS PULSE – Week of ${pulse.week_start}`,
        '',
        '=== TOP THEMES ===',
        themes,
        '',
        '=== USER QUOTES ===',
        quotes,
        '',
        '=== RECOMMENDED ACTIONS ===',
        actions,
        '',
        '=== WEEKLY NOTE ===',
        pulse.note_body,
        '',
        '---',
        'Internal pulse. Public reviews only. No PII.'
    ].join('\n');
}
// ── Sender ────────────────────────────────────────────────────────────────────
function createTransport() {
    if (!env_1.config.smtpHost || !env_1.config.smtpUser || !env_1.config.smtpPass) {
        throw new Error('SMTP credentials not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS.');
    }
    return nodemailer_1.default.createTransport({
        host: env_1.config.smtpHost,
        port: env_1.config.smtpPort,
        secure: env_1.config.smtpPort === 465,
        auth: {
            user: env_1.config.smtpUser,
            pass: env_1.config.smtpPass
        }
    });
}
async function sendPulseEmail(to, pulse) {
    const htmlBody = (0, piiScrubber_1.scrubPii)(buildEmailHtml(pulse));
    const textBody = (0, piiScrubber_1.scrubPii)(buildEmailText(pulse));
    const transport = createTransport();
    const info = await transport.sendMail({
        from: `"Groww Review Insights" <${env_1.config.smtpFrom}>`,
        to,
        subject: `Groww Weekly Reviews Pulse – Week of ${pulse.week_start}`,
        html: htmlBody,
        text: textBody
    });
    (0, logger_1.logInfo)('Pulse email sent', { messageId: info.messageId, to, pulseId: pulse.id });
}
/** Send test email to verify SMTP config. */
async function sendTestEmail(to) {
    const transport = createTransport();
    await transport.sendMail({
        from: `"Groww Review Insights" <${env_1.config.smtpFrom}>`,
        to,
        subject: 'Groww Insights – SMTP Test',
        text: 'SMTP connection is working correctly.'
    });
    (0, logger_1.logInfo)('Test email sent', { to });
}
