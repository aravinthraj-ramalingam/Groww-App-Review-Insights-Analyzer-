# Deployment & Operations

<cite>
**Referenced Files in This Document**
- [phase-1 env](file://phase-1/src/config/env.ts)
- [phase-2 env](file://phase-2/src/config/env.ts)
- [phase-1 server](file://phase-1/src/api/server.ts)
- [phase-2 server](file://phase-2/src/api/server.ts)
- [phase-1 logger](file://phase-1/src/core/logger.ts)
- [phase-2 logger](file://phase-2/src/core/logger.ts)
- [phase-1 db](file://phase-1/src/db/index.ts)
- [phase-2 db](file://phase-2/src/db/index.ts)
- [phase-2 scheduler](file://phase-2/src/jobs/schedulerJob.ts)
- [phase-2 email service](file://phase-2/src/services/emailService.ts)
- [phase-2 pulse service](file://phase-2/src/services/pulseService.ts)
- [phase-2 theme service](file://phase-2/src/services/themeService.ts)
- [phase-2 user prefs repo](file://phase-2/src/services/userPrefsRepo.ts)
- [Dockerfile](file://Dockerfile)
- [docker-compose.yml](file://phase-2/docker-compose.yml)
- [render.yaml](file://phase-2/render.yaml)
- [.dockerignore](file://.dockerignore)
- [phase-2 .dockerignore](file://phase-2/.dockerignore)
- [phase-2 package.json](file://phase-2/package.json)
- [phase-2 assignment.test.ts](file://phase-2/src/tests/assignment.test.ts)
- [phase-2 email.test.ts](file://phase-2/src/tests/email.test.ts)
- [phase-2 pulse.test.ts](file://phase-2/src/tests/pulse.test.ts)
- [phase-2 scheduler.test.ts](file://phase-2/src/tests/scheduler.test.ts)
- [phase-2 schema.test.ts](file://phase-2/src/tests/schema.test.ts)
- [phase-2 userPrefs.test.ts](file://phase-2/src/tests/userPrefs.test.ts)
</cite>

## Update Summary
**Changes Made**
- Updated Docker build configuration from multi-stage to single-stage build optimized for Render deployment
- Moved Dockerfile from phase-2/ to root directory for simplified containerization
- Enhanced build dependencies installation and post-build cleanup process with npm prune --production
- Updated .dockerignore patterns at root level with comprehensive exclusion patterns
- Updated render.yaml to reflect new Dockerfile location and context
- Enhanced health check configuration in both Dockerfile and docker-compose.yml
- Added comprehensive containerization documentation with single-stage build optimization

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Monitoring & Logging](#monitoring--logging)
9. [Environment Setup](#environment-setup)
10. [Containerization & Orchestration](#containerization--orchestration)
11. [Scaling & High Availability](#scaling--high-availability)
12. [Security & Compliance](#security--compliance)
13. [Backup & Recovery](#backup--recovery)
14. [Disaster Recovery Planning](#disaster-recovery-planning)
15. [Maintenance & Scheduling](#maintenance--scheduling)
16. [Testing Framework](#testing-framework)
17. [Troubleshooting Guide](#troubleshooting-guide)
18. [Runbooks](#runbooks)
19. [Conclusion](#conclusion)

## Introduction
This document provides comprehensive deployment and operations guidance for the Groww App Review Insights Analyzer. It covers environment setup across development, staging, and production, containerization and orchestration strategies, monitoring and logging, backup and recovery, scaling and high availability, security and compliance, testing frameworks, and operational runbooks for troubleshooting and maintenance.

## Project Structure
The repository is split into three phases:
- Phase 1: Core scraping, filtering, and SQLite storage with a small HTTP API.
- Phase 2: Enhanced with theming, weekly pulse generation, scheduled email delivery, and persistence of user preferences and scheduled jobs.
- Phase 3: Frontend dashboard application.

Key runtime components:
- HTTP servers for each phase
- SQLite-backed persistence
- Scheduler for automated pulse generation and email delivery
- Email transport via SMTP
- Structured logging
- Comprehensive testing framework using Node.js built-in test runner

```mermaid
graph TB
subgraph "Phase 1"
P1S["HTTP Server<br/>POST/GET /api/reviews/*"]
P1DB["SQLite DB<br/>reviews"]
end
subgraph "Phase 2"
P2S["HTTP Server<br/>/health, /api/themes/*, /api/pulses/*, /api/user-preferences/*, /api/email/test"]
P2DB["SQLite DB<br/>themes, review_themes, weekly_pulses, user_preferences, scheduled_jobs"]
SCH["Scheduler Job<br/>runSchedulerOnce()"]
EMAIL["Email Service<br/>sendPulseEmail(), sendTestEmail()"]
GROQ["Groq Client<br/>groqJson()"]
TESTS["Testing Framework<br/>Node.js built-in test runner"]
end
subgraph "Containerization"
DOCKER["Single-stage Docker Build<br/>Root-level Dockerfile"]
K8S["Kubernetes Deployment<br/>Render YAML"]
COMPOSE["Docker Compose<br/>Local Development"]
end
P1S --> P1DB
P2S --> P2DB
SCH --> P2S
SCH --> EMAIL
P2S --> GROQ
P2S --> P2DB
P2S --> TESTS
DOCKER --> P2S
K8S --> DOCKER
COMPOSE --> DOCKER
```

**Diagram sources**
- [phase-1 server:1-50](file://phase-1/src/api/server.ts#L1-L50)
- [phase-2 server:1-266](file://phase-2/src/api/server.ts#L1-L266)
- [phase-1 db:1-31](file://phase-1/src/db/index.ts#L1-L31)
- [phase-2 db:1-93](file://phase-2/src/db/index.ts#L1-L93)
- [phase-2 scheduler:1-98](file://phase-2/src/jobs/schedulerJob.ts#L1-L98)
- [phase-2 email service:1-142](file://phase-2/src/services/emailService.ts#L1-L142)
- [phase-2 pulse service:1-265](file://phase-2/src/services/pulseService.ts#L1-L265)
- [Dockerfile:1-42](file://Dockerfile#L1-L42)
- [docker-compose.yml:1-34](file://phase-2/docker-compose.yml#L1-L34)
- [render.yaml:1-33](file://phase-2/render.yaml#L1-L33)

**Section sources**
- [phase-1 server:1-50](file://phase-1/src/api/server.ts#L1-L50)
- [phase-2 server:1-266](file://phase-2/src/api/server.ts#L1-L266)
- [phase-1 db:1-31](file://phase-1/src/db/index.ts#L1-L31)
- [phase-2 db:1-93](file://phase-2/src/db/index.ts#L1-L93)

## Core Components
- HTTP Servers
  - Phase 1 exposes scraping and listing endpoints.
  - Phase 2 exposes health, theming, pulse, user preferences, and email test endpoints, plus starts a scheduler when configured.
- Persistence
  - Phase 1: reviews table with week indexing.
  - Phase 2: themes, review_themes, weekly_pulses, user_preferences, scheduled_jobs with appropriate indexes.
- Scheduler
  - Periodic job runner that computes due recipients, generates pulses, sends emails, and records outcomes.
- Email Delivery
  - SMTP-based transport with HTML/text bodies and PII scrubbing.
- LLM Integration
  - Groq client with retries and JSON extraction for structured outputs.
- Logging
  - Console-based logging with INFO/ERROR helpers.
- Testing Framework
  - Comprehensive test suite using Node.js built-in test runner with isolated test files for different components.

**Section sources**
- [phase-1 server:1-50](file://phase-1/src/api/server.ts#L1-L50)
- [phase-2 server:1-266](file://phase-2/src/api/server.ts#L1-L266)
- [phase-1 db:1-31](file://phase-1/src/db/index.ts#L1-L31)
- [phase-2 db:1-93](file://phase-2/src/db/index.ts#L1-L93)
- [phase-2 scheduler:1-98](file://phase-2/src/jobs/schedulerJob.ts#L1-L98)
- [phase-2 email service:1-142](file://phase-2/src/services/emailService.ts#L1-L142)
- [phase-2 pulse service:1-265](file://phase-2/src/services/pulseService.ts#L1-L265)
- [phase-2 theme service:1-68](file://phase-2/src/services/themeService.ts#L1-L68)
- [phase-2 logger:1-21](file://phase-2/src/core/logger.ts#L1-L21)

## Architecture Overview
The system comprises two primary runtime phases with containerized deployment capabilities:
- Phase 1: Standalone API for scraping and storing reviews into SQLite.
- Phase 2: Full-featured API with theming, pulse generation, scheduled emails, and persistence.

```mermaid
sequenceDiagram
participant Client as "Client"
participant P2Server as "Phase 2 Server"
participant Scheduler as "Scheduler"
participant Pulse as "Pulse Service"
participant Email as "Email Service"
participant DB as "SQLite"
Client->>P2Server : POST /api/pulses/generate { week_start }
P2Server->>Pulse : generatePulse(week_start)
Pulse->>DB : read themes, reviews, week stats
Pulse-->>P2Server : WeeklyPulse
P2Server-->>Client : { ok, pulse }
Note over Scheduler,P2Server : On startup (if GROQ_API_KEY present)
Scheduler->>P2Server : runSchedulerOnce()
P2Server->>Pulse : generatePulse(weekStart)
P2Server->>Email : sendPulseEmail(to, pulse)
Email-->>P2Server : { messageId }
P2Server->>DB : update scheduled_jobs
```

**Diagram sources**
- [phase-2 server:76-90](file://phase-2/src/api/server.ts#L76-L90)
- [phase-2 scheduler:52-84](file://phase-2/src/jobs/schedulerJob.ts#L52-L84)
- [phase-2 pulse service:179-241](file://phase-2/src/services/pulseService.ts#L179-L241)
- [phase-2 email service:114-129](file://phase-2/src/services/emailService.ts#L114-L129)
- [phase-2 db:1-93](file://phase-2/src/db/index.ts#L1-L93)

## Detailed Component Analysis

### HTTP API Surface
- Phase 1
  - POST /api/reviews/scrape: triggers scraping and storage.
  - GET /api/reviews/scrape: browser-friendly trigger.
  - GET /api/reviews: lists stored reviews.
- Phase 2
  - GET /health: health check.
  - POST /api/themes/generate: generate and persist themes.
  - GET /api/themes: list latest themes.
  - POST /api/themes/assign: assign reviews to themes for a week.
  - POST /api/pulses/generate: generate weekly pulse for a week.
  - GET /api/pulses: list recent pulses.
  - GET /api/pulses/:id: fetch a pulse.
  - POST /api/pulses/:id/send-email: send a pulse via email.
  - POST /api/user-preferences: set user preferences.
  - GET /api/user-preferences: get active preferences.
  - POST /api/email/test: test SMTP configuration.

Operational notes:
- Validation and error handling are performed at the route level.
- Logging is used for request lifecycle and errors.

**Section sources**
- [phase-1 server:9-43](file://phase-1/src/api/server.ts#L9-L43)
- [phase-2 server:28-232](file://phase-2/src/api/server.ts#L28-L232)

### Persistence Model
- Phase 1
  - reviews: id, platform, rating, title, text, clean_text, created_at, week_start, week_end, raw_payload.
  - Index: idx_reviews_week_start.
- Phase 2
  - themes: id, name, description, created_at, valid_from, valid_to.
  - review_themes: id, review_id, theme_id, confidence.
  - weekly_pulses: id, week_start, week_end, top_themes (JSON), user_quotes (JSON), action_ideas (JSON), note_body, created_at, version.
  - user_preferences: id, email, timezone, preferred_day_of_week, preferred_time, created_at, updated_at, active.
  - scheduled_jobs: id, user_preference_id, week_start, scheduled_at_utc, sent_at_utc, status, last_error.

```mermaid
erDiagram
REVIEWS {
text id PK
text platform
int rating
text title
text text
text clean_text
text created_at
text week_start
text week_end
text raw_payload
}
THEMES {
int id PK
text name
text description
text created_at
text valid_from
text valid_to
}
REVIEW_THEMES {
int id PK
text review_id FK
int theme_id FK
float confidence
}
WEEKLY_PULSES {
int id PK
text week_start
text week_end
text top_themes
text user_quotes
text action_ideas
text note_body
text created_at
int version
}
USER_PREFERENCES {
int id PK
text email
text timezone
int preferred_day_of_week
text preferred_time
text created_at
text updated_at
int active
}
SCHEDULED_JOBS {
int id PK
int user_preference_id FK
text week_start
text scheduled_at_utc
text sent_at_utc
text status
text last_error
}
THEMES ||--o{ REVIEW_THEMES : "has"
REVIEWS ||--o{ REVIEW_THEMES : "assigned_to"
USER_PREFERENCES ||--o{ SCHEDULED_JOBS : "generates"
```

**Diagram sources**
- [phase-1 db:8-26](file://phase-1/src/db/index.ts#L8-L26)
- [phase-2 db:8-88](file://phase-2/src/db/index.ts#L8-L88)

**Section sources**
- [phase-1 db:1-31](file://phase-1/src/db/index.ts#L1-L31)
- [phase-2 db:1-93](file://phase-2/src/db/index.ts#L1-L93)

### Scheduler and Email Automation
- Scheduler
  - Determines last full week (UTC), identifies due preferences, inserts a scheduled job row, generates the pulse, sends email, and updates job status.
  - Starts on server boot if Groq API key is present.
- Email Service
  - Builds HTML/text bodies, scrubs PII, and sends via SMTP transport.
  - Requires SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_PORT, SMTP_FROM.

```mermaid
flowchart TD
Start(["Scheduler Tick"]) --> Due["List due preferences"]
Due --> Loop{"Any due?"}
Loop --> |No| End(["Idle"])
Loop --> |Yes| Prep["Insert scheduled_jobs row"]
Prep --> Gen["generatePulse(weekStart)"]
Gen --> Send["sendPulseEmail(to, pulse)"]
Send --> Update["Update status: sent or failed"]
Update --> Loop
```

**Diagram sources**
- [phase-2 scheduler:52-84](file://phase-2/src/jobs/schedulerJob.ts#L52-L84)
- [phase-2 pulse service:179-241](file://phase-2/src/services/pulseService.ts#L179-L241)
- [phase-2 email service:114-129](file://phase-2/src/services/emailService.ts#L114-L129)

**Section sources**
- [phase-2 scheduler:1-98](file://phase-2/src/jobs/schedulerJob.ts#L1-L98)
- [phase-2 email service:1-142](file://phase-2/src/services/emailService.ts#L1-L142)
- [phase-2 pulse service:1-265](file://phase-2/src/services/pulseService.ts#L1-L265)

### Theming and Pulse Generation
- Theming
  - Generates 3–5 themes from recent reviews using Groq with schema enforcement.
  - Upserts themes with timestamps and optional validity windows.
- Pulse Generation
  - Aggregates theme stats for the week, selects top themes, picks representative quotes, generates action ideas, and writes a concise note.
  - Stores the pulse with versioning and JSON-serialized fields.

**Section sources**
- [phase-2 theme service:1-68](file://phase-2/src/services/themeService.ts#L1-L68)
- [phase-2 pulse service:1-265](file://phase-2/src/services/pulseService.ts#L1-L265)

### Configuration and Environment
- Phase 1
  - DATABASE_FILE, PORT.
- Phase 2
  - DATABASE_FILE, PORT, GROQ_API_KEY, GROQ_MODEL, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.

**Section sources**
- [phase-1 env:1-6](file://phase-1/src/config/env.ts#L1-L6)
- [phase-2 env:1-23](file://phase-2/src/config/env.ts#L1-L23)

## Dependency Analysis
- Runtime dependencies
  - Express for HTTP.
  - better-sqlite3 for local persistence.
  - groq-sdk for LLM integration.
  - nodemailer for SMTP.
  - zod for schema validation.
- Build/test/dev dependencies
  - TypeScript, ts-node, @types packages.
  - Node.js built-in test runner for comprehensive testing.

```mermaid
graph LR
P2Server["phase-2 server"] --> Express["express"]
P2Server --> DB["better-sqlite3"]
P2Server --> Groq["groq-sdk"]
P2Server --> Nodemailer["nodemailer"]
P2Server --> Zod["zod"]
P1Server["phase-1 server"] --> Express
P1Server --> DB
P1Server --> GPS["google-play-scraper"]
TESTS["Node.js Test Runner"] --> P2Server
```

**Diagram sources**
- [phase-1 package.json:13-24](file://phase-1/package.json#L13-L24)
- [phase-2 package.json:13-28](file://phase-2/package.json#L13-L28)

**Section sources**
- [phase-1 package.json:1-26](file://phase-1/package.json#L1-L26)
- [phase-2 package.json:1-30](file://phase-2/package.json#L1-L30)

## Performance Considerations
- Database
  - Use indexes on week_start and scheduled_jobs status/time to optimize lookups.
  - Batch operations for theme upserts reduce transaction overhead.
- I/O Bound Tasks
  - Scraping and LLM calls are external I/O bound; consider timeouts and retries.
- Concurrency
  - Single-threaded Node process; scale horizontally behind a load balancer.
- Caching
  - Consider caching recent themes and pulses if read-heavy.

## Monitoring & Logging
- Logging
  - Console-based INFO/ERROR logs are used across components.
  - Add structured logging (e.g., Bunyan, Winston) and export to centralized systems.
- Metrics
  - Expose Prometheus-compatible metrics endpoint or integrate with APM.
  - Track request latency, error rates, job success/failure, and Groq API timings.
- Alerts
  - Alert on failed scheduled jobs, repeated errors, and health check failures.
- Centralized Logging
  - Ship logs to a log aggregator (e.g., ELK, Loki) with correlation IDs.

## Environment Setup
- Development
  - Install dependencies for the desired phase.
  - Set environment variables for the target phase.
  - Start the server using dev scripts.
- Staging
  - Use a dedicated database file and SMTP credentials.
  - Enable scheduler only when Groq API key is available.
- Production
  - Use immutable images, non-root users, minimal base images.
  - Enforce secrets management and network policies.
  - Configure health checks and readiness probes.

## Containerization & Orchestration

### Single-Stage Docker Build (Optimized for Render)
**Updated** The project now implements a streamlined single-stage Docker build optimized specifically for Render deployment, with the Dockerfile moved to the root directory for simplified containerization:

**Build Process**
- Base Image: node:20-alpine with Python3, make, and g++ for better-sqlite3 compilation
- Enhanced dependency management: Installs all dependencies including devDependencies for build process
- Post-build cleanup: Uses `npm prune --production` to remove devDependencies and reduce image size
- Optimized layer caching with efficient build steps
- Integrated health check for container monitoring
- **Updated**: Now builds from root directory with COPY commands targeting phase-2/ directory

**Production Configuration**
- Environment variables: NODE_ENV=production, PORT=4002, DATABASE_FILE=/app/data/phase1.db
- Health check via HTTP GET to /health endpoint with 30-second intervals
- Data directory creation for SQLite persistence
- Direct execution of compiled TypeScript output from dist/api/server.js

**Root-level Dockerfile Benefits**
- Simplified build context and reduced complexity
- Better integration with Render's deployment pipeline
- Consistent build process across development and production
- Enhanced .dockerignore patterns at root level for comprehensive exclusion

**Section sources**
- [Dockerfile:1-42](file://Dockerfile#L1-L42)

### Docker Compose Configuration
Local development environment with persistent storage and environment variable management:

**Service Configuration**
- Backend service with port mapping 4002:4002
- Persistent volume mounting for SQLite data
- Environment variable injection from .env file
- Health check integration with 30-second intervals
- Enhanced health check configuration with improved timeout settings

**Volume Management**
- Named volume "data" mounted to /app/data
- Automatic volume creation and persistence across container restarts

**Section sources**
- [docker-compose.yml:1-34](file://phase-2/docker-compose.yml#L1-L34)

### Kubernetes Deployment (Render Platform)
**Updated** Production-ready deployment configuration for Render's container platform with enhanced repository integration:

**Platform Configuration**
- Web service type with Docker runtime
- Repository integration with GitHub: https://github.com/aravinthraj-ramalingam/Groww-App-Review-Insights-Analyzer-
- **Updated**: DockerfilePath now points to ./Dockerfile in root directory
- **Updated**: DockerContext now points to ./phase-2 for build context
- Multi-service deployment with single container
- Environment variable management with sync control
- Persistent disk mounting for data persistence

**Resource Management**
- Disk allocation: 1GB persistent volume
- Mount path: /app/data for SQLite database
- Automatic restart policy: unless-stopped
- Enhanced health check configuration

**Section sources**
- [render.yaml:1-33](file://phase-2/render.yaml#L1-L33)

### Container Security and Best Practices
- Single-stage build reduces complexity while maintaining security
- Post-build cleanup removes unnecessary devDependencies
- Non-root user execution recommended
- Minimal base image (alpine linux) with optimized security
- Environment variables for configuration
- Health checks for container monitoring
- Persistent volume for data durability
- **Updated**: Enhanced .dockerignore patterns at root level for comprehensive exclusion

**Section sources**
- [Dockerfile:18-42](file://Dockerfile#L18-L42)
- [.dockerignore:1-14](file://.dockerignore#L1-L14)
- [phase-2 .dockerignore:1-12](file://phase-2/.dockerignore#L1-L12)

## Scaling & High Availability
- Stateless API
  - Keep servers stateless; rely on shared database for state.
- Load Balancing
  - Distribute traffic across pods; sticky sessions not required.
- Replication
  - For write-heavy workloads, consider a clustered database or migration to a managed RDBMS.
- Queue-Based Delivery
  - Offload email sending to a queue/job system for decoupling and reliability.
- Container Scaling
  - Horizontal pod autoscaling based on CPU/memory or custom metrics
  - Rolling updates with readiness/liveness probes
  - Persistent volume claims for stateful containers

## Security & Compliance
- Secrets Management
  - Store API keys and SMTP credentials in a secret manager; mount as environment variables.
- Network Security
  - Restrict inbound/outbound egress; use private networks and VPCs.
- Data Protection
  - Encrypt at rest; enforce access controls on database files.
  - Apply PII scrubbing consistently; avoid logging sensitive data.
- Vulnerability Management
  - Scan container images and dependencies; patch regularly.
- Compliance
  - Align logging retention and data deletion with policy; audit access to secrets.
- Container Security
  - Single-stage builds with post-build cleanup reduce attack surface
  - Non-root user execution recommended
  - Minimal base images with security scanning
  - Environment variable management for secrets
  - **Updated**: Enhanced .dockerignore patterns prevent accidental inclusion of sensitive files

## Backup & Recovery
- Backups
  - Snapshot the SQLite file; automate periodic backups to durable storage.
  - For high availability, replicate the database to a standby.
- Recovery
  - Validate backups; practice restoration drills.
  - Restore to a temporary environment before promoting to production.
- Retention
  - Define retention periods for logs and backups per policy.
- Container Data Persistence
  - Persistent volume snapshots for containerized deployments
  - Volume backup strategies for stateful applications

## Disaster Recovery Planning
- RTO/RPO Targets
  - Define acceptable downtime and data loss windows.
- Failover
  - Automated failover to secondary region; switch DNS or ingress.
- Testing
  - Regular DR tests; include cross-region restore scenarios.
- Containerized DR
  - Multi-region container deployments
  - Volume replication for persistent data
  - Automated failover mechanisms

## Maintenance & Scheduling
- Routine Tasks
  - Dependency updates, image rebuilds, DB maintenance.
- Rotation
  - Rotate secrets periodically; rotate Groq and SMTP credentials.
- Capacity Planning
  - Monitor growth in reviews and pulses; plan storage and compute increases.
- Container Maintenance
  - Regular container image updates and security patches
  - Volume cleanup and optimization
  - Log rotation and cleanup policies

## Testing Framework

### Node.js Built-in Test Runner
The project implements a comprehensive testing framework using Node.js built-in test runner with isolated test files for different components:

**Test Categories**
- Assignment Logic: Review-to-theme assignment with confidence scoring
- Email Generation: HTML and text email body construction with PII handling
- Pulse Generation: Weekly pulse object validation and word count enforcement
- Scheduler Logic: Due date calculation and email dispatch simulation
- User Preferences: CRUD operations with active preference management
- Schema Validation: Zod schema validation testing

**Test Architecture**
- Each component has its own test file for focused testing
- In-memory SQLite databases for isolated test environments
- Stubbing and mocking for external dependencies (Groq API, email services)
- Comprehensive assertion coverage for business logic validation

**Test Execution**
- Built-in Node.js test runner (`node --test`)
- TypeScript compilation before test execution
- Isolated test environments preventing cross-test contamination

**Section sources**
- [phase-2 assignment.test.ts:1-110](file://phase-2/src/tests/assignment.test.ts#L1-L110)
- [phase-2 email.test.ts:1-100](file://phase-2/src/tests/email.test.ts#L1-L100)
- [phase-2 pulse.test.ts:1-97](file://phase-2/src/tests/pulse.test.ts#L1-L97)
- [phase-2 scheduler.test.ts:1-133](file://phase-2/src/tests/scheduler.test.ts#L1-L133)
- [phase-2 userPrefs.test.ts:1-99](file://phase-2/src/tests/userPrefs.test.ts#L1-L99)
- [phase-2 schema.test.ts:1-10](file://phase-2/src/tests/schema.test.ts#L1-L10)

### Test Coverage Areas
- **Assignment Logic**: Validates review-to-theme assignment with confidence scoring and database persistence
- **Email Generation**: Ensures proper HTML/text email construction, PII handling, and content validation
- **Pulse Generation**: Verifies weekly pulse object structure, word count limits, and data integrity
- **Scheduler Logic**: Tests due date calculation, timezone handling, and email dispatch workflows
- **User Preferences**: Confirms CRUD operations, active preference management, and data validation
- **Schema Validation**: Validates Zod schema parsing and type safety

**Section sources**
- [phase-2 assignment.test.ts:57-92](file://phase-2/src/tests/assignment.test.ts#L57-L92)
- [phase-2 email.test.ts:38-72](file://phase-2/src/tests/email.test.ts#L38-L72)
- [phase-2 pulse.test.ts:17-45](file://phase-2/src/tests/pulse.test.ts#L17-L45)
- [phase-2 scheduler.test.ts:36-65](file://phase-2/src/tests/scheduler.test.ts#L36-L65)
- [phase-2 userPrefs.test.ts:50-78](file://phase-2/src/tests/userPrefs.test.ts#L50-L78)

## Troubleshooting Guide
- Health Checks
  - Verify /health responds OK.
- Database Issues
  - Confirm schema initialization and indexes exist.
- Scheduler Not Running
  - Ensure GROQ_API_KEY is set; check logs for initial tick failure.
- Email Failures
  - Validate SMTP credentials; test with /api/email/test; inspect scheduled_jobs statuses.
- LLM Errors
  - Inspect Groq API key and model; review retry logs.
- Container Issues
  - Check Docker health checks; verify environment variables; inspect container logs.
- Testing Failures
  - Run individual test suites; check in-memory database initialization; validate stub implementations.

**Section sources**
- [phase-2 server:22-22](file://phase-2/src/api/server.ts#L22-L22)
- [phase-2 scheduler:90-97](file://phase-2/src/jobs/schedulerJob.ts#L90-L97)
- [phase-2 email service:99-112](file://phase-2/src/services/emailService.ts#L99-L112)
- [phase-2 pulse service:179-188](file://phase-2/src/services/pulseService.ts#L179-L188)

## Runbooks

### Runbook: Start Phase 1
- Steps
  - Set DATABASE_FILE and PORT.
  - Build and start the server.
  - Verify /api/reviews endpoints.
- Expected Outcome
  - Server listens on configured port; scraping endpoint returns results.

**Section sources**
- [phase-1 env:1-6](file://phase-1/src/config/env.ts#L1-L6)
- [phase-1 server:45-48](file://phase-1/src/api/server.ts#L45-L48)

### Runbook: Start Phase 2
- Steps
  - Set DATABASE_FILE, PORT, GROQ_API_KEY, SMTP_*.
  - Initialize schema and start server.
  - Generate themes, assign reviews, generate pulse, send test email.
- Expected Outcome
  - Scheduler starts; scheduled_jobs populated; emails sent.

**Section sources**
- [phase-2 env:7-21](file://phase-2/src/config/env.ts#L7-L21)
- [phase-2 server:15-16](file://phase-2/src/api/server.ts#L15-L16)
- [phase-2 server:254-263](file://phase-2/src/api/server.ts#L254-L263)
- [phase-2 email service:132-141](file://phase-2/src/services/emailService.ts#L132-L141)

### Runbook: Investigate Scheduled Emails
- Steps
  - List due preferences and next send times.
  - Check scheduled_jobs for the week.
  - Regenerate pulse and resend email manually.
- Expected Outcome
  - Identify failed jobs and resolve root cause.

**Section sources**
- [phase-2 user prefs repo:83-94](file://phase-2/src/services/userPrefsRepo.ts#L83-L94)
- [phase-2 scheduler:20-40](file://phase-2/src/jobs/schedulerJob.ts#L20-L40)
- [phase-2 pulse service:179-241](file://phase-2/src/services/pulseService.ts#L179-L241)

### Runbook: Fix SMTP Configuration
- Steps
  - Validate SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM.
  - Send test email.
- Expected Outcome
  - Test email succeeds; scheduled emails resume.

**Section sources**
- [phase-2 email service:99-112](file://phase-2/src/services/emailService.ts#L99-L112)
- [phase-2 email service:132-141](file://phase-2/src/services/emailService.ts#L132-L141)

### Runbook: Recreate Schema
- Steps
  - Stop server.
  - Drop and recreate tables as per schema.
  - Restart server.
- Expected Outcome
  - Fresh schema; reinitialize data as needed.

**Section sources**
- [phase-1 db:7-29](file://phase-1/src/db/index.ts#L7-L29)
- [phase-2 db:7-91](file://phase-2/src/db/index.ts#L7-L91)

### Runbook: Containerized Deployment
- Steps
  - Build Docker image: `docker build -t groww-insights:latest .`
  - Run with Docker Compose: `docker-compose up -d`
  - Verify health check: `curl http://localhost:4002/health`
  - Check container logs: `docker-compose logs backend`
- Expected Outcome
  - Container running with healthy status; application accessible on port 4002

**Section sources**
- [Dockerfile:1-42](file://Dockerfile#L1-L42)
- [docker-compose.yml:1-34](file://phase-2/docker-compose.yml#L1-L34)

### Runbook: Execute Test Suite
- Steps
  - Build the project: `npm run build`
  - Run all tests: `npm test`
  - Run specific test file: `node --test dist/tests/assignment.test.js`
  - Check test coverage and results
- Expected Outcome
  - All tests pass with no failures; comprehensive test coverage achieved

**Section sources**
- [phase-2 package.json:7-12](file://phase-2/package.json#L7-L12)
- [phase-2 assignment.test.ts:1-110](file://phase-2/src/tests/assignment.test.ts#L1-L110)

## Conclusion
This guide outlines a practical, layered approach to deploying and operating the Groww App Review Insights Analyzer with modern containerization practices. The recent optimization to a single-stage Docker build for Render deployment, enhanced dependency management, and improved health check configurations significantly improves deployment reliability and operational efficiency. The move of Dockerfile to the root directory with comprehensive .dockerignore patterns at the root level provides better build context management and security. By implementing comprehensive testing frameworks, production-ready orchestration configurations, and robust containerization strategies, teams can operate reliably across development, staging, and production environments while maintaining strong observability, security, and operational hygiene.