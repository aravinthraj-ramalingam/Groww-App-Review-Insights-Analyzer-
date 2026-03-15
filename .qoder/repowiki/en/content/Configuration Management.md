# Configuration Management

<cite>
**Referenced Files in This Document**
- [env.ts](file://phase-2/src/config/env.ts)
- [env.ts](file://phase-1/src/config/env.ts)
- [index.ts](file://phase-2/src/db/index.ts)
- [index.ts](file://phase-1/src/db/index.ts)
- [postgres.ts](file://phase-2/src/db/postgres.ts)
- [dbAdapter.ts](file://phase-2/src/db/dbAdapter.ts)
- [server.ts](file://phase-2/src/api/server.ts)
- [server.ts](file://phase-1/src/api/server.ts)
- [groqClient.ts](file://phase-2/src/services/groqClient.ts)
- [emailService.ts](file://phase-2/src/services/emailService.ts)
- [schedulerJob.ts](file://phase-2/src/jobs/schedulerJob.ts)
- [pulseService.ts](file://phase-2/src/services/pulseService.ts)
- [themeService.ts](file://phase-2/src/services/themeService.ts)
- [reviewsRepo.ts](file://phase-2/src/services/reviewsRepo.ts)
- [logger.ts](file://phase-2/src/core/logger.ts)
- [logger.ts](file://phase-1/src/core/logger.ts)
- [migrateToPostgres.ts](file://phase-2/scripts/migrateToPostgres.ts)
- [package.json](file://phase-2/package.json)
- [package.json](file://phase-3/package.json)
- [vercel.json](file://phase-3/vercel.json)
</cite>

## Update Summary
**Changes Made**
- Upgraded Groq model from llama-3.1-70b-versatile to llama-3.3-70b-versatile
- Added comprehensive PostgreSQL database compatibility alongside SQLite
- Implemented unified database adapter pattern for seamless database switching
- Added migration script for converting from SQLite to PostgreSQL
- Enhanced database configuration with automatic detection of database type

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Database Configuration](#database-configuration)
7. [Dependency Analysis](#dependency-analysis)
8. [Performance Considerations](#performance-considerations)
9. [Troubleshooting Guide](#troubleshooting-guide)
10. [Conclusion](#conclusion)
11. [Appendices](#appendices)

## Introduction
This document describes configuration management for the Groww App Review Insights Analyzer across phases. It covers environment variables, configuration loading patterns, defaults, validation, and security practices. The system now includes enhanced CORS configuration with dynamic origin handling, Node.js version specification for consistent deployments, and Vercel-specific environment configuration for frontend hosting. Most significantly, it now supports both SQLite (development) and PostgreSQL (production) databases with a unified adapter pattern, and includes a migration script for database conversion. The Groq model has been upgraded to llama-3.3-70b-versatile for improved performance and capabilities.

## Project Structure
Configuration is centralized in a dedicated module per phase and consumed by services, APIs, and jobs. Phase 1 focuses on a simple SQLite-backed setup and a basic HTTP server. Phase 2 introduces SMTP, Groq integration, scheduled jobs, rich database schemas, and comprehensive database compatibility. Phase 3 handles frontend deployment with Vercel configuration and Node.js version specification.

```mermaid
graph TB
subgraph "Phase 1"
P1_ENV["config/env.ts (Phase 1)"]
P1_DB["db/index.ts (SQLite)"]
P1_SRV["api/server.ts (Express)"]
end
subgraph "Phase 2"
P2_ENV["config/env.ts (Phase 2)"]
P2_DB["db/index.ts (SQLite/PostgreSQL)"]
P2_PG["db/postgres.ts (PostgreSQL)"]
P2_ADAPTER["db/dbAdapter.ts (Unified Adapter)"]
P2_SRV["api/server.ts (Express)"]
P2_GROQ["services/groqClient.ts"]
P2_EMAIL["services/emailService.ts"]
P2_SCHED["jobs/schedulerJob.ts"]
P2_PULSE["services/pulseService.ts"]
P2_THEME["services/themeService.ts"]
P2_MIGRATE["scripts/migrateToPostgres.ts"]
end
subgraph "Phase 3"
P3_PKG["package.json (Node.js 20.x)"]
P3_VERCEL["vercel.json (Vercel Config)"]
P3_CORS["Enhanced CORS Config"]
end
P1_ENV --> P1_DB
P1_ENV --> P1_SRV
P2_ENV --> P2_DB
P2_DB --> P2_PG
P2_DB --> P2_ADAPTER
P2_ENV --> P2_SRV
P2_ENV --> P2_GROQ
P2_ENV --> P2_EMAIL
P2_ENV --> P2_SCHED
P2_GROQ --> P2_PULSE
P2_GROQ --> P2_THEME
P2_MIGRATE --> P2_PG
P3_PKG --> P3_VERCEL
P3_PKG --> P3_CORS
```

**Diagram sources**
- [env.ts:1-6](file://phase-1/src/config/env.ts#L1-L6)
- [index.ts:1-31](file://phase-1/src/db/index.ts#L1-L31)
- [server.ts:1-50](file://phase-1/src/api/server.ts#L1-L50)
- [env.ts:1-23](file://phase-2/src/config/env.ts#L1-L23)
- [index.ts:1-133](file://phase-2/src/db/index.ts#L1-L133)
- [postgres.ts:1-143](file://phase-2/src/db/postgres.ts#L1-L143)
- [dbAdapter.ts:1-178](file://phase-2/src/db/dbAdapter.ts#L1-L178)
- [server.ts:1-266](file://phase-2/src/api/server.ts#L1-L266)
- [groqClient.ts:1-142](file://phase-2/src/services/groqClient.ts#L1-L142)
- [emailService.ts:1-142](file://phase-2/src/services/emailService.ts#L1-L142)
- [schedulerJob.ts:1-98](file://phase-2/src/jobs/schedulerJob.ts#L1-L98)
- [pulseService.ts:1-200](file://phase-2/src/services/pulseService.ts#L1-L200)
- [themeService.ts:1-68](file://phase-2/src/services/themeService.ts#L1-L68)
- [migrateToPostgres.ts:1-111](file://phase-2/scripts/migrateToPostgres.ts#L1-L111)
- [package.json:24-26](file://phase-3/package.json#L24-L26)
- [vercel.json:1-11](file://phase-3/vercel.json#L1-L11)

**Section sources**
- [env.ts:1-6](file://phase-1/src/config/env.ts#L1-L6)
- [env.ts:1-23](file://phase-2/src/config/env.ts#L1-L23)
- [index.ts:1-31](file://phase-1/src/db/index.ts#L1-L31)
- [index.ts:1-133](file://phase-2/src/db/index.ts#L1-L133)
- [server.ts:1-50](file://phase-1/src/api/server.ts#L1-L50)
- [server.ts:1-266](file://phase-2/src/api/server.ts#L1-L266)
- [package.json:24-26](file://phase-3/package.json#L24-L26)
- [vercel.json:1-11](file://phase-3/vercel.json#L1-L11)

## Core Components
- Environment configuration loader: Loads environment variables and applies defaults.
- Database initialization: Automatically detects and initializes either SQLite or PostgreSQL based on configuration.
- API server: Reads port and logs configuration details at startup.
- Groq client: Uses the upgraded llama-3.3-70b-versatile model for enhanced capabilities.
- Email service: Requires SMTP credentials; validates presence at runtime.
- Scheduler: Starts automatically when Groq API key is present.
- **Enhanced CORS configuration**: Dynamic origin handling for production deployments with Vercel-hosted frontend support.
- **Unified database adapter**: Provides seamless switching between SQLite and PostgreSQL with a single interface.

Key configuration surfaces:
- DATABASE_FILE: Path to SQLite database file (fallback option).
- DATABASE_URL: PostgreSQL connection string (primary option).
- PORT: Server port.
- GROQ_API_KEY: Enables Groq-powered features and scheduler.
- GROQ_MODEL: Upgraded model identifier (llama-3.3-70b-versatile).
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM: Email delivery configuration.
- **FRONTEND_URL**: Dynamic frontend origin for CORS configuration.
- **NODE_ENV**: Environment detection for production vs development CORS settings.

**Section sources**
- [env.ts:7-21](file://phase-2/src/config/env.ts#L7-L21)
- [index.ts:6-19](file://phase-2/src/db/index.ts#L6-L19)
- [server.ts:254-263](file://phase-2/src/api/server.ts#L254-L263)
- [groqClient.ts:4-7](file://phase-2/src/services/groqClient.ts#L4-L7)
- [emailService.ts:99-112](file://phase-2/src/services/emailService.ts#L99-L112)
- [schedulerJob.ts:90-97](file://phase-2/src/jobs/schedulerJob.ts#L90-L97)
- [server.ts:22-35](file://phase-2/src/api/server.ts#L22-L35)

## Architecture Overview
Configuration flows from environment to services and infrastructure components. The Phase 2 environment loader also loads secrets from a project-local dotenv file, enabling local development without leaking secrets into the repository. The enhanced CORS configuration now supports dynamic origins for Vercel-hosted frontend deployments. The database layer now provides automatic detection between SQLite and PostgreSQL, with a unified adapter pattern ensuring seamless switching.

```mermaid
sequenceDiagram
participant Proc as "Process Env"
participant Dotenv as "dotenv (.env)"
participant Cfg as "config/env.ts"
participant DB as "db/index.ts"
participant PG as "db/postgres.ts"
participant Adapter as "db/dbAdapter.ts"
participant API as "api/server.ts"
participant Groq as "services/groqClient.ts"
participant Email as "services/emailService.ts"
Proc->>Dotenv : Load dotenv from repo root
Dotenv-->>Cfg : Expose env vars
Cfg-->>DB : Provide DATABASE_FILE or DATABASE_URL
DB->>DB : Detect database type (SQLite vs PostgreSQL)
DB->>PG : Initialize PostgreSQL if DATABASE_URL present
DB->>Adapter : Create unified database adapter
Adapter-->>API : Provide database operations
Cfg-->>API : Provide PORT
Cfg-->>Groq : Provide GROQ_API_KEY and GROQ_MODEL (upgraded)
Cfg-->>Email : Provide SMTP_* and SMTP_FROM
API->>DB : Initialize database connection
API->>API : Configure enhanced CORS with dynamic origins
API->>Groq : Conditionally start scheduler with llama-3.3-70b-versatile
API->>Email : Validate SMTP presence for send operations
```

**Diagram sources**
- [env.ts:1-23](file://phase-2/src/config/env.ts#L1-L23)
- [index.ts:1-133](file://phase-2/src/db/index.ts#L1-L133)
- [postgres.ts:1-143](file://phase-2/src/db/postgres.ts#L1-L143)
- [dbAdapter.ts:1-178](file://phase-2/src/db/dbAdapter.ts#L1-L178)
- [server.ts:1-266](file://phase-2/src/api/server.ts#L1-L266)
- [groqClient.ts:1-142](file://phase-2/src/services/groqClient.ts#L1-L142)
- [emailService.ts:1-142](file://phase-2/src/services/emailService.ts#L1-L142)

## Detailed Component Analysis

### Environment Configuration Loading
- Phase 1: Minimal configuration with defaults for database file and port.
- Phase 2: Loads dotenv from a project-local path, then exposes DATABASE_FILE, PORT, GROQ_API_KEY, GROQ_MODEL, and SMTP_* variables.

**Updated** The Groq model has been upgraded from llama-3.1-70b-versatile to llama-3.3-70b-versatile for improved performance and capabilities.

Validation and defaults:
- DATABASE_FILE defaults to a SQLite file path.
- PORT defaults to a development port.
- GROQ_API_KEY defaults to empty string; when absent, Groq-dependent features are disabled.
- GROQ_MODEL defaults to llama-3.3-70b-versatile (upgraded from llama-3.1-70b-versatile).
- SMTP_* defaults to empty strings; runtime validation enforces required fields.

Security:
- dotenv is loaded from a specific path to avoid accidental exposure.
- Secrets are only used when required (e.g., scheduler starts only if Groq API key is present).

**Section sources**
- [env.ts:1-6](file://phase-1/src/config/env.ts#L1-L6)
- [env.ts:1-23](file://phase-2/src/config/env.ts#L1-L23)
- [server.ts:254-263](file://phase-2/src/api/server.ts#L254-L263)

### Enhanced CORS Configuration
**Updated** The CORS configuration now includes dynamic origin handling for production deployments:

- **Production Mode**: Uses predefined allowed origins plus any FRONTEND_URL environment variable
- **Development Mode**: Allows all origins (`*`) for local development
- **Credentials Support**: Enabled for authenticated requests
- **Vercel Integration**: Predefined origins for Vercel-hosted frontend deployments

Configuration details:
- Allowed origins include production Vercel domains and any custom FRONTEND_URL
- Dynamic addition of FRONTEND_URL environment variable for custom deployments
- Conditional application based on NODE_ENV environment variable
- Credentials support enabled for session-based authentication

**Section sources**
- [server.ts:22-35](file://phase-2/src/api/server.ts#L22-L35)

### Node.js Version Specification
**Updated** Both phase-2 and phase-3 package.json files now specify Node.js version requirements:

- **Phase 2**: Standard Node.js version specification
- **Phase 3**: Explicit Node.js 20.x specification for Vercel deployment compatibility
- Ensures consistent runtime environments across development and production
- Prevents Node.js version conflicts during deployment

**Section sources**
- [package.json:24-26](file://phase-3/package.json#L24-L26)
- [package.json:1-32](file://phase-2/package.json#L1-L32)

### Vercel-Specific Environment Configuration
**New** Phase 3 introduces comprehensive Vercel configuration:

- **Framework Detection**: Automatically detects Vite framework for React applications
- **Build Commands**: Custom build command configuration for Vite-based React app
- **Output Directory**: Specifies dist folder as build output
- **Install Commands**: Custom npm install command for Vercel deployment
- **Rewrite Rules**: Single-page application routing with index.html fallback
- **Version Control**: Vercel configuration file included in version control

**Section sources**
- [vercel.json:1-11](file://phase-3/vercel.json#L1-L11)

## Database Configuration

### Automatic Database Type Detection
**Updated** The system now automatically detects whether to use SQLite or PostgreSQL based on environment configuration:

- **SQLite Mode**: Used when DATABASE_URL is not set or is empty
- **PostgreSQL Mode**: Used when DATABASE_URL is present and contains a PostgreSQL connection string
- Seamless switching between database types without code changes

### SQLite Configuration (Development)
- Phase 1: Single-table schema for reviews.
- Phase 2: Multi-table schema including themes, review_themes, weekly_pulses, user_preferences, and scheduled_jobs.
- Database file path is configurable via DATABASE_FILE.

### PostgreSQL Configuration (Production)
**New** Comprehensive PostgreSQL support with connection pooling and SSL configuration:

- Connection string format: `postgresql://username:password@host:port/database`
- Automatic SSL configuration with `rejectUnauthorized: false` for Render compatibility
- Connection pooling for improved performance
- Proper error handling and logging

### Unified Database Adapter Pattern
**New** A sophisticated adapter pattern provides seamless switching between database types:

- Single interface for both SQLite and PostgreSQL operations
- Automatic parameter placeholder conversion (SQLite uses `?`, PostgreSQL uses `$1`, `$2`)
- Transaction support for both database types
- Consistent return types across database implementations

### Migration Script
**New** Complete migration tool for converting from SQLite to PostgreSQL:

- Preserves all data from SQLite database
- Creates equivalent PostgreSQL schema
- Handles all table relationships and constraints
- Supports conflict resolution with `ON CONFLICT DO NOTHING`

```mermaid
flowchart TD
Start(["Initialize DB"]) --> CheckCfg["Read DATABASE_URL"]
CheckCfg --> IsPostgres{"DATABASE_URL set?"}
IsPostgres --> |Yes| InitPG["Initialize PostgreSQL Pool"]
IsPostgres --> |No| InitSQLite["Initialize SQLite DB"]
InitPG --> CreateAdapter["Create Unified Adapter"]
InitSQLite --> CreateAdapter
CreateAdapter --> InitSchema["Initialize Appropriate Schema"]
InitSchema --> Ready(["DB Ready"])
```

**Diagram sources**
- [index.ts:6-19](file://phase-2/src/db/index.ts#L6-L19)
- [postgres.ts:6-25](file://phase-2/src/db/postgres.ts#L6-L25)
- [dbAdapter.ts:13-22](file://phase-2/src/db/dbAdapter.ts#L13-L22)

**Section sources**
- [index.ts:1-31](file://phase-1/src/db/index.ts#L1-L31)
- [index.ts:1-133](file://phase-2/src/db/index.ts#L1-L133)
- [postgres.ts:1-143](file://phase-2/src/db/postgres.ts#L1-L143)
- [dbAdapter.ts:1-178](file://phase-2/src/db/dbAdapter.ts#L1-L178)
- [migrateToPostgres.ts:1-111](file://phase-2/scripts/migrateToPostgres.ts#L1-L111)
- [env.ts:9-10](file://phase-2/src/config/env.ts#L9-L10)

### API Server Configuration
- Reads port from configuration and logs it at startup.
- Initializes database schema on startup using the appropriate database type.
- Conditionally starts the scheduler if Groq API key is present.
- **Enhanced CORS configuration** with dynamic origin handling.

Operational notes:
- Port is configurable to avoid conflicts during local development.
- Schema initialization occurs once per process start, using the detected database type.
- CORS configuration adapts to environment (development vs production).

**Section sources**
- [server.ts:45-48](file://phase-1/src/api/server.ts#L45-L48)
- [server.ts:16](file://phase-2/src/api/server.ts#L16)
- [server.ts:254-263](file://phase-2/src/api/server.ts#L254-L263)
- [server.ts:22-35](file://phase-2/src/api/server.ts#L22-L35)

### Groq Client Configuration
**Updated** The Groq client now uses the upgraded llama-3.3-70b-versatile model:

- Enabled only when GROQ_API_KEY is set.
- Uses the upgraded GROQ_MODEL (llama-3.3-70b-versatile) for enhanced capabilities.
- Includes robust retry logic and JSON extraction from LLM responses.

Validation and error handling:
- Throws a clear error if Groq API key is missing.
- Retries on transient failures with increasing temperature.
- Improved JSON parsing with enhanced error reporting.

**Section sources**
- [groqClient.ts:4-7](file://phase-2/src/services/groqClient.ts#L4-L7)
- [groqClient.ts:30-67](file://phase-2/src/services/groqClient.ts#L30-L67)
- [env.ts:13-14](file://phase-2/src/config/env.ts#L13-L14)

### Email Service Configuration
- Validates SMTP_HOST, SMTP_USER, SMTP_PASS at runtime.
- Uses SMTP_PORT to determine secure mode.
- Uses SMTP_FROM for the From header, falling back to SMTP_USER if not set.

Operational notes:
- SMTP credentials are mandatory for sending emails.
- Transport is created per-send operation.

**Section sources**
- [emailService.ts:99-112](file://phase-2/src/services/emailService.ts#L99-L112)
- [emailService.ts:114-129](file://phase-2/src/services/emailService.ts#L114-L129)
- [emailService.ts:132-141](file://phase-2/src/services/emailService.ts#L132-L141)
- [env.ts:16-20](file://phase-2/src/config/env.ts#L16-L20)

### Scheduler Configuration
- Starts automatically if GROQ_API_KEY is present.
- Runs on a fixed interval and processes due user preferences.
- Persists job outcomes in the database.

Operational notes:
- Scheduler is disabled without Groq API key to prevent unintended workloads.
- Job status tracking helps monitor reliability.

**Section sources**
- [server.ts:257-262](file://phase-2/src/api/server.ts#L257-L262)
- [schedulerJob.ts:90-97](file://phase-2/src/jobs/schedulerJob.ts#L90-L97)
- [env.ts:13](file://phase-2/src/config/env.ts#L13)

### Theme and Pulse Generation
- Groq-based theme generation requires GROQ_API_KEY.
- Weekly pulse generation depends on themes and assigned reviews.
- Both components enforce schema validation and sanitization.

**Updated** These components now benefit from the upgraded llama-3.3-70b-versatile model for improved performance.

Operational notes:
- If no themes exist, pulse generation fails early with a clear message.
- Word limits and schema hints ensure consistent outputs.
- Enhanced model capabilities improve quality of generated content.

**Section sources**
- [pulseService.ts:179-188](file://phase-2/src/services/pulseService.ts#L179-L188)
- [themeService.ts:17-37](file://phase-2/src/services/themeService.ts#L17-L37)

## Dependency Analysis
Configuration dependencies across modules with enhanced database support:

```mermaid
graph LR
ENV["config/env.ts"] --> DBIDX["db/index.ts"]
ENV --> SRV["api/server.ts"]
ENV --> GROQ["services/groqClient.ts"]
ENV --> EMAIL["services/emailService.ts"]
DBIDX --> DBPOSTGRES["db/postgres.ts"]
DBIDX --> DBADAPTER["db/dbAdapter.ts"]
DBADAPTER --> REVIEWSREPO["services/reviewsRepo.ts"]
SRV --> SCHED["jobs/schedulerJob.ts"]
GROQ --> PULSE["services/pulseService.ts"]
GROQ --> THEME["services/themeService.ts"]
SRV --> LOG["core/logger.ts"]
DBPOSTGRES --> LOG
EMAIL --> LOG
PKG["package.json (Node.js 20.x)"] --> VERCEL["vercel.json"]
PKG --> CORS["Enhanced CORS Config"]
MIGRATE["scripts/migrateToPostgres.ts"] --> DBPOSTGRES
```

**Diagram sources**
- [env.ts:1-23](file://phase-2/src/config/env.ts#L1-L23)
- [index.ts:1-133](file://phase-2/src/db/index.ts#L1-L133)
- [postgres.ts:1-143](file://phase-2/src/db/postgres.ts#L1-L143)
- [dbAdapter.ts:1-178](file://phase-2/src/db/dbAdapter.ts#L1-L178)
- [reviewsRepo.ts:1-42](file://phase-2/src/services/reviewsRepo.ts#L1-L42)
- [server.ts:1-266](file://phase-2/src/api/server.ts#L1-L266)
- [groqClient.ts:1-142](file://phase-2/src/services/groqClient.ts#L1-L142)
- [emailService.ts:1-142](file://phase-2/src/services/emailService.ts#L1-L142)
- [schedulerJob.ts:1-98](file://phase-2/src/jobs/schedulerJob.ts#L1-L98)
- [pulseService.ts:1-200](file://phase-2/src/services/pulseService.ts#L1-L200)
- [themeService.ts:1-68](file://phase-2/src/services/themeService.ts#L1-L68)
- [logger.ts:1-21](file://phase-2/src/core/logger.ts#L1-L21)
- [migrateToPostgres.ts:1-111](file://phase-2/scripts/migrateToPostgres.ts#L1-L111)
- [package.json:24-26](file://phase-3/package.json#L24-L26)
- [vercel.json:1-11](file://phase-3/vercel.json#L1-L11)

**Section sources**
- [env.ts:1-23](file://phase-2/src/config/env.ts#L1-L23)
- [index.ts:1-133](file://phase-2/src/db/index.ts#L1-L133)
- [postgres.ts:1-143](file://phase-2/src/db/postgres.ts#L1-L143)
- [dbAdapter.ts:1-178](file://phase-2/src/db/dbAdapter.ts#L1-L178)
- [reviewsRepo.ts:1-42](file://phase-2/src/services/reviewsRepo.ts#L1-L42)
- [server.ts:1-266](file://phase-2/src/api/server.ts#L1-L266)
- [groqClient.ts:1-142](file://phase-2/src/services/groqClient.ts#L1-L142)
- [emailService.ts:1-142](file://phase-2/src/services/emailService.ts#L1-L142)
- [schedulerJob.ts:1-98](file://phase-2/src/jobs/schedulerJob.ts#L1-L98)
- [pulseService.ts:1-200](file://phase-2/src/services/pulseService.ts#L1-L200)
- [themeService.ts:1-68](file://phase-2/src/services/themeService.ts#L1-L68)
- [logger.ts:1-21](file://phase-2/src/core/logger.ts#L1-L21)
- [migrateToPostgres.ts:1-111](file://phase-2/scripts/migrateToPostgres.ts#L1-L111)
- [package.json:24-26](file://phase-3/package.json#L24-L26)
- [vercel.json:1-11](file://phase-3/vercel.json#L1-L11)

## Performance Considerations
- Environment loading is synchronous and happens at process start; keep the number of environment reads minimal.
- **PostgreSQL connection pooling** provides significant performance improvements over SQLite for production workloads.
- **Unified adapter pattern** minimizes performance overhead while providing database abstraction.
- **Automatic database detection** eliminates runtime overhead for database selection.
- SQLite is suitable for development and small-scale production; consider connection pooling and indexing strategies for PostgreSQL.
- Email and Groq calls are externalized; tune retry delays and concurrency carefully to avoid rate limits.
- **Enhanced CORS** adds minimal overhead but improves security and reduces preflight requests in production.
- **Node.js version specification** ensures optimal performance and compatibility across environments.
- **Upgraded Groq model** (llama-3.3-70b-versatile) provides better performance and capabilities.

## Troubleshooting Guide
Common configuration issues and resolutions:
- Missing GROQ_API_KEY:
  - Symptom: Scheduler does not start; Groq-dependent routes fail.
  - Resolution: Set GROQ_API_KEY and restart the server.
  - Reference: [server.ts:257-262](file://phase-2/src/api/server.ts#L257-L262), [groqClient.ts:35-37](file://phase-2/src/services/groqClient.ts#L35-L37)

- Missing SMTP credentials:
  - Symptom: Email routes throw errors; test email fails.
  - Resolution: Set SMTP_HOST, SMTP_USER, SMTP_PASS; optionally set SMTP_FROM.
  - Reference: [emailService.ts:100-102](file://phase-2/src/services/emailService.ts#L100-L102)

- **Incorrect database configuration**:
  - Symptom: Database connection fails or schema initialization errors.
  - Resolution: Set DATABASE_URL for PostgreSQL or DATABASE_FILE for SQLite; ensure proper format and permissions.
  - Reference: [env.ts:9-10](file://phase-2/src/config/env.ts#L9-L10), [index.ts:5](file://phase-2/src/db/index.ts#L5)

- **PostgreSQL connection issues**:
  - Symptom: "DATABASE_URL environment variable is required" error.
  - Resolution: Set DATABASE_URL with proper PostgreSQL connection string format.
  - Reference: [postgres.ts:8-11](file://phase-2/src/db/postgres.ts#L8-L11)

- **Database type detection problems**:
  - Symptom: Unexpected database type usage or connection errors.
  - Resolution: Verify DATABASE_URL environment variable is properly set for PostgreSQL mode.
  - Reference: [index.ts:7](file://phase-2/src/db/index.ts#L7)

- Port conflicts:
  - Symptom: Server fails to bind to the configured port.
  - Resolution: Change PORT environment variable.
  - Reference: [env.ts:11](file://phase-2/src/config/env.ts#L11), [server.ts:254-256](file://phase-2/src/api/server.ts#L254-L256)

- **CORS Configuration Issues**:
  - Symptom: Frontend requests blocked in production; "blocked by CORS policy" errors.
  - Resolution: Set FRONTEND_URL environment variable to match your deployed frontend origin.
  - Reference: [server.ts:22-35](file://phase-2/src/api/server.ts#L22-L35)

- **Node.js Version Conflicts**:
  - Symptom: Build failures or runtime errors on Vercel deployment.
  - Resolution: Ensure Node.js version matches package.json engines specification.
  - Reference: [package.json:24-26](file://phase-3/package.json#L24-L26)

- **Vercel Deployment Issues**:
  - Symptom: Frontend not served correctly or build failures.
  - Resolution: Verify vercel.json configuration and build commands.
  - Reference: [vercel.json:1-11](file://phase-3/vercel.json#L1-L11)

- No themes available:
  - Symptom: Pulse generation fails with a "no themes" error.
  - Resolution: Generate themes first via the themes route.
  - Reference: [pulseService.ts:180-183](file://phase-2/src/services/pulseService.ts#L180-L183)

- Logger behavior:
  - Symptom: Unexpected logging output or missing metadata.
  - Resolution: Confirm logger usage and ensure metadata is passed consistently.
  - Reference: [logger.ts:1-21](file://phase-2/src/core/logger.ts#L1-L21), [logger.ts:1-23](file://phase-1/src/core/logger.ts#L1-L23)

- **Database migration issues**:
  - Symptom: Migration script fails or data loss during conversion.
  - Resolution: Ensure SQLite database exists and PostgreSQL connection is accessible; backup data before migration.
  - Reference: [migrateToPostgres.ts:5](file://phase-2/scripts/migrateToPostgres.ts#L5)

- **Adapter pattern issues**:
  - Symptom: Database operations fail or parameter binding errors.
  - Resolution: Verify database type detection and parameter placeholder conversion.
  - Reference: [dbAdapter.ts:28-52](file://phase-2/src/db/dbAdapter.ts#L28-L52)

## Conclusion
Configuration in this project is intentionally minimal and explicit. Phase 2 centralizes environment variables, loads secrets from a dotenv file, and gates sensitive features behind optional credentials. The enhanced CORS configuration now supports dynamic origins for production deployments, while Node.js version specification ensures consistent runtime environments. Vercel-specific configuration enables seamless frontend deployment. **Most significantly, the system now provides comprehensive database compatibility with automatic switching between SQLite and PostgreSQL, along with a unified adapter pattern and migration tools.** The Groq model has been upgraded to llama-3.3-70b-versatile for improved performance and capabilities. Robust validation and logging help maintain reliability and observability.

## Appendices

### Environment Variables Reference
- DATABASE_FILE: Path to SQLite database file. Defaults to a development file path.
- **DATABASE_URL**: PostgreSQL connection string. When set, enables PostgreSQL mode with connection pooling.
- PORT: Server port. Defaults to a development port.
- GROQ_API_KEY: API key for Groq. Required to enable Groq features and scheduler.
- GROQ_MODEL: Upgraded model identifier for Groq requests. Now uses llama-3.3-70b-versatile.
- SMTP_HOST: SMTP server hostname.
- SMTP_PORT: SMTP server port. Defaults to a common port.
- SMTP_USER: SMTP username.
- SMTP_PASS: SMTP password.
- SMTP_FROM: Sender email address; falls back to SMTP_USER if not set.
- **FRONTEND_URL**: Dynamic frontend origin for CORS configuration in production.
- **NODE_ENV**: Environment detection for production vs development CORS settings.

**Section sources**
- [env.ts:7-21](file://phase-2/src/config/env.ts#L7-L21)

### Deployment-Specific Settings
- Local development:
  - Use dotenv to load secrets from the repository root.
  - SQLite database file path is configurable via DATABASE_FILE.
  - CORS allows all origins for development flexibility.
- Production:
  - Prefer environment injection over dotenv.
  - **PostgreSQL mode**: Set DATABASE_URL for production deployment with connection pooling.
  - **SQLite mode**: Use DATABASE_FILE for development or small-scale production.
  - Enable health checks and monitoring around configuration loading.
  - **Enhanced CORS** with dynamic origin handling for production deployments.
  - **Node.js 20.x** specification for consistent runtime environments.
  - **Vercel configuration** for frontend deployment with proper routing.
  - **Unified database adapter** provides seamless database switching.

**Section sources**
- [env.ts:4-5](file://phase-2/src/config/env.ts#L4-L5)
- [package.json:7-11](file://phase-2/package.json#L7-L11)
- [server.ts:22-35](file://phase-2/src/api/server.ts#L22-L35)
- [package.json:24-26](file://phase-3/package.json#L24-L26)
- [vercel.json:1-11](file://phase-3/vercel.json#L1-L11)

### Security Best Practices
- Never commit secrets to version control; use environment injection or secret managers.
- Restrict SMTP_FROM to verified sender domains.
- Rotate API keys regularly and monitor usage.
- Sanitize outputs and logs to avoid leaking sensitive data.
- **Enhanced CORS** configuration prevents unauthorized cross-origin requests in production.
- **Node.js version specification** ensures consistent security patches across environments.
- **PostgreSQL SSL configuration** provides secure connections in production environments.
- **Connection pooling** reduces attack surface and improves security posture.

### Configuration Drift Prevention
- Pin dependency versions and lockfiles.
- Use a centralized configuration loader and avoid ad-hoc environment reads.
- Document environment variables and their defaults in a shared spec.
- Add pre-deploy validation to verify required variables are set.
- **Implement CORS origin validation** to prevent configuration drift in production.
- **Database type validation** to ensure proper database selection.
- **Model version tracking** for Groq configurations.

### Monitoring Configuration Changes
- Log configuration values at startup for auditability.
- Track configuration-related errors and retries.
- Integrate with health endpoints to surface configuration status.
- **Monitor CORS configuration** for unexpected origin violations in production.
- **Track Node.js version compliance** across different deployment environments.
- **Database connection monitoring** for both SQLite and PostgreSQL modes.
- **Groq model version tracking** to ensure consistent model usage.

**Section sources**
- [server.ts:254-256](file://phase-2/src/api/server.ts#L254-L256)
- [logger.ts:1-21](file://phase-2/src/core/logger.ts#L1-L21)
- [server.ts:22-35](file://phase-2/src/api/server.ts#L22-L35)
- [postgres.ts:20-22](file://phase-2/src/db/postgres.ts#L20-L22)
- [dbAdapter.ts:13-22](file://phase-2/src/db/dbAdapter.ts#L13-L22)