# Project prompts

This is the chronological record of the user-authored project brief, follow-up requests, and the calculator interaction choice used to build Calculator Workspace. The original brief and follow-up requests are reproduced below; Markdown formatting may be normalized by Prettier. Environment metadata, automatically repeated repository context, assistant replies, tool output, and internal agent instructions are excluded.

## 1. Original take-home assignment

<details>
<summary>Full original project brief</summary>

# Full-Stack Calculator — Take-Home Assignment

## Project Overview

I need to build a full-stack calculator application for a technical take-home assignment.

The original requirements are straightforward: a React frontend, a backend microservice (preferably Go), arithmetic operations, proper validation, unit tests, and documentation.

However, I'd like to take the implementation a little further without unnecessarily complicating the architecture.

Instead of building a traditional calculator that only displays the latest result, I want something closer to a lightweight calculation workspace.

Users should be able to create different calculation threads, name them, switch between them, and keep a persistent history of calculations within each thread.

Think of it as a modern calculator with organized calculation sessions.

I want the application to be polished, intuitive, responsive, and maintainable, while keeping the implementation appropriate for a take-home assignment.

**Important: I want you to implement the entire application, not just generate a technical plan.**

There are two architectural requirements I care about from the beginning:

1. **Docker-first development:** Set up and verify the complete containerized development environment before implementing the application features.
2. **Feature-driven execution:** Maintain a `feature-list.json` file in the repository root and use it as the source of truth for implementation progress.

Work autonomously, implement features incrementally, verify your work, and keep the feature tracker updated.

---

# 1. Tech Stack

Use a modern, stable, well-supported stack with widely adopted libraries.

### Frontend

- React with TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Lucide React
- TanStack Query
- React Hook Form and Zod where appropriate
- Vitest
- React Testing Library

Avoid unnecessary state-management libraries.

Keep components reusable and frontend logic straightforward.

### Backend

- Go
- REST API
- Chi router
- SQLite
- `database/sql`
- `shopspring/decimal` or another well-maintained decimal arithmetic library
- Go testing tools
- Testify where appropriate

Keep the calculation engine independent of HTTP handlers and database operations.

### Infrastructure

- Docker
- Docker Compose
- Separate frontend and backend containers
- Multi-stage Dockerfiles where appropriate
- Persistent Docker volume for SQLite
- Environment-based configuration
- Development hot reload
- Container health checks

No paid infrastructure or external services should be necessary.

---

# 2. Docker-First Development — Mandatory

**This is the first technical implementation phase of the project.**

Before implementing calculator logic, thread management, history, or the final UI, I want a fully working containerized development environment.

Do not treat Docker as an optional delivery task.

The complete project should be developed and tested primarily through Docker from the beginning.

## Initial Docker Architecture

Create two application services:

### Backend Service — `api`

- Runs the Go backend.
- Exposes port `8080` for local development.
- Supports automatic rebuilding/restarting during development.
- Reads configuration from environment variables.
- Uses a persistent Docker volume for SQLite data.
- Includes a health endpoint.
- Uses a multi-stage Dockerfile when appropriate.

Use a lightweight and reliable Go development watcher, such as Air, if useful.

### Frontend Service — `web`

- Runs the React/Vite application.
- Exposes port `5173` for local development.
- Supports Vite hot module replacement.
- Uses bind mounts for application source code.
- Keeps container dependencies isolated from the host.
- Communicates with the backend through Docker networking.

Configure Vite to proxy `/api` requests to the Go container.

The browser should communicate through the frontend origin without needing hardcoded Docker service names.

For example:

- Browser: `http://localhost:5173`
- Backend inside Docker network: `http://api:8080`
- Frontend API requests: `/api/v1/...`

The frontend should never hardcode `localhost:8080` throughout the application.

## Docker Compose Requirements

Create a root `compose.yaml`.

It should:

- Define `web` and `api` services.
- Configure appropriate ports.
- Connect the services through a private Docker network.
- Use development bind mounts where needed.
- Preserve SQLite data using a named volume.
- Provide environment variables through configurable values.
- Support frontend HMR.
- Support automatic Go backend rebuilding.
- Include useful health checks.
- Avoid unnecessary privileges.
- Avoid storing secrets directly in Dockerfiles.
- Use `.dockerignore` to keep build contexts clean.

Use service health dependencies where appropriate, without adding unnecessary startup complexity.

SQLite should be stored in a persistent location such as `/data/calculator.db`, backed by a Docker named volume.

Use appropriate database file permissions.

Database initialization must be idempotent.

## Minimal Application Bootstrapping

I understand the containers need applications to run.

During this phase, create only the minimum Go and React scaffolding necessary to verify that the Docker environment works.

For example:

**Go bootstrap**

- Minimal HTTP server
- `/api/v1/health` endpoint
- Basic configuration
- Graceful startup and shutdown

**React bootstrap**

- Basic Vite application
- Simple welcome screen
- Successful API health request through the Vite proxy

Do not implement calculator functionality or the full user interface yet.

The objective of this phase is infrastructure verification, not application development.

## Docker Verification Gate

Before moving to business logic, verify that:

1. `docker compose build` succeeds.
2. `docker compose up` starts both services.
3. The React application is accessible at `http://localhost:5173`.
4. The Go health endpoint responds successfully.
5. Frontend requests reach the backend through the Vite proxy.
6. Frontend hot reload works.
7. Backend automatic rebuilding works.
8. Container logs are readable.
9. The environment survives stopping and restarting containers.
10. Docker configuration is documented.

Once SQLite integration is implemented, additionally verify that data survives container recreation.

Do not confuse container restarts with deleting named Docker volumes.

**Do not start the calculator or thread-management features until the initial Docker verification gate passes.**

If Docker execution is unavailable in your environment, document precisely which checks could not be executed. Do not claim that unverified infrastructure is working.

## Developer Experience

The standard development command should be:

`docker compose up --build`

Developers should not need to install Go or Node.js locally to run the application.

Only Docker and Docker Compose should be necessary for the standard development workflow.

Provide simple commands for running tests inside containers.

Keep the setup straightforward and avoid unnecessary development scripts.

A Makefile can be added if it genuinely improves usability.

## Production Considerations

Use a development-oriented Compose configuration first.

After the application works, optionally provide production build targets that:

- Build the React frontend into static assets.
- Compile the Go backend into a lightweight runtime image.
- Avoid shipping development tooling in runtime images.
- Preserve SQLite data appropriately.
- Serve frontend API requests through an appropriate reverse proxy.

A separate production Compose override is acceptable, but not required.

Do not let production deployment complexity interfere with completing the assignment.

---

# 3. Core Product Experience

## Calculation Threads

Support multiple independent calculation threads.

Users should be able to:

- Create a thread.
- Rename a thread.
- Select an existing thread.
- Delete a thread with confirmation.
- See calculations associated with the selected thread.
- Switch between threads without losing history.
- Continue calculating in an existing thread.

New threads can use "Untitled Thread" as their default name.

Thread names must be stored in SQLite.

Show a useful empty state when no threads exist.

## Calculator

Implement all seven operations.

### Basic Operations

- Addition
- Subtraction
- Multiplication
- Division

### Advanced Operations

- Exponentiation
- Square root
- Percentage

Include familiar calculator interactions:

- Numeric keypad
- Decimal input
- Clear/reset
- Backspace
- Operation selection
- Enter to calculate
- Keyboard support
- Reusing previous results
- Appropriate disabled/loading states

The Go backend must perform every mathematical calculation.

The frontend should handle user input, validation feedback, and presentation, but should not maintain a separate arithmetic engine.

## Calculation History

Every successful calculation should be persisted within its thread.

Each history entry should contain:

- Unique ID
- Thread ID
- Operation
- Original operands
- Human-readable expression
- Result
- Timestamp

Examples:

`25 + 15 = 40`

`40 / 2 = 20`

`20 ^ 2 = 400`

Display calculations in chronological order, with recent results easily accessible.

Users should be able to reuse a previous result.

Do not build a full expression parser or conversational interface. Keep the calculation model structured.

---

# 4. Backend API

I specifically want **one endpoint responsible for all mathematical operations**.

Do not create individual endpoints for addition, subtraction, multiplication, or other arithmetic functions.

## Unified Calculation Endpoint

`POST /api/v1/calculations`

Example request:

```json
{
  "threadId": "valid-thread-uuid",
  "operation": "add",
  "operands": ["12.50", "7.25"]
}
```

Example successful response:

```json
{
  "id": "calculation-uuid",
  "threadId": "valid-thread-uuid",
  "operation": "add",
  "operands": ["12.50", "7.25"],
  "expression": "12.50 + 7.25",
  "result": "19.75",
  "createdAt": "2026-11-12T12:00:00Z"
}
```

The operation must come from an explicit allowlist:

- `add`
- `subtract`
- `multiply`
- `divide`
- `power`
- `sqrt`
- `percent`

Do not accept arbitrary mathematical expressions or executable code.

## Operation Semantics

Implement the following explicit rules:

- Addition: `a + b`
- Subtraction: `a - b`
- Multiplication: `a * b`
- Division: `a / b`
- Exponentiation: `a ^ b`
- Square root: `sqrt(a)`
- Percentage: `a / 100`

Binary operations require exactly two operands.

Square root and percentage require exactly one operand.

Restrict exponentiation to supported integer exponents, such as -20 through 20.

Use an explicitly defined numerical precision policy.

For nonterminating decimal results, use a maximum of 12 decimal places with consistent rounding.

Document supported numeric ranges.

Use decimal strings for operands and results.

Avoid unnecessary floating-point precision problems.

## Thread Endpoints

Implement:

- `GET /api/v1/threads`
- `POST /api/v1/threads`
- `GET /api/v1/threads/{id}`
- `PATCH /api/v1/threads/{id}`
- `DELETE /api/v1/threads/{id}`
- `GET /api/v1/threads/{id}/calculations`

Health endpoint:

- `GET /api/v1/health`

Deleting a thread must also delete its calculation history.

Use consistent HTTP and JSON conventions.

---

# 5. Validation and Security

The API must handle unexpected and malicious input safely.

Use strict server-side validation.

## Request Validation

- Explicit operation allowlist.
- Correct operand count per operation.
- Strict decimal string validation.
- Maximum input length.
- Maximum numerical magnitude.
- Maximum decimal precision.
- Valid UUID format.
- Existing thread validation.
- Thread name trimming and length restrictions.
- Strict JSON decoding.
- Rejection of unknown JSON fields.
- Rejection of trailing JSON content.
- Request body size limits.

Reject:

- `NaN`
- `Infinity`
- Invalid strings
- Arbitrary expressions
- Unsupported numeric formats
- Objects or arrays where strings are expected
- Invalid operation identifiers

## Calculation Edge Cases

Cover:

- Division by zero.
- Square root of negative numbers.
- Zero to a negative exponent.
- Unsupported exponents.
- Invalid operand counts.
- Excessively large values.
- Excessively small values.
- Results outside supported bounds.
- Negative operands.
- Decimal rounding.
- Operations involving zero.

## Security

Never use `eval` or dynamic execution.

Map validated operation identifiers to dedicated calculation functions.

Use parameterized SQL queries.

Never concatenate untrusted data into SQL statements.

Keep CORS restricted to the configured frontend origin when cross-origin access is needed.

Avoid exposing internal errors, stack traces, or database details.

Use sensible HTTP timeouts.

## Error Format

Return consistent machine-readable errors.

Example:

```json
{
  "error": {
    "code": "DIVISION_BY_ZERO",
    "message": "Cannot divide by zero."
  }
}
```

Use appropriate HTTP status codes.

Differentiate malformed JSON, validation failures, missing resources, and unexpected server errors.

---

# 6. Backend Architecture

Use a clean, straightforward structure.

Suggested organization:

```text
apps/api/
  cmd/api/
  internal/
    calculator/
    config/
    handlers/
    models/
    repository/
    validation/
  migrations/
  Dockerfile
  .air.toml
  go.mod
```

Adjust if a simpler structure makes more sense.

Keep these responsibilities separated:

- HTTP request handling
- Input validation
- Calculation business logic
- Database operations
- Configuration

The calculation service must be unit-testable without starting an HTTP server.

Use SQLite for persistent threads and calculation history.

Implement a straightforward schema migration or initialization strategy.

Use context propagation and graceful shutdown.

Avoid unnecessary interfaces, dependency injection frameworks, or excessive abstraction.

---

# 7. Frontend Design

I want a modern application, not a basic tutorial calculator.

Use Tailwind CSS, shadcn/ui, and Lucide React.

Prefer:

- Clean typography
- Neutral colors
- Consistent spacing
- Subtle borders
- Rounded components
- Minimal visual noise
- Accessible interactions

## Desktop

Use a two-column layout.

**Sidebar**

- Application name
- New thread action
- Existing thread list
- Selected thread indicator
- Thread rename/delete actions

**Main workspace**

- Selected thread title
- Calculator display
- Calculator keypad
- Calculation history
- Result reuse
- Loading/error feedback

The calculator should remain the primary visual focus.

## Mobile

Use responsive layouts.

Collapse the sidebar into a drawer or mobile-friendly navigation.

Keep the keypad comfortable for touch interactions.

Avoid unnecessary horizontal scrolling.

## UX Requirements

- Accessible labels
- Keyboard navigation
- Visible focus states
- Semantic HTML
- Error feedback
- Loading states
- Empty states
- Delete confirmations
- Disabled states
- Prevention of duplicate submissions
- Clear distinction between input and result

Use TanStack Query for backend requests and mutations.

Keep API integration in a dedicated client layer.

Use TypeScript types consistently.

Avoid unnecessary global state.

---

# 8. Testing

Testing is mandatory.

Run checks primarily through the containerized environment.

## Backend Unit Tests

Use table-driven Go tests.

Cover:

- All seven mathematical operations
- Negative numbers
- Zero values
- Decimal arithmetic
- Precision and rounding
- Invalid operands
- Division by zero
- Invalid exponents
- Numerical boundaries

## Backend Integration Tests

Use `httptest` and a temporary SQLite database.

Test:

- Thread CRUD
- Calculation persistence
- Thread isolation
- History retrieval
- Thread deletion cascading to history
- Invalid JSON
- Unknown fields
- Invalid UUIDs
- Invalid operations
- Oversized requests
- Proper HTTP status codes

## Frontend Tests

Use Vitest and React Testing Library.

Cover:

- Numeric input
- Operation selection
- Calculation submission
- Result display
- Error handling
- Thread creation
- Thread switching
- Thread renaming
- Thread deletion
- History rendering
- Result reuse
- Keyboard interaction

Mock backend responses where appropriate.

Focus on user-visible behavior.

## Quality Checks

Before completion, verify:

- Docker builds
- Docker Compose startup
- Go tests
- Frontend tests
- TypeScript type checking
- Linting
- Frontend production build
- Frontend/backend integration
- SQLite persistence
- Responsive behavior

Do not mark failed checks as successful.

---

# 9. Repository Structure

Prefer a monorepo organized like this:

```text
calculator-workspace/
├── apps/
│   ├── api/
│   │   ├── cmd/
│   │   ├── internal/
│   │   ├── migrations/
│   │   ├── Dockerfile
│   │   ├── .dockerignore
│   │   ├── .air.toml
│   │   ├── go.mod
│   │   └── go.sum
│   │
│   └── web/
│       ├── src/
│       ├── public/
│       ├── Dockerfile
│       ├── .dockerignore
│       ├── package.json
│       └── vite.config.ts
│
├── compose.yaml
├── .env.example
├── .gitignore
├── README.md
├── AGENTS.md
└── feature-list.json
```

Adapt the structure if necessary, but preserve clear frontend/backend boundaries.

---

# 10. Mandatory Feature Tracking

Before implementing the infrastructure or application features, create:

`feature-list.json`

This file must live in the repository root.

**Use it as the single source of truth for implementation status.**

It must be created before feature implementation begins.

## JSON Structure

Include:

- `project`
- `schemaVersion`
- `updatedAt`
- `features`

Each feature must contain:

- `id`
- `title`
- `phase`
- `priority`
- `status`
- `dependencies`
- `acceptanceCriteria`
- `verification`
- `notes`

Allowed statuses:

- `not_started`
- `in_progress`
- `completed`
- `blocked`

Use valid, consistently formatted JSON.

## Feature Inventory

Initialize the tracker with at least these features.

### Phase 1 — Docker and Infrastructure

- F001: Repository initialization, feature tracker, and agent instructions
- F002: Docker Compose configuration
- F003: Go backend Dockerfile and minimal bootstrap
- F004: React frontend Dockerfile and minimal bootstrap
- F005: Container networking and Vite API proxy
- F006: Development hot reload for both services
- F007: Environment configuration and Docker volume setup
- F008: Health checks and Docker verification gate

**Phase 1 must be verified before beginning application business logic.**

### Phase 2 — Backend Foundation

- F009: Go backend architecture and configuration
- F010: SQLite schema and migrations
- F011: Thread models and repository
- F012: Thread management API
- F013: Centralized request validation

### Phase 3 — Calculator Backend

- F014: Basic arithmetic calculation engine
- F015: Advanced arithmetic calculation engine
- F016: Unified calculation endpoint
- F017: Calculation history persistence and retrieval
- F018: Error handling and numerical edge cases

### Phase 4 — Frontend

- F019: Tailwind and shadcn/ui setup
- F020: Responsive application layout
- F021: Calculator display and keypad
- F022: Backend API client and TanStack Query integration
- F023: Thread management interface
- F024: Calculation history interface
- F025: Result reuse and keyboard interactions
- F026: Loading, empty, validation, and error states

### Phase 5 — Testing and Verification

- F027: Backend calculation unit tests
- F028: Backend API and persistence integration tests
- F029: Frontend component and interaction tests
- F030: Docker-based integration and persistence checks
- F031: Accessibility, responsive, lint, type-check, and build verification

### Phase 6 — Delivery

- F032: README and API documentation
- F033: Docker development instructions and environment examples
- F034: Optional production-oriented container builds
- F035: Final cleanup and complete verification

If an existing tracker is already present, preserve its stable IDs and reconcile this plan instead of resetting previous work.

You may split tasks into smaller features when necessary.

Define dependencies accurately.

In particular, backend and frontend feature implementation must depend on completing the Docker infrastructure gate.

## Feature Execution Rules

For every feature:

1. Read `feature-list.json`.
2. Identify the next eligible incomplete feature.
3. Confirm its dependencies are complete.
4. Set its status to `in_progress`.
5. Implement the feature.
6. Execute the relevant verification checks.
7. Update its verification information.
8. Mark it `completed` only when its acceptance criteria pass.
9. If blocked, document the reason and what is required to unblock it.
10. Update `updatedAt`.

Never mark a feature completed just because code was written.

Keep the JSON valid.

Never erase unfinished work.

## Recovery and Continuation

When resuming work:

- Read `feature-list.json` first.
- Inspect the repository.
- Check previously completed features.
- Identify the next eligible feature.
- Continue from that point.

Do not reset or reimplement working features unnecessarily.

Create a root `AGENTS.md` explaining that future coding agents must follow this process.

It should explicitly state:

- Docker-first execution.
- Feature tracker as source of truth.
- Dependency-aware implementation.
- Verification before completion.
- No skipping the Docker gate.
- No falsely reporting completed checks.

---

# 11. Required Implementation Sequence

I want you to follow this execution order.

## Step 0 — Inspect and Plan

Inspect the repository.

Create:

- `feature-list.json`
- `AGENTS.md`
- Initial repository structure

Establish dependencies and acceptance criteria.

Do not stop after planning.

## Step 1 — Docker Infrastructure

This is the first actual development phase.

Create the Docker configuration.

Initialize minimal frontend and backend applications only to support infrastructure verification.

Configure:

- Docker Compose
- Both Dockerfiles
- Docker networking
- Environment variables
- Persistent storage
- HMR
- Backend watcher
- Vite proxy
- Health checks

Verify that both applications run inside Docker.

Execute the Docker verification gate.

Update `feature-list.json`.

**Do not move forward until the initial Docker setup has been verified, or a genuine environment limitation has been clearly documented as a blocker. Do not bypass an unresolved blocker to claim completion.**

## Step 2 — Backend Foundation

Develop the Go backend architecture.

Implement:

- Configuration
- SQLite integration
- Migrations
- Domain models
- Thread repository
- Thread API
- Validation

Use the existing Docker environment for implementation and testing.

## Step 3 — Calculator Engine

Implement the mathematical operations.

Create the unified calculation endpoint.

Persist calculation results in SQLite.

Implement error handling and important edge cases.

Add backend tests as each feature is completed.

## Step 4 — Frontend Application

Install and configure:

- Tailwind CSS
- shadcn/ui
- TanStack Query
- Lucide React
- Testing tools

Build the responsive layout.

Implement:

- Calculator interface
- Thread sidebar
- Thread management
- API integration
- Calculation history
- Result reuse
- Keyboard support
- All necessary UI states

Continue using Docker throughout development.

## Step 5 — Testing and Integration

Run frontend and backend tests.

Verify API integration.

Verify SQLite persistence across container recreation.

Check that the frontend uses the backend for every calculation.

Perform responsive and accessibility reviews.

Fix issues rather than ignoring them.

## Step 6 — Documentation

Complete the README.

Document:

- Architecture
- Docker setup
- Environment variables
- Development workflow
- Test commands
- API usage
- Supported mathematical operations
- Numerical limitations
- Security and validation decisions
- Architectural rationale

Explain that authentication is intentionally outside the scope of this local take-home assignment.

Mention what would need to change before exposing the application as a public multi-user service.

## Step 7 — Final Verification

Run the complete verification suite.

Confirm that:

- Docker Compose works.
- Frontend and backend start successfully.
- All operations work.
- The unified API is used.
- Threads are persistent.
- History is isolated correctly.
- Input validation works.
- Tests pass.
- Production builds succeed.
- Documentation is accurate.
- Feature statuses reflect verified results.

Update `feature-list.json` with the final state.

---

# 12. Engineering Preferences

Follow these guidelines throughout the implementation.

**Docker is the default development environment.**

Avoid relying on locally installed Go or Node.js tools for the normal workflow.

**Keep the architecture simple.**

This is a take-home test, not an enterprise system.

**Write maintainable code.**

Prefer small functions, clear naming, explicit contracts, and predictable behavior.

**Use TypeScript properly.**

Avoid unnecessary `any` types.

**Keep business logic independent.**

Calculation functions should not depend on HTTP or database implementations.

**Keep the backend authoritative.**

Frontend validation is for UX, not security.

**Use established libraries when appropriate.**

Avoid reinventing functionality that stable libraries already provide.

**Avoid overengineering.**

No authentication, microservice orchestration platforms, message queues, or unnecessary abstractions.

**Don't hide incomplete work.**

Report failures, blockers, and limitations accurately.

**Focus on delivering a working application.**

I value correctness, clean architecture, testing, and execution more than excessive complexity.

---

# 13. Definition of Done

The assignment is complete when:

- Docker is configured and verified.
- The frontend and backend run together through Docker Compose.
- Development hot reload works.
- The frontend communicates with the Go backend.
- All seven mathematical operations work.
- Every calculation uses the unified calculation endpoint.
- Threads can be created, selected, renamed, and deleted.
- Calculation history is persisted.
- History belongs to the correct thread.
- Data survives application and container restarts.
- Validation and numerical edge cases are handled correctly.
- The UI is responsive and accessible.
- Backend tests pass.
- Frontend tests pass.
- TypeScript and build checks pass.
- The README explains how to run everything.
- `feature-list.json` is accurate and reflects verified implementation status.

At the end, provide a concise summary covering:

1. Implemented features.
2. Architecture and important decisions.
3. Docker commands.
4. How to access the application.
5. How to execute tests.
6. Remaining limitations, if any.
7. Final feature tracker status.

## Final Instruction

**Start with Docker, not with calculator functionality.**

First create the feature tracker and the minimum repository scaffolding, then set up and verify the containerized development environment.

Once Docker works, build the backend and frontend incrementally using that environment.

Use `feature-list.json` to decide what to work on next.

Verify each feature before marking it completed.

Don't stop at planning, scaffolding, or partial implementation.

Make reasonable technical decisions without asking for confirmation on every small detail.

I want a clean, polished, testable, fully working take-home submission that demonstrates solid frontend development, backend architecture, API design, validation, Docker proficiency, and good engineering practices.

</details>

## 2. Calculator interaction choice

This was a structured user response during planning, rather than a free-text prompt.

- Question: Which calculator interaction should the workspace use?
- Selected answer: **Classic keypad (Recommended)**
- Selected option description: One active display: enter a number, select an operation, enter the next number, then press Enter or equals; history stays alongside it.

## 3. Begin implementation

> Implement the plan.

## 4. User-provided repository instructions

The user supplied the following `AGENTS.md` instructions before requesting per-feature commits. The source wrapper identified them as instructions for this repository; the machine-specific path is omitted here.

```markdown
# Working on Calculator Workspace

- Read `feature-list.json` first when starting or resuming work. Preserve stable IDs and unfinished work; inspect existing code before changing it.
- The tracker is the single source of truth. Choose an eligible feature, verify dependencies, set `in_progress`, implement, run acceptance checks, record evidence and update UTC `updatedAt`. Mark `completed` only after acceptance criteria pass. Record blockers precisely.
- Docker is the default development and testing environment. Developers need only Docker and Docker Compose.
- F008 is a mandatory Docker verification gate. Until build, startup, direct/proxied health, frontend HMR, backend rebuild, logs and restart checks pass, implement only minimum application bootstraps. Never skip this gate or develop business logic behind an unresolved blocker.
- Never report checks that did not run as passing. Preserve failed/unavailable checks and limitations in the tracker and documentation.
- Keep arithmetic independent of HTTP/storage. Every mathematical operation runs on the Go backend through the unified calculation endpoint; never add a browser arithmetic engine.
- Keep decimal operands/results as strings, validate server-side, use parameterized SQL, and keep changes small and testable.
- Do not delete named Docker volumes as part of routine verification. Container recreation and data deletion are different operations.
```

The current maintained version is [AGENTS.md](AGENTS.md), which also includes the subsequent commit and formatting requirements.

## 5. Commit each completed feature

> For each feature done, is a commit please, write down in the AGENTS.md, resume the work please.

## 6. Add formatting and a pre-commit hook

> I don't like the formatting the files are having, add a new task to add a prettier and a pre-commit hook to run prettier

## 7. Report and fix new-thread history

> For new threads I have this issue: The requested endpoint does not exist.
>
> It doesn't show the history, can u check and add the bug in the features-list and fix it?

## 8. Required README content

> Make sure your README includes:
> Setup instructions
> How to run the frontend and backend
> Examples of API calls (if using REST)
> Design decisions or assumptions

## 9. Create the GitHub repository

> Excellent, now let's create a repo with this, the gh cli is installed with manuhazen, should work

## 10. Preserve the project prompts

> Another thing, can we add all the prompts used in this project? In a PROMPTS.md file? Also reference in the README.md
