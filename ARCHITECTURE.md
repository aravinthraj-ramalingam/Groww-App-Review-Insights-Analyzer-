## Groww App Review Insights Analyzer – Detailed Architecture

This document describes the end-to-end architecture for the **Groww App Review Insights Analyzer**, using:
- **Data source**: Google Play Store public reviews for the Groww app (`com.nextbillion.groww`)
- **Scraper**: [`google-play-scraper`](https://www.npmjs.com/package/google-play-scraper)
- **LLM**: Groq (for theming, summarization, and action ideas)

The system produces a **weekly one-page pulse** email with:
- **Top 3 themes**
- **3 real user quotes**
- **3 action ideas**
- **≤250 words**, scannable format
- **No PII** (no usernames/emails/phone numbers/IDs)

---

## 1. High-Level System Overview

- **Client**: Minimal **web UI (primary trigger surface, no CLI required)** to:
  - Trigger **review collection** for a time range (last 8–12 weeks).
  - Trigger **weekly pulse (one-pager) generation** for a specific week.
  - Let the user **enter their email ID** and **choose preferred day/time** to receive the weekly pulse.
  - Display a **success screen** after schedule is saved.
  - Automatically send the weekly pulse email to the configured email on the **selected day and time**.
  - Allow manual preview of the generated one-pager before sending.
- **Backend API** (Node.js / TypeScript):
  - Service endpoints for scraping reviews from Google Play with `google-play-scraper`.
  - Pre-processing and filtering pipeline for reviews.
  - Storage and retrieval of normalized reviews and generated pulses.
  - Orchestration of Groq calls for:
    - Theme generation (max 5 themes).
    - Review-to-theme grouping.
    - Weekly note text and action ideas.
  - Email draft generation and sending.
- **Persistence**:
  - Lightweight relational DB (SQLite for local / Postgres in production).
  - Tables for `reviews`, `themes`, `review_themes`, and `weekly_pulses`.
- **Third-Party Services**:
  - **Groq** LLM API.
  - Email SMTP provider (e.g., SendGrid/SES/Gmail SMTP).

---

## 2. Phase Plan & Folder Layout

We will implement the system **phase-wise**, with a **separate top-level folder per phase** in this repo:

- **`phase-1/` – Core scraping, filtering, and storage**
  - Node.js/TypeScript project.
  - Implements:
    - Scraping Groww reviews from Google Play using `google-play-scraper`.
    - All filtering rules (≤7 words, emojis, mobile numbers, emails, duplicates).
    - SQLite-backed persistence for normalized reviews.
    - Basic REST API to trigger scraping and list stored reviews.
  - No Groq, theming, or email yet.

- **`phase-2/` – LLM themes, grouping, and weekly pulse backend**
  - Builds on phase 1 data.
  - Implements:
    - Groq integration for theme generation (max 5 themes).
    - Review-to-theme assignment.
    - Weekly pulse generation API (top 3 themes, 3 quotes, 3 action ideas, ≤250-word note).
  - Still backend-only; no UI triggers or email sending yet.

- **`phase-3/` – Web UI & email triggers**
  - Frontend web app (React or simple SPA) that talks to phase 2 backend.
  - Implements:
    - UI forms/workflows to:
      - Trigger scraping (phase 1 API) if needed.
      - Generate a weekly one-pager (phase 2 API) for the relevant week.
      - **Capture user preferences**:
        - Email address to receive the weekly pulse.
        - Preferred **day of week** and **time** (with timezone) to receive the pulse.
      - Save schedule and show a **“success” confirmation screen** indicating when/where the weekly pulse will be delivered.
      - Allow manual “Send now” in addition to scheduled sends (optional).
    - Pulse preview screen (one-pager view) with sections:
      - Top 3 themes.
      - 3 user quotes.
      - 3 action ideas.
      - Weekly note (≤250 words).
  - No CLI interaction needed; all actions are triggered from the browser.

Each phase is **self-contained** in its folder (own `package.json`, `src/`), but they share the same overall architecture concepts defined below.

---

## 3. Data Flow (End-to-End)

1. **Scrape reviews (Google Play)**
   - Backend uses `google-play-scraper` to fetch reviews for `com.nextbillion.groww`.
   - Pagination is used to collect reviews covering at least the last 8–12 weeks.
   - Only public review data is used; no authenticated scraping.

2. **Filter & clean reviews**
   - Remove reviews that:
     - **Have 7 or fewer words** in the combined `title + text` (configurable threshold).
     - **Contain emojis** (Unicode emoji ranges).
     - Contain **mobile numbers** (India-style and generic patterns).
     - Contain **email addresses**.
     - Are **duplicates** (repeated text/title across reviews).
   - Keep a **cleaned text version** where obvious PII (emails/phone numbers) is removed or masked.

3. **Normalize & store**
   - Convert the scraper output to a standard internal schema.
   - Compute and store **week buckets** (e.g., Monday–Sunday) based on review date.
   - Persist into `reviews` table.

4. **Theme discovery (global, across 8–12 weeks)**
   - Sample cleaned reviews from the last 8–12 weeks.
   - Send batched texts to Groq with a prompt to:
     - Propose **3–5 themes** (max 5).
     - For each theme: name, short description, and representative phrases.
   - Store resulting themes in `themes` table.

5. **Review-to-theme assignment**
   - For each cleaned review (or in batches), call Groq with:
     - The list of allowed theme names.
     - The review text.
   - Get back a theme label (or `"Other"`).
   - Persist mappings to `review_themes` table with optional confidence.

6. **Weekly pulse generation**
   - For a target week (within the last 8–12 weeks):
     - Fetch reviews for that week and their assigned themes.
     - Aggregate stats per theme (count, average rating).
     - Select **top 3 themes** for the week.
     - Select candidate **user quotes** for those themes from cleaned reviews.
     - Ask Groq for **3 action ideas** based on theme summaries and quotes.
     - Ask Groq to generate a **≤250-word, scannable weekly note** containing:
       - 3 top themes (short descriptions).
       - 3 user quotes.
       - 3 action ideas.
     - Run a final **PII scrub & length check** on the final note.
   - Store result in `weekly_pulses` table.

7. **Email drafting & sending** (phase 2 backend, triggered from phase 3 UI)
   - Build an email body from the weekly pulse object (HTML and/or plain text).
   - Send email to a configured address/alias via SMTP provider.
   - Keep a minimal log of sent emails (no PII in logs).

---

## 4. Backend Architecture (Node.js / TypeScript)

### 3.1 Project Structure

Proposed high-level folder layout:

```text
src/
  config/
    env.ts
  core/
    logger.ts
    errors.ts
  scraper/
    playstoreScraper.ts
    filters.ts
  db/
    index.ts
    migrations/
  domain/
    review.model.ts
    theme.model.ts
    weeklyPulse.model.ts
  services/
    reviewService.ts
    themeService.ts
    pulseService.ts
    llmService.ts
    emailService.ts
    piiService.ts
  api/
    routes/
      reviews.routes.ts
      themes.routes.ts
      pulses.routes.ts
    server.ts
  jobs/
    generateWeeklyPulseJob.ts
  utils/
    dates.ts
    text.ts
```

### 3.2 Core Modules

- **`config/env.ts`**
  - Reads environment variables:
    - `GROQ_API_KEY`
    - `DATABASE_URL` or file path (for SQLite)
    - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
    - `PULSE_DEFAULT_RECIPIENT`
  - Provides typed configuration object.

- **`core/logger.ts`**
  - Centralized logging (request logs, errors, Groq calls).

- **`core/errors.ts`**
  - Standard error types and error-handling middleware.

---

## 5. Review Scraping & Filtering

### 4.1 Scraper Module (`scraper/playstoreScraper.ts`)

- Uses `google-play-scraper`:
  - App ID: `com.nextbillion.groww`
  - Fetches reviews in pages, ordered by **newest first**.
  - Continues fetching until:
    - Review dates cover at least the last **8–12 weeks**, or
    - A configurable max number of reviews is reached.
- For each fetched review, map to internal structure:
  - `id` (from Play Store review ID)
  - `platform = "android"`
  - `rating`
  - `title`
  - `text` (review body)
  - `created_at` (converted to UTC)
  - `raw` (raw JSON from the scraper for debugging only)

### 4.2 Filtering Rules (`scraper/filters.ts`)

Filtering is applied **before** storing reviews:

- **Short reviews**:
  - Compute total word count from `title + " " + text`.
  - If `wordCount <= 7`, **drop** the review.
- **Reviews containing emojis**:
  - Use regex covering common emoji Unicode ranges (e.g., `\u{1F300}-\u{1FAFF}`, `\u{2600}-\u{26FF}`, etc.).
  - If any emoji detected, **drop** the review.
- **Mobile numbers**:
  - Patterns for common formats:
    - Indian mobile: `\b[6-9]\d{9}\b`
    - Generic phone: `(\+?\d{1,3}[- ]?)?\d{10,13}` with separators.
  - If a number-like sequence matches, **drop** the review.
- **Emails**:
  - Regex like: `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}`
  - If found, **drop** the review.
- **Repeated / duplicate reviews**:
  - Normalize text:
    - Lowercase, trim, collapse whitespace.
  - Maintain an in-memory `Set` (per scraping run) of normalized `title + text` signatures.
  - If signature already exists, **drop** the review.

Only reviews that pass all filters are passed to the storage layer.

---

## 6. Storage Layer & Data Model

### 5.1 Database Choice

- **Prototype**: SQLite file via an ORM (e.g., Prisma/TypeORM/Drizzle).
- **Production**: Postgres (same schema, different connection string).

### 5.2 Schema (Conceptual)

- **`reviews`**
  - `id` (PK, string from Play Store)
  - `platform` (`"android"`)
  - `rating` (int)
  - `title` (text)
  - `text` (text)
  - `clean_text` (text, post basic PII scrub)
  - `created_at` (datetime, UTC)
  - `week_start` (date)
  - `week_end` (date)
  - `raw_payload` (JSON, optional)

- **`themes`**
  - `id` (PK)
  - `name` (string)
  - `description` (text)
  - `created_at` (datetime)
  - `valid_from` (date, start of 8–12 week window)
  - `valid_to` (date, end of window)

- **`review_themes`**
  - `id` (PK)
  - `review_id` (FK → `reviews.id`)
  - `theme_id` (FK → `themes.id`)
  - `confidence` (float, nullable)

- **`weekly_pulses`**
  - `id` (PK)
  - `week_start` (date)
  - `week_end` (date)
  - `top_themes` (JSON array of theme summaries)
  - `user_quotes` (JSON array of quote objects)
  - `action_ideas` (JSON array of action idea objects)
  - `note_body` (text, final ≤250-word note)
  - `created_at` (datetime)
  - `version` (int, for regenerations)

- **`user_preferences`**
  - `id` (PK)
  - `email` (string, validated; internal only)
  - `timezone` (string, e.g., `"Asia/Kolkata"`)
  - `preferred_day_of_week` (int 0–6, e.g., 0 = Sunday, 1 = Monday)
  - `preferred_time` (string `"HH:MM"` in 24h format)
  - `created_at` (datetime)
  - `updated_at` (datetime)
  - `active` (boolean)

- **`scheduled_jobs`** (optional, for tracking actual sends)
  - `id` (PK)
  - `user_preference_id` (FK → `user_preferences.id`)
  - `week_start` (date) – the week this pulse corresponds to
  - `scheduled_at_utc` (datetime)
  - `sent_at_utc` (datetime, nullable)
  - `status` (`"pending" | "sent" | "failed"`)

---

## 7. Groq Integration & LLM Orchestration

### 6.1 LLM Service (`services/llmService.ts`)

- Wraps Groq SDK / HTTP client.
- Provides task-specific methods that:
  - Accept **structured inputs** (arrays of reviews, themes, etc.).
  - Build **prompt + system instructions** enforcing:
    - Max 5 themes globally.
    - No PII (no usernames/emails/phone numbers/IDs/links).
    - JSON-only responses with known schema.
  - Validate and parse JSON responses.
- Typical methods:
  - `generateThemes(reviewsSample): ThemeDefinition[]`
  - `assignThemesToReviews(themes, reviewsBatch): ReviewThemeAssignment[]`
  - `generateActionIdeas(themes, quotes): ActionIdea[]`
  - `generateWeeklyNote(pulseInput): string`
  - `scrubPii(text): string` (optional LLM-based last pass).

### 6.2 Theme Generation Flow

1. Fetch a representative sample from last 8–12 weeks (`clean_text`).
2. Prompt Groq, e.g.:
   - “You are analyzing app reviews for Groww. Read these review snippets and propose between 3 and 5 themes. Output JSON with `themes: [{name, description}]` only.”
3. Validate:
   - 3 ≤ `themes.length` ≤ 5.
4. Persist in `themes` table.

### 6.3 Review-to-Theme Assignment Flow

1. Batch reviews (e.g., 50–100 per request) to control token usage.
2. For each batch, call `llmService.assignThemesToReviews`.
3. LLM is given:
   - Canonical theme list.
   - A requirement: “For each review, return one theme name from this list or 'Other'. Respond as JSON: `{ assignments: [{review_id, theme_name}] }`.”
4. Store result in `review_themes`.

### 6.4 Weekly Note & Actions Flow

1. Aggregate per-week data:
   - Theme stats (counts, average rating).
   - Example quotes per top theme.
2. Call Groq to:
   - Suggest 3 concrete, short action ideas.
   - Generate a ≤250-word weekly note in a scannable structure:
     - Short intro.
     - Bullet list of themes.
     - Quotes and actions interwoven or in separate sections.
3. Post-process:
   - Count words; if > 250, either truncate gracefully or request a shorter re-generation.
   - Run regex-based PII scrub + optional LLM `scrubPii`.
4. Persist to `weekly_pulses`.

---

## 8. PII Protection & Text Hygiene

The system enforces **no PII** in all user-facing artifacts:

- **Before storage**:
  - Drop reviews with emails or phone numbers entirely.
  - Drop reviews with obvious emojis and very short content (≤7 words).
- **Before LLM calls**:
  - Apply regex scrubbing of any stray emails/phone numbers/URLs if present.
  - Normalize whitespace and truncate extremely long reviews (to save tokens).
- **In prompts**:
  - Explicit instructions to:
    - Avoid reproducing any usernames, emails, phone numbers, or IDs.
    - Replace them with placeholder text like `"[redacted]"` if needed.
- **After LLM output**:
  - Run regex filters again:
    - Emails, phone numbers, URLs, @handles.
  - Replace with `"[redacted]"` if found.
  - Unit tests to ensure typical PII examples are removed.

---

## 9. API Endpoints

Example REST API surface (can be adapted to GraphQL if needed):

- `POST /api/reviews/scrape`
  - Triggers scraping from Google Play Store using `google-play-scraper`.
  - Parameters:
    - `weeks` (default 12) – how many weeks back to ensure coverage.
  - Response: summary of new reviews ingested.

- `GET /api/reviews`
  - Query stored reviews with filters by `week_start`, rating range, etc.

- `POST /api/themes/generate`
  - Uses recent reviews to generate and store up to 5 themes.
  - Idempotent over the last 8–12 weeks snapshot.

- `POST /api/pulses/generate`
  - Body: `{ "week_start": "YYYY-MM-DD" }`
  - Generates or regenerates a weekly pulse:
    - Top 3 themes.
    - 3 quotes.
    - 3 action ideas.
    - Weekly note (≤250 words).
  - Response: the full `weekly_pulse` object.

- `GET /api/pulses/:id`
  - Returns a stored weekly pulse.

- `POST /api/pulses/:id/send-email`
  - Sends the pulse via email to configured recipient(s).

- `POST /api/user-preferences`
  - Body: `{ "email": string, "timezone": string, "preferred_day_of_week": number, "preferred_time": string }`
  - Creates or updates the user’s weekly pulse schedule.
  - Response: confirmation object used by the web UI to render the **success screen** (e.g., “You will receive your weekly pulse every Monday at 09:00 Asia/Kolkata to you@example.com”).

- `GET /api/user-preferences`
  - Returns current preferences for the (single) user of this internal tool or for the authenticated user context.

---

## 10. Email Layer

- **`services/emailService.ts`**
  - Wraps nodemailer (or provider SDK).
  - Accepts:
    - `to` (email or list, typically the product/growth/support alias).
    - `subject` (e.g., `"Groww Weekly Reviews Pulse – Week of 2026-03-02"`).
    - `html` and/or `text` body.
  - Performs a final PII scrub on the compiled email body.

- **Email Content Layout**
  - Greeting + 1-line summary.
  - Section: **This Week’s Top 3 Themes**
  - Section: **User Quotes** (3 short, PII-free quotes).
  - Section: **Recommended Actions** (3 concise items).

---

## 11. Scheduling & Automation

- **Job module**: `jobs/generateWeeklyPulseJob.ts`
  - Responsible for:
    - Periodically (e.g., every 5–10 minutes) checking which users should receive a pulse **now**, based on:
      - Their `user_preferences` (email, preferred day/time, timezone).
      - The current time in each user’s timezone.
      - The latest full week for which reviews and themes are available.
    - For each due user:
      1. Trigger scraping for last 12 weeks (or incremental fetch) if necessary.
      2. Ensure themes are up to date (regenerate when window shifts).
      3. Generate or fetch the weekly pulse for the relevant week.
      4. Send the email pulse to the user’s configured email.
      5. Mark a record in `scheduled_jobs` as `sent` or `failed`.
  - Can be triggered via:
    - A system cron job calling `node dist/jobs/generateWeeklyPulseJob.js` frequently.
    - A managed scheduler (e.g., cloud scheduler) hitting an internal endpoint.

---

## 12. Frontend / UI (Web Console – phase 3)

- **Views**
  - **Dashboard**
    - Summary tiles: number of reviews (last 8–12 weeks), number of themes, last generated pulse.
  - **Reviews**
    - Table of filtered, stored reviews with basic filters.
  - **Pulses**
    - List of weekly pulses.
    - Detail page showing:
      - Themes
      - Quotes
      - Action ideas
      - Final weekly note
      - Button: “Send email to myself”.

- **Design Principles**
  - Scannability: emphasis on bullet points and small sections.
  - Clear warnings in UI that:
    - Only public, non-PII data is used.
    - Email content is intended as an internal weekly pulse.

---

## 13. Non-Functional Considerations

- **Performance**
  - Batch Groq calls and scraping requests.
  - Cache or reuse themes over a sliding 8–12 week window.
- **Reliability**
  - Graceful degradation:
    - If Groq fails, log and allow re-run.
    - If scraping fails, preserve existing data.
- **Observability**
  - Logs:
    - Scraping run metrics (count fetched, count filtered).
    - Groq latency and error rates.
    - Pulses generated and emails sent.
- **Security**
  - Protect Groq and SMTP credentials via environment variables.
  - Restrict access to the web console / API as internal-only.

