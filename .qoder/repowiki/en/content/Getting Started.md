# Getting Started

<cite>
**Referenced Files in This Document**
- [ARCHITECTURE.md](file://ARCHITECTURE.md)
- [phase-1 package.json](file://phase-1/package.json)
- [phase-2 package.json](file://phase-2/package.json)
- [phase-1 env.ts](file://phase-1/src/config/env.ts)
- [phase-2 env.ts](file://phase-2/src/config/env.ts)
- [phase-1 server.ts](file://phase-1/src/api/server.ts)
- [phase-2 server.ts](file://phase-2/src/api/server.ts)
- [phase-1 db index.ts](file://phase-1/src/db/index.ts)
- [phase-2 db index.ts](file://phase-2/src/db/index.ts)
- [phase-1 playstoreScraper.ts](file://phase-1/src/scraper/playstoreScraper.ts)
- [phase-1 filters.ts](file://phase-1/src/scraper/filters.ts)
- [phase-1 dates.ts](file://phase-1/src/utils/dates.ts)
- [phase-2 groqClient.ts](file://phase-2/src/services/groqClient.ts)
- [phase-2 emailService.ts](file://phase-2/src/services/emailService.ts)
- [phase-2 runPulsePipeline.ts](file://phase-2/scripts/runPulsePipeline.ts)
- [phase-2 testEmail.ts](file://phase-2/scripts/testEmail.ts)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Phase-1: Core Scraping, Filtering, and Storage](#phase-1-core-scraping-filtering-and-storage)
5. [Phase-2: Groq Theming, Weekly Pulse, and Email](#phase-2-groq-theming-weekly-pulse-and-email)
6. [First-Time Usage Examples](#first-time-usage-examples)
7. [Common Setup Issues and Troubleshooting](#common-setup-issues-and-troubleshooting)
8. [Conclusion](#conclusion)

## Introduction
This guide helps you install, configure, and run the Groww App Review Insights Analyzer. It covers prerequisites, environment setup, dependency installation, and step-by-step instructions for both Phase-1 and Phase-2. You will learn how to trigger scrapers, generate themes, create weekly pulses, and troubleshoot common issues.

The system consists of:
- Phase-1: Scraping Google Play reviews, applying filters, and storing normalized reviews in SQLite.
- Phase-2: Using Groq to discover themes, assign reviews to themes, generate weekly pulses, and send emails.

**Section sources**
- [ARCHITECTURE.md: 17-83:17-83](file://ARCHITECTURE.md#L17-L83)

## Prerequisites
- Node.js and npm: Install LTS versions of Node.js (18.x or 20.x) and npm from https://nodejs.org/.
- Git: Download and install Git from https://git-scm.com/.
- A terminal or command prompt with read/write access to the repository directory.

**Section sources**
- [phase-1 package.json: 13-24:13-24](file://phase-1/package.json#L13-L24)
- [phase-2 package.json: 13-28:13-28](file://phase-2/package.json#L13-L28)

## Environment Setup
1. Clone the repository (if not already cloned).
2. Open a terminal in the repository root.
3. Install dependencies for both phases:
   - Phase-1: Navigate to the phase-1 directory and run the install script.
   - Phase-2: Navigate to the phase-2 directory and run the install script.

Notes:
- Phase-1 uses better-sqlite3 and google-play-scraper.
- Phase-2 adds groq-sdk, nodemailer, dotenv, and zod.

**Section sources**
- [phase-1 package.json: 13-24:13-24](file://phase-1/package.json#L13-L24)
- [phase-2 package.json: 13-28:13-28](file://phase-2/package.json#L13-L28)

## Phase-1: Core Scraping, Filtering, and Storage
Phase-1 implements:
- Scraping reviews from Google Play for the Groww app.
- Applying filters to remove short, emoji-containing, duplicate, and PII-bearing reviews.
- Storing normalized reviews in SQLite with week buckets.

Key configuration:
- Database file defaults to a local SQLite file.
- Port defaults to 4001.

Endpoints:
- POST /api/reviews/scrape: Trigger scraping with optional maxReviews.
- GET /api/reviews/scrape: Browser-friendly variant with query param.
- GET /api/reviews: List stored reviews with optional limit.

How to run:
- Build: tsc
- Start: node dist/api/server.js
- Dev: ts-node src/api/server.ts

What to expect:
- Reviews are filtered and stored in the SQLite database.
- If filters drop all items, a fallback mode returns minimally cleaned reviews.

**Section sources**
- [phase-1 env.ts: 1-6:1-6](file://phase-1/src/config/env.ts#L1-L6)
- [phase-1 server.ts: 9-43:9-43](file://phase-1/src/api/server.ts#L9-L43)
- [phase-1 playstoreScraper.ts: 13-151:13-151](file://phase-1/src/scraper/playstoreScraper.ts#L13-L151)
- [phase-1 filters.ts: 16-48:16-48](file://phase-1/src/scraper/filters.ts#L16-L48)
- [phase-1 dates.ts: 1-23:1-23](file://phase-1/src/utils/dates.ts#L1-L23)
- [phase-1 db index.ts: 7-29:7-29](file://phase-1/src/db/index.ts#L7-L29)

## Phase-2: Groq Theming, Weekly Pulse, and Email
Phase-2 builds on Phase-1 data and adds:
- Groq integration for theme discovery and assignment.
- Weekly pulse generation with top themes, quotes, action ideas, and a note.
- Email service to send pulses via SMTP.

Key configuration:
- Database file defaults to the Phase-1 SQLite file.
- Port defaults to 4002.
- Groq API key and model are required for LLM features.
- SMTP host, port, user, pass, and sender are required for email.

Endpoints:
- POST /api/themes/generate: Generate and store 3–5 themes from recent reviews.
- GET /api/themes: List latest themes.
- POST /api/themes/assign: Assign reviews for a week to themes.
- POST /api/pulses/generate: Generate a weekly pulse for a given week.
- GET /api/pulses: List recent pulses.
- GET /api/pulses/:id: Retrieve a pulse.
- POST /api/pulses/:id/send-email: Send a pulse to a recipient.
- POST /api/user-preferences: Save user email, timezone, preferred day/time.
- GET /api/user-preferences: Retrieve current preferences.
- POST /api/email/test: Send a test email to verify SMTP.

How to run:
- Build: tsc
- Start: node dist/api/server.js
- Dev: ts-node src/api/server.ts
- Scheduler starts automatically when GROQ_API_KEY is present.

**Section sources**
- [phase-2 env.ts: 7-21:7-21](file://phase-2/src/config/env.ts#L7-L21)
- [phase-2 server.ts: 28-263:28-263](file://phase-2/src/api/server.ts#L28-L263)
- [phase-2 db index.ts: 7-91:7-91](file://phase-2/src/db/index.ts#L7-L91)
- [phase-2 groqClient.ts: 4-67:4-67](file://phase-2/src/services/groqClient.ts#L4-L67)
- [phase-2 emailService.ts: 99-141:99-141](file://phase-2/src/services/emailService.ts#L99-L141)

## First-Time Usage Examples
Follow these steps to get started quickly.

Step 1: Prepare the database
- Start Phase-1 to initialize the SQLite schema and store reviews.
- Confirm the database file exists at the configured location.

Step 2: Trigger scraping (Phase-1)
- Send a POST request to /api/reviews/scrape with optional maxReviews.
- Verify stored reviews via GET /api/reviews.

Step 3: Generate themes (Phase-2)
- Send a POST request to /api/themes/generate with weeksBack and limit.
- Confirm themes via GET /api/themes.

Step 4: Assign themes to a week’s reviews
- Send a POST request to /api/themes/assign with week_start (YYYY-MM-DD).

Step 5: Generate a weekly pulse
- Send a POST request to /api/pulses/generate with week_start.
- Retrieve the pulse via GET /api/pulses/:id.

Step 6: Send a test email (Phase-2)
- Send a POST request to /api/email/test with a valid to address.
- Alternatively, run the test script from phase-2/scripts/testEmail.ts.

Optional: Full pipeline script
- Use the provided script to run the full pipeline from themes to email.
- The script loads environment variables from the phase-2 .env file.

**Section sources**
- [phase-1 server.ts: 9-43:9-43](file://phase-1/src/api/server.ts#L9-L43)
- [phase-2 server.ts: 28-154:28-154](file://phase-2/src/api/server.ts#L28-L154)
- [phase-2 runPulsePipeline.ts: 14-51:14-51](file://phase-2/scripts/runPulsePipeline.ts#L14-L51)
- [phase-2 testEmail.ts: 3-15:3-15](file://phase-2/scripts/testEmail.ts#L3-L15)

## Common Setup Issues and Troubleshooting
- Missing environment variables
  - Phase-1: DATABASE_FILE and PORT are read from environment; defaults apply if unset.
  - Phase-2: GROQ_API_KEY, GROQ_MODEL, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM must be set.
  - Ensure a .env file exists in phase-2 and is loaded by the app.

- Google Play Scraper failures
  - The scraper paginates and may require many pages to gather sufficient reviews.
  - If filters drop all items, the scraper falls back to minimally cleaned reviews.

- Groq API errors
  - The Groq client retries with increasing temperature on failure.
  - Ensure GROQ_API_KEY is set; otherwise, LLM features will throw an error.

- Email delivery issues
  - Verify SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM are configured.
  - Use the test endpoint or script to validate SMTP connectivity.

- Database schema initialization
  - Both phases initialize their schemas on startup.
  - Ensure the database file path is writable and accessible.

- Port conflicts
  - Change PORT if ports 4001 or 4002 are in use.

**Section sources**
- [phase-1 env.ts: 1-6:1-6](file://phase-1/src/config/env.ts#L1-L6)
- [phase-2 env.ts: 7-21:7-21](file://phase-2/src/config/env.ts#L7-L21)
- [phase-1 playstoreScraper.ts: 106-145:106-145](file://phase-1/src/scraper/playstoreScraper.ts#L106-L145)
- [phase-2 groqClient.ts: 35-65:35-65](file://phase-2/src/services/groqClient.ts#L35-L65)
- [phase-2 emailService.ts: 100-112:100-112](file://phase-2/src/services/emailService.ts#L100-L112)
- [phase-2 server.ts: 257-262:257-262](file://phase-2/src/api/server.ts#L257-L262)

## Conclusion
You now have the essentials to install, configure, and run the Groww App Review Insights Analyzer. Start with Phase-1 to collect and store reviews, then move to Phase-2 to generate themes, assign reviews, produce weekly pulses, and send emails. Use the troubleshooting tips to resolve common setup issues quickly.