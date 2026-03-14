# Phase 2 API Endpoints

<cite>
**Referenced Files in This Document**
- [server.ts](file://phase-2/src/api/server.ts)
- [env.ts](file://phase-2/src/config/env.ts)
- [db/index.ts](file://phase-2/src/db/index.ts)
- [themeService.ts](file://phase-2/src/services/themeService.ts)
- [assignmentService.ts](file://phase-2/src/services/assignmentService.ts)
- [pulseService.ts](file://phase-2/src/services/pulseService.ts)
- [emailService.ts](file://phase-2/src/services/emailService.ts)
- [userPrefsRepo.ts](file://phase-2/src/services/userPrefsRepo.ts)
- [reviewsRepo.ts](file://phase-2/src/services/reviewsRepo.ts)
- [schedulerJob.ts](file://phase-2/src/jobs/schedulerJob.ts)
- [groqClient.ts](file://phase-2/src/services/groqClient.ts)
- [review.ts](file://phase-2/src/domain/review.ts)
- [pulse.test.ts](file://phase-2/src/tests/pulse.test.ts)
- [userPrefs.test.ts](file://phase-2/src/tests/userPrefs.test.ts)
- [assignment.test.ts](file://phase-2/src/tests/assignment.test.ts)
- [package.json](file://phase-2/package.json)
</cite>

## Update Summary
**Changes Made**
- Added comprehensive REST API endpoints documentation for `/api/reviews/stats`, `/api/reviews`, `/api/reviews/scrape`, `/api/reviews/week/:weekStart`, `/api/themes`, `/api/pulses`, and `/api/user-preferences`
- Enhanced server with CORS configuration for production environments
- Improved error handling across all endpoints with consistent response patterns
- Added dashboard statistics endpoint for system monitoring
- Updated endpoint paths to reflect actual implementation (`/api/user-preferences` instead of `/api/preferences`)
- Enhanced CORS configuration with environment-specific origins

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
This document provides comprehensive API documentation for Phase 2 endpoints focused on advanced analytics, automation, and user management. It covers:
- Review management: statistics, listing, and scraping endpoints
- Theme management: generation, validation, and retrieval
- Pulse generation: weekly insights creation, theme assignment, and content aggregation
- User preference management: scheduling configuration, delivery preferences, and subscription management
- Email service endpoints: testing SMTP configuration and delivery verification
- Dashboard statistics: system monitoring and analytics

It also documents request/response schemas, authentication requirements, parameter validation rules, error handling patterns, and includes concrete examples of complex workflows such as theme-to-pulse assignment, automated scheduling, and preference-based filtering. Security, API versioning, rate limiting, and production deployment considerations are addressed.

## Project Structure
The Phase 2 backend is organized around a small Express server, a SQLite database, and modular services:
- API routes: centralized in the server file with comprehensive endpoint coverage
- Configuration: environment variables for database, ports, and external services
- Domain models: review schema
- Services:
  - Theme service: LLM-driven theme generation and storage
  - Assignment service: LLM-driven review-to-theme assignment
  - Pulse service: weekly insight aggregation and persistence
  - Email service: HTML/text email building and SMTP transport
  - User preferences: CRUD and scheduling helpers
  - Reviews repository: data access for review operations
  - Scheduler job: periodic automation
- Database initialization and schema

```mermaid
graph TB
Client["Client"]
API["Express Server<br/>routes in server.ts"]
Config["Config<br/>env.ts"]
DB["SQLite DB<br/>db/index.ts"]
ThemeSvc["Theme Service<br/>themeService.ts"]
AssignSvc["Assignment Service<br/>assignmentService.ts"]
PulseSvc["Pulse Service<br/>pulseService.ts"]
EmailSvc["Email Service<br/>emailService.ts"]
PrefSvc["User Preferences Repo<br/>userPrefsRepo.ts"]
ReviewsRepo["Reviews Repository<br/>reviewsRepo.ts"]
Scheduler["Scheduler Job<br/>schedulerJob.ts"]
Groq["Groq Client<br/>groqClient.ts"]
Client --> API
API --> ThemeSvc
API --> AssignSvc
API --> PulseSvc
API --> EmailSvc
API --> PrefSvc
API --> ReviewsRepo
API --> Scheduler
API --> Config
ThemeSvc --> DB
AssignSvc --> DB
PulseSvc --> DB
PrefSvc --> DB
ReviewsRepo --> DB
Scheduler --> PulseSvc
Scheduler --> EmailSvc
ThemeSvc --> Groq
AssignSvc --> Groq
PulseSvc --> Groq
```

**Diagram sources**
- [server.ts:1-349](file://phase-2/src/api/server.ts#L1-L349)
- [env.ts:1-23](file://phase-2/src/config/env.ts#L1-L23)
- [db/index.ts:1-93](file://phase-2/src/db/index.ts#L1-L93)
- [themeService.ts:1-68](file://phase-2/src/services/themeService.ts#L1-L68)
- [assignmentService.ts:1-114](file://phase-2/src/services/assignmentService.ts#L1-L114)
- [pulseService.ts:1-265](file://phase-2/src/services/pulseService.ts#L1-L265)
- [emailService.ts:1-142](file://phase-2/src/services/emailService.ts#L1-L142)
- [userPrefsRepo.ts:1-95](file://phase-2/src/services/userPrefsRepo.ts#L1-L95)
- [reviewsRepo.ts:1-26](file://phase-2/src/services/reviewsRepo.ts#L1-L26)
- [schedulerJob.ts:1-98](file://phase-2/src/jobs/schedulerJob.ts#L1-L98)
- [groqClient.ts:1-67](file://phase-2/src/services/groqClient.ts#L1-L67)

**Section sources**
- [server.ts:1-349](file://phase-2/src/api/server.ts#L1-L349)
- [env.ts:1-23](file://phase-2/src/config/env.ts#L1-L23)
- [db/index.ts:1-93](file://phase-2/src/db/index.ts#L1-L93)

## Core Components
- Dashboard & Statistics
  - System stats: GET /api/reviews/stats
- Review Management
  - List reviews: GET /api/reviews
  - Scrape reviews: POST /api/reviews/scrape
  - Weekly reviews: GET /api/reviews/week/:weekStart
- Theme Management
  - Generate themes: POST /api/themes/generate
  - List themes: GET /api/themes
  - Assign themes: POST /api/themes/assign
- Pulse Management
  - Generate pulses: POST /api/pulses/generate
  - List pulses: GET /api/pulses
  - Get pulse: GET /api/pulses/:id
  - Send pulse email: POST /api/pulses/:id/send-email
- User Preferences
  - Save preferences: POST /api/user-preferences
  - Get preferences: GET /api/user-preferences
- Email Testing
  - Test SMTP: POST /api/email/test
- Automation
  - Scheduler: runs periodically to generate and deliver pulses based on preferences

**Section sources**
- [server.ts:39-331](file://phase-2/src/api/server.ts#L39-L331)

## Architecture Overview
The API exposes endpoints that orchestrate data ingestion, LLM-powered analytics, and email delivery. The database stores themes, assignments, weekly pulses, user preferences, and scheduled jobs. The scheduler automates pulse generation and delivery.

```mermaid
sequenceDiagram
participant C as "Client"
participant S as "Server Routes<br/>server.ts"
participant T as "Theme Service<br/>themeService.ts"
participant A as "Assignment Service<br/>assignmentService.ts"
participant P as "Pulse Service<br/>pulseService.ts"
participant E as "Email Service<br/>emailService.ts"
participant R as "Reviews Repository<br/>reviewsRepo.ts"
participant DB as "DB<br/>db/index.ts"
C->>S : GET /api/reviews/stats
S->>DB : Query statistics
DB-->>S : Stats data
S-->>C : { ok, stats }
C->>S : GET /api/reviews
S->>R : listRecentReviews()
R->>DB : Query reviews
DB-->>R : Review data
R-->>S : Reviews
S-->>C : { ok, reviews }
C->>S : POST /api/themes/generate
S->>R : listRecentReviews()
R->>DB : Query recent reviews
DB-->>R : Review data
R-->>S : Reviews
S->>T : generateThemesFromReviews(reviews)
T->>DB : upsertThemes(themes)
T-->>S : ids
S-->>C : { ok, themes }
C->>S : POST /api/pulses/ : id/send-email
S->>DB : getPulse(id)
DB-->>S : WeeklyPulse or null
alt Pulse not found
S-->>C : 404 { error }
else Found
alt to provided
S->>E : sendPulseEmail(to, pulse)
else to missing
S->>DB : getUserPrefs()
DB-->>S : UserPrefsRow or null
alt No prefs
S-->>C : 400 { error }
else Prefs exist
S->>E : sendPulseEmail(prefs.email, pulse)
end
end
E-->>S : success
S-->>C : { ok, message }
```

**Diagram sources**
- [server.ts:39-331](file://phase-2/src/api/server.ts#L39-L331)
- [themeService.ts:17-66](file://phase-2/src/services/themeService.ts#L17-L66)
- [assignmentService.ts:27-113](file://phase-2/src/services/assignmentService.ts#L27-L113)
- [pulseService.ts:179-241](file://phase-2/src/services/pulseService.ts#L179-L241)
- [emailService.ts:114-141](file://phase-2/src/services/emailService.ts#L114-L141)
- [userPrefsRepo.ts:21-56](file://phase-2/src/services/userPrefsRepo.ts#L21-L56)
- [reviewsRepo.ts:4-24](file://phase-2/src/services/reviewsRepo.ts#L4-L24)
- [db/index.ts:7-91](file://phase-2/src/db/index.ts#L7-L91)

## Detailed Component Analysis

### Dashboard & Statistics Endpoints
- GET /api/reviews/stats
  - Purpose: Retrieve system statistics including total reviews, themes, weeks covered, and last pulse date.
  - Response:
    - ok: boolean
    - stats: {
        totalReviews: number
        totalThemes: number
        weeksCovered: number
        lastPulseDate: string|null
      }
  - Error handling:
    - 500 on database query failure with generic error message.

```mermaid
flowchart TD
Start(["GET /api/reviews/stats"]) --> QueryReviews["Query total reviews count"]
QueryReviews --> QueryThemes["Query total themes count"]
QueryThemes --> QueryWeeks["Query weeks covered"]
QueryWeeks --> QueryLastPulse["Query last pulse date"]
QueryLastPulse --> BuildResponse["Build stats object"]
BuildResponse --> ReturnOK["Return { ok, stats }"]
ReturnOK --> End(["Done"])
```

**Diagram sources**
- [server.ts:39-60](file://phase-2/src/api/server.ts#L39-L60)

**Section sources**
- [server.ts:39-60](file://phase-2/src/api/server.ts#L39-L60)

### Review Management Endpoints
- GET /api/reviews
  - Purpose: List reviews with optional filtering by week_start, minRating, and maxRating.
  - Query parameters:
    - week_start: string (YYYY-MM-DD)
    - minRating: number
    - maxRating: number
  - Response:
    - ok: boolean
    - reviews: array of ReviewRow objects
  - Error handling:
    - 500 on database query failure with generic error message.
- POST /api/reviews/scrape
  - Purpose: Trigger review scraping (currently points to Phase 1 API).
  - Response:
    - ok: boolean
    - message: string indicating to use Phase 1 API
  - Error handling:
    - 500 on processing error with generic error message.
- GET /api/reviews/week/:weekStart
  - Purpose: List reviews for a specific week (debug helper).
  - Path parameters:
    - weekStart: string (YYYY-MM-DD)
  - Response:
    - ok: boolean
    - reviews: array of ReviewRow objects
  - Error handling:
    - 500 on database query failure with generic error message.

```mermaid
flowchart TD
Start(["GET /api/reviews"]) --> ReadQuery["Read query parameters"]
ReadQuery --> BuildQuery["Build dynamic SQL query"]
BuildQuery --> ExecuteQuery["Execute with parameters"]
ExecuteQuery --> ReturnReviews["Return { ok, reviews }"]
ReturnReviews --> End(["Done"])
```

**Diagram sources**
- [server.ts:62-91](file://phase-2/src/api/server.ts#L62-L91)
- [reviewsRepo.ts:4-24](file://phase-2/src/services/reviewsRepo.ts#L4-L24)

**Section sources**
- [server.ts:62-105](file://phase-2/src/api/server.ts#L62-L105)
- [reviewsRepo.ts:4-24](file://phase-2/src/services/reviewsRepo.ts#L4-L24)

### Theme Management Endpoints
- POST /api/themes/generate
  - Purpose: Generate 3–5 themes from recent reviews and store them.
  - Query/body parameters:
    - weeksBack: number (default 12)
    - limit: number (default 800)
  - Validation:
    - Uses numeric defaults if missing or invalid.
  - Response:
    - ok: boolean
    - themes: array of theme objects with id, name, description
  - Error handling:
    - 500 on failure with generic error message.
  - Notes:
    - Relies on LLM via Groq client; requires API key.
    - Zod validates theme schema (name length, description length).
- GET /api/themes
  - Purpose: List latest themes.
  - Parameters:
    - limit: number (default 5)
  - Response:
    - ok: boolean
    - themes: array of { id, name, description }
  - Error handling:
    - 500 on failure with generic error message.
- POST /api/themes/assign
  - Purpose: Assign reviews for a week to the latest themes.
  - Body parameters:
    - week_start: string (YYYY-MM-DD)
  - Validation:
    - week_start must match date pattern; otherwise 400.
  - Response:
    - ok: boolean
    - Stats: assigned, skipped, themes
  - Error handling:
    - 500 on failure with message.

```mermaid
flowchart TD
Start(["POST /api/themes/generate"]) --> ReadParams["Read weeksBack, limit"]
ReadParams --> LoadReviews["Load recent reviews"]
LoadReviews --> CallLLM["Call Groq to generate themes"]
CallLLM --> Validate["Zod validate themes"]
Validate --> Upsert["Upsert themes to DB"]
Upsert --> ReturnOK["Return { ok, themes }"]
ReturnOK --> End(["Done"])
```

**Diagram sources**
- [server.ts:111-126](file://phase-2/src/api/server.ts#L111-L126)
- [themeService.ts:17-37](file://phase-2/src/services/themeService.ts#L17-L37)
- [groqClient.ts:30-65](file://phase-2/src/services/groqClient.ts#L30-L65)

**Section sources**
- [server.ts:111-153](file://phase-2/src/api/server.ts#L111-L153)
- [themeService.ts:6-13](file://phase-2/src/services/themeService.ts#L6-L13)
- [themeService.ts:17-66](file://phase-2/src/services/themeService.ts#L17-L66)
- [groqClient.ts:30-65](file://phase-2/src/services/groqClient.ts#L30-L65)

### Pulse Generation Endpoints
- POST /api/pulses/generate
  - Purpose: Generate weekly pulse for a given week.
  - Body parameters:
    - week_start: string (YYYY-MM-DD)
  - Validation:
    - week_start must match date pattern; otherwise 400.
  - Response:
    - ok: boolean
    - pulse: WeeklyPulse object
  - Error handling:
    - 500 on failure with message.
- GET /api/pulses
  - Purpose: List recent pulses.
  - Parameters:
    - limit: number (default 20)
  - Response:
    - ok: boolean
    - pulses: array of WeeklyPulse
- GET /api/pulses/:id
  - Purpose: Retrieve a single pulse by id.
  - Path parameters:
    - id: number
  - Validation:
    - id must be numeric; otherwise 400.
    - Not found if absent; 404.
  - Response:
    - ok: boolean
    - pulse: WeeklyPulse
- POST /api/pulses/:id/send-email
  - Purpose: Email a pulse to a recipient.
  - Path parameters:
    - id: number
  - Body parameters:
    - to: string (optional; falls back to active user preference email)
  - Validation:
    - id must be numeric; otherwise 400.
    - Not found if absent; 404.
    - Requires valid to or active user preferences; otherwise 400.
  - Response:
    - ok: boolean
    - message: success confirmation

```mermaid
sequenceDiagram
participant C as "Client"
participant S as "Server"
participant P as "Pulse Service"
participant DB as "DB"
participant E as "Email Service"
C->>S : POST /api/pulses/ : id/send-email { to? }
S->>DB : getPulse(id)
DB-->>S : WeeklyPulse or null
alt Pulse not found
S-->>C : 404 { error }
else Found
alt to provided
S->>E : sendPulseEmail(to, pulse)
else to missing
S->>DB : getUserPrefs()
DB-->>S : UserPrefsRow or null
alt No prefs
S-->>C : 400 { error }
else Prefs exist
S->>E : sendPulseEmail(prefs.email, pulse)
end
end
E-->>S : success
S-->>C : { ok, message }
end
```

**Diagram sources**
- [server.ts:206-237](file://phase-2/src/api/server.ts#L206-L237)
- [pulseService.ts:243-252](file://phase-2/src/services/pulseService.ts#L243-L252)
- [emailService.ts:114-129](file://phase-2/src/services/emailService.ts#L114-L129)
- [userPrefsRepo.ts:50-56](file://phase-2/src/services/userPrefsRepo.ts#L50-L56)

**Section sources**
- [server.ts:159-237](file://phase-2/src/api/server.ts#L159-L237)
- [pulseService.ts:28-38](file://phase-2/src/services/pulseService.ts#L28-L38)
- [pulseService.ts:179-241](file://phase-2/src/services/pulseService.ts#L179-L241)
- [pulseService.ts:243-264](file://phase-2/src/services/pulseService.ts#L243-L264)

### User Preference Management Endpoints
- POST /api/user-preferences
  - Purpose: Save or update user preferences and activate them.
  - Body parameters:
    - email: string (required; must include @)
    - timezone: string (required; e.g., "Asia/Kolkata")
    - preferred_day_of_week: number (0=Sunday – 6=Saturday)
    - preferred_time: string ("HH:MM", 24-hour)
  - Validation:
    - 400 on invalid fields.
  - Behavior:
    - Deactivates previously active preferences and activates the new one.
  - Response:
    - ok: boolean
    - preferences: saved UserPrefsRow
    - confirmation: human-readable schedule summary
- GET /api/user-preferences
  - Purpose: Retrieve currently active preferences.
  - Response:
    - ok: boolean
    - preferences: UserPrefsRow or 404 if none

```mermaid
flowchart TD
Start(["POST /api/user-preferences"]) --> Validate["Validate email, timezone,<br/>preferred_day_of_week, preferred_time"]
Validate --> Valid{"Valid?"}
Valid --> |No| Err400["Return 400"]
Valid --> |Yes| Deactivate["Deactivate previous active prefs"]
Deactivate --> Insert["Insert new active pref"]
Insert --> Return["Return { ok, preferences, confirmation }"]
```

**Diagram sources**
- [server.ts:243-295](file://phase-2/src/api/server.ts#L243-L295)
- [userPrefsRepo.ts:21-43](file://phase-2/src/services/userPrefsRepo.ts#L21-L43)

**Section sources**
- [server.ts:243-295](file://phase-2/src/api/server.ts#L243-L295)
- [userPrefsRepo.ts:3-15](file://phase-2/src/services/userPrefsRepo.ts#L3-L15)
- [userPrefsRepo.ts:21-56](file://phase-2/src/services/userPrefsRepo.ts#L21-L56)

### Email Service Endpoints
- POST /api/email/test
  - Purpose: Verify SMTP configuration by sending a test email.
  - Body parameters:
    - to: string (required; must include @)
  - Validation:
    - 400 if invalid email.
  - Response:
    - ok: boolean
    - message: success confirmation

```mermaid
sequenceDiagram
participant C as "Client"
participant S as "Server"
participant E as "Email Service"
C->>S : POST /api/email/test { to }
S->>E : sendTestEmail(to)
E-->>S : success
S-->>C : { ok, message }
```

**Diagram sources**
- [server.ts:301-315](file://phase-2/src/api/server.ts#L301-L315)
- [emailService.ts:132-141](file://phase-2/src/services/emailService.ts#L132-L141)

**Section sources**
- [server.ts:301-315](file://phase-2/src/api/server.ts#L301-L315)
- [emailService.ts:99-141](file://phase-2/src/services/emailService.ts#L99-L141)

### Automation and Scheduling
- Scheduler
  - Starts automatically if Groq API key is present.
  - Runs every 5 minutes by default.
  - Finds due preferences, generates the latest pulse for the last full week, sends email, and records job status.
- Due preferences calculation
  - Determines next send time based on preferred day/time and checks against current UTC time.
  - Filters preferences that have no sent scheduled job for the current ISO week and whose next send time is now or earlier.

```mermaid
sequenceDiagram
participant Sch as "Scheduler"
participant Pref as "UserPrefsRepo"
participant Gen as "PulseService"
participant Mail as "EmailService"
participant DB as "DB"
Sch->>Pref : listDuePrefs(nowUtcIso)
Pref-->>Sch : duePrefs[]
loop For each due pref
Sch->>DB : scheduleJobRow(prefId, weekStart, nowUtcIso)
Sch->>Gen : generatePulse(weekStart)
Gen->>DB : read/write weekly_pulses
Gen-->>Sch : WeeklyPulse
Sch->>Mail : sendPulseEmail(pref.email, pulse)
alt success
Sch->>DB : markJobSent(jobId)
else failure
Sch->>DB : markJobFailed(jobId, error)
end
end
```

**Diagram sources**
- [schedulerJob.ts:52-84](file://phase-2/src/jobs/schedulerJob.ts#L52-L84)
- [userPrefsRepo.ts:83-94](file://phase-2/src/services/userPrefsRepo.ts#L83-L94)
- [pulseService.ts:179-241](file://phase-2/src/services/pulseService.ts#L179-L241)
- [emailService.ts:114-129](file://phase-2/src/services/emailService.ts#L114-L129)

**Section sources**
- [server.ts:334-346](file://phase-2/src/api/server.ts#L334-L346)
- [schedulerJob.ts:1-98](file://phase-2/src/jobs/schedulerJob.ts#L1-L98)
- [userPrefsRepo.ts:62-94](file://phase-2/src/services/userPrefsRepo.ts#L62-L94)

## Dependency Analysis
- External dependencies:
  - Express for routing
  - better-sqlite3 for database
  - groq-sdk for LLM
  - nodemailer for email
  - zod for schema validation
  - cors for cross-origin resource sharing
- Internal dependencies:
  - server.ts depends on services and config
  - services depend on db and config
  - scheduler depends on pulse and email services

```mermaid
graph LR
Express["express"] --> Server["server.ts"]
Cors["cors"] --> Server
Zod["zod"] --> ThemeSvc["themeService.ts"]
Zod --> AssignmentSvc["assignmentService.ts"]
Zod --> PulseSvc["pulseService.ts"]
Better["better-sqlite3"] --> DB["db/index.ts"]
GroqSDK["groq-sdk"] --> Groq["groqClient.ts"]
Nodemailer["nodemailer"] --> Email["emailService.ts"]
Server --> ThemeSvc
Server --> AssignmentSvc
Server --> PulseSvc
Server --> Email
Server --> Pref
Server --> ReviewsRepo
Server --> Scheduler
ThemeSvc --> DB
AssignmentSvc --> DB
PulseSvc --> DB
Pref --> DB
ReviewsRepo --> DB
Scheduler --> PulseSvc
Scheduler --> Email
```

**Diagram sources**
- [package.json:13-22](file://phase-2/package.json#L13-L22)
- [server.ts:1-15](file://phase-2/src/api/server.ts#L1-L15)
- [db/index.ts:1-5](file://phase-2/src/db/index.ts#L1-L5)
- [groqClient.ts:1-7](file://phase-2/src/services/groqClient.ts#L1-L7)
- [emailService.ts:1-6](file://phase-2/src/services/emailService.ts#L1-L6)

**Section sources**
- [package.json:13-22](file://phase-2/package.json#L13-L22)
- [server.ts:1-15](file://phase-2/src/api/server.ts#L1-L15)

## Performance Considerations
- Batch processing:
  - Assignment service processes reviews in batches to control token usage and throughput.
- Database indexing:
  - Unique indexes on themes and weekly pulses, and indexes on review_themes and scheduled_jobs improve lookup performance.
- LLM retries:
  - Groq client retries with increasing temperature to improve JSON extraction reliability.
- Word count enforcement:
  - Weekly note generation enforces a strict word limit and regenerates if exceeded.
- CORS optimization:
  - Environment-specific CORS configuration reduces unnecessary preflight requests in production.

**Section sources**
- [assignmentService.ts:21-67](file://phase-2/src/services/assignmentService.ts#L21-L67)
- [db/index.ts:19-88](file://phase-2/src/db/index.ts#L19-L88)
- [groqClient.ts:39-65](file://phase-2/src/services/groqClient.ts#L39-L65)
- [pulseService.ts:134-172](file://phase-2/src/services/pulseService.ts#L134-L172)
- [server.ts:22-29](file://phase-2/src/api/server.ts#L22-L29)

## Troubleshooting Guide
- Authentication and Authorization
  - No authentication middleware is implemented in the server. Treat endpoints as internal-only or protect behind an API gateway in production.
- CORS Configuration
  - Server includes CORS middleware with environment-specific origins. In production, configure FRONTEND_URL environment variable.
- Environment configuration
  - Missing SMTP credentials cause email errors; missing GROQ API key prevents scheduler from starting.
- Parameter validation
  - Date formats, numeric ranges, and email patterns are validated in routes; invalid inputs return 400.
- Error handling
  - Routes wrap handlers in try/catch and log errors; responses include ok:false and error messages.
- PII scrubbing
  - All user-facing text is scrubbed before storage or delivery.

**Section sources**
- [server.ts:22-29](file://phase-2/src/api/server.ts#L22-L29)
- [server.ts:39-331](file://phase-2/src/api/server.ts#L39-L331)
- [emailService.ts:99-102](file://phase-2/src/services/emailService.ts#L99-L102)
- [env.ts:16-21](file://phase-2/src/config/env.ts#L16-L21)
- [groqClient.ts:35-37](file://phase-2/src/services/groqClient.ts#L35-L37)
- [piiScrubber.ts:22-28](file://phase-2/src/services/piiScrubber.ts#L22-L28)

## Conclusion
Phase 2 introduces robust APIs for theme generation, review assignment, weekly pulse creation, user preference management, and automated email delivery. The system leverages LLMs for intelligent content analysis while maintaining strong validation, PII scrubbing, and operational safeguards. The enhanced CORS configuration and comprehensive endpoint coverage make it suitable for production deployment. Production deployments should enforce authentication, configure rate limiting, and monitor LLM usage and email deliverability.

## Appendices

### API Reference

- Dashboard & Statistics
  - GET /api/reviews/stats
    - Response: { ok: boolean; stats: { totalReviews: number; totalThemes: number; weeksCovered: number; lastPulseDate: string|null } }
- Review Management
  - GET /api/reviews
    - Query: { week_start?: string; minRating?: number; maxRating?: number }
    - Response: { ok: boolean; reviews: ReviewRow[] }
  - POST /api/reviews/scrape
    - Response: { ok: boolean; message: string }
  - GET /api/reviews/week/:weekStart
    - Response: { ok: boolean; reviews: ReviewRow[] }
- Theme Management
  - POST /api/themes/generate
    - Body: { weeksBack?: number; limit?: number }
    - Response: { ok: boolean; themes: [{ id: number; name: string; description: string }] }
  - GET /api/themes
    - Query: { limit?: number }
    - Response: { ok: boolean; themes: [...] }
  - POST /api/themes/assign
    - Body: { week_start: string (YYYY-MM-DD) }
    - Response: { ok: boolean; assigned: number; skipped: number; themes: number }
- Pulse Management
  - POST /api/pulses/generate
    - Body: { week_start: string (YYYY-MM-DD) }
    - Response: { ok: boolean; pulse: WeeklyPulse }
  - GET /api/pulses
    - Query: { limit?: number }
    - Response: { ok: boolean; pulses: [WeeklyPulse] }
  - GET /api/pulses/:id
    - Response: { ok: boolean; pulse: WeeklyPulse }
  - POST /api/pulses/:id/send-email
    - Body: { to?: string }
    - Response: { ok: boolean; message: string }
- User Preferences
  - POST /api/user-preferences
    - Body: { email: string; timezone: string; preferred_day_of_week: number; preferred_time: string }
    - Response: { ok: boolean; preferences: UserPrefsRow; confirmation: string }
  - GET /api/user-preferences
    - Response: { ok: boolean; preferences: UserPrefsRow | null }
- Email Testing
  - POST /api/email/test
    - Body: { to: string }
    - Response: { ok: boolean; message: string }

**Section sources**
- [server.ts:39-331](file://phase-2/src/api/server.ts#L39-L331)

### Data Models

```mermaid
erDiagram
THEMES {
integer id PK
string name
string description
string created_at
string valid_from
string valid_to
}
REVIEW_THEMES {
integer id PK
string review_id
integer theme_id FK
float confidence
}
WEEKLY_PULSES {
integer id PK
string week_start
string week_end
text top_themes
text user_quotes
text action_ideas
text note_body
string created_at
integer version
}
USER_PREFERENCES {
integer id PK
string email
string timezone
integer preferred_day_of_week
string preferred_time
string created_at
string updated_at
integer active
}
SCHEDULED_JOBS {
integer id PK
integer user_preference_id FK
string week_start
string scheduled_at_utc
string sent_at_utc
string status
string last_error
}
THEMES ||--o{ REVIEW_THEMES : "has"
USER_PREFERENCES ||--o{ SCHEDULED_JOBS : "generates"
```

**Diagram sources**
- [db/index.ts:7-91](file://phase-2/src/db/index.ts#L7-L91)

### Request/Response Schemas

- ThemeDef
  - name: string (min 2, max 60)
  - description: string (min 5, max 200)
- WeeklyPulse
  - id: number
  - week_start: string (YYYY-MM-DD)
  - week_end: string (YYYY-MM-DD)
  - top_themes: array of ThemeSummary
  - user_quotes: array of Quote
  - action_ideas: array of ActionIdea
  - note_body: string (<= 2000 chars)
  - created_at: string (ISO)
  - version: number
- ThemeSummary
  - theme_id: number
  - name: string
  - description: string
  - review_count: number
  - avg_rating: number
- Quote
  - text: string
  - rating: number
- ActionIdea
  - idea: string (min 5, max 300)
- UserPrefsRow
  - id: number
  - email: string
  - timezone: string
  - preferred_day_of_week: number (0–6)
  - preferred_time: string ("HH:MM")
  - created_at: string (ISO)
  - updated_at: string (ISO)
  - active: number (boolean flag)

**Section sources**
- [themeService.ts:6-13](file://phase-2/src/services/themeService.ts#L6-L13)
- [pulseService.ts:11-38](file://phase-2/src/services/pulseService.ts#L11-L38)
- [userPrefsRepo.ts:3-15](file://phase-2/src/services/userPrefsRepo.ts#L3-L15)

### Example Workflows

- Theme-to-Pulse Assignment
  - Steps:
    1. POST /api/themes/generate (weeksBack, limit)
    2. POST /api/themes/assign (week_start)
    3. POST /api/pulses/generate (week_start)
    4. GET /api/pulses/:id
    5. POST /api/pulses/:id/send-email (to?)
  - Validation:
    - Ensure week_start matches date pattern.
    - Ensure themes exist before generating pulse.
- Automated Scheduling
  - Steps:
    1. POST /api/user-preferences (email, timezone, preferred_day_of_week, preferred_time)
    2. Wait for scheduler tick (every 5 minutes) or trigger runSchedulerOnce manually
    3. Scheduler finds due preferences, generates pulse, sends email, records job
  - Validation:
    - nextSendUtc computes the next send time; listDuePrefs filters eligible preferences.
- Preference-Based Filtering
  - Steps:
    1. GET /api/user-preferences to retrieve active preferences
    2. Use preferences to compute next send time and filter due recipients

**Section sources**
- [server.ts:39-331](file://phase-2/src/api/server.ts#L39-L331)
- [userPrefsRepo.ts:50-94](file://phase-2/src/services/userPrefsRepo.ts#L50-L94)
- [schedulerJob.ts:52-84](file://phase-2/src/jobs/schedulerJob.ts#L52-L84)

### Security, Versioning, and Rate Limiting

- Security
  - No built-in authentication; deploy behind an API gateway or reverse proxy with authentication and TLS termination.
  - Validate and sanitize all inputs; PII scrubbing is applied before storage and delivery.
  - CORS configuration supports environment-specific origins for production deployments.
- API Versioning
  - No versioned route paths are used; consider adding a version prefix (e.g., /v1) in future iterations.
- Rate Limiting
  - Not implemented; consider adding middleware to throttle requests per IP or user.

**Section sources**
- [server.ts:1-349](file://phase-2/src/api/server.ts#L1-L349)
- [env.ts:16-21](file://phase-2/src/config/env.ts#L16-L21)
- [server.ts:22-29](file://phase-2/src/api/server.ts#L22-L29)

### Tests and Validation References
- Pulse generation shape and word count enforcement
- PII scrubber behavior
- User preferences CRUD and active-row semantics
- Assignment persistence and schema allowances
- Review listing with filtering capabilities

**Section sources**
- [pulse.test.ts:17-96](file://phase-2/src/tests/pulse.test.ts#L17-L96)
- [userPrefs.test.ts:50-98](file://phase-2/src/tests/userPrefs.test.ts#L50-L98)
- [assignment.test.ts:57-109](file://phase-2/src/tests/assignment.test.ts#L57-L109)
- [reviewsRepo.ts:4-24](file://phase-2/src/services/reviewsRepo.ts#L4-L24)