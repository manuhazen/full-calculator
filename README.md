# Calculator Workspace

A full-stack calculator with named calculation threads and persistent, reusable history. React handles input and presentation; every mathematical operation runs in Go through one REST endpoint. SQLite keeps successful calculations with their thread.

## Setup instructions

Install Docker with Docker Compose v2. Docker Desktop on Windows/macOS must use **Linux containers**. No host Go, Node.js, database, paid infrastructure, or external service is needed to run the application.

Clone/download the repository and open a terminal in its root. Environment defaults work immediately; `.env.example` lists optional overrides. Git is needed only for source-control workflows such as cloning and enabling the formatting hook.

## Run the frontend and backend

Start both services together:

```sh
docker compose up --build
```

- Application: **http://localhost:5173**
- API health through the application origin: http://localhost:5173/api/v1/health
- Direct API health for development: http://localhost:8080/api/v1/health

The `web` service runs Vite and the `api` service runs Go under Air. The browser calls relative `/api/v1/...` URLs. Vite proxies them to `http://api:8080` inside the Compose network; Docker service names never appear in browser API requests.

Useful commands, run from the repository root:

```sh
docker compose up -d --build --wait
docker compose ps
docker compose logs -f api web
docker compose stop
docker compose start
docker compose down
```

`up` starts both services and waits for API health before starting the frontend. The first build downloads dependencies; subsequent starts reuse container dependency/cache volumes. Both services run as nonroot users. Stopping or recreating containers preserves the SQLite named volume. **`docker compose down -v` deletes named volumes, including saved calculations**; it is not part of normal development or verification.

## Environment and Docker development workflow

All values have defaults. To customize them, copy `.env.example` to `.env` and edit the values. `.env` is ignored by Git; no application secrets are required.

| Variable           | Default                 | Purpose                                                                                    |
| ------------------ | ----------------------- | ------------------------------------------------------------------------------------------ |
| `WEB_PORT`         | `5173`                  | Host port for the application origin                                                       |
| `API_PORT`         | `8080`                  | Host port for direct development API access                                                |
| `API_ADDR`         | `:8080`                 | Go listener inside the API container; keep `:8080` with the supplied Compose configuration |
| `DATABASE_PATH`    | `/data/calculator.db`   | SQLite file; keep it under `/data` to use the persistent volume                            |
| `API_PROXY_TARGET` | `http://api:8080`       | Vite's server-side proxy target, never a browser API base URL                              |
| `WATCH_POLLING`    | `true`                  | Vite file polling; set `false` on filesystems with reliable native watch events            |
| `FRONTEND_ORIGIN`  | `http://localhost:5173` | Exact allowed browser origin when optional CORS is enabled                                 |
| `ENABLE_CORS`      | `false`                 | Enable origin-restricted direct cross-origin API requests only when needed                 |

Changing a host port does not change the internal container port. If `WEB_PORT` changes, open that new application URL and update `FRONTEND_ORIGIN` when using CORS. Changing the internal Go listener additionally requires coordinated proxy, published-port, and health-check changes. The normal frontend-origin workflow needs no CORS.

Source directories are bind-mounted. Vite provides frontend HMR; Air rebuilds Go after changes to `.go`, `.sql`, `go.mod`, or `go.sum`. Air uses polling, a debounce/unchanged-file filter, and a shutdown grace period so rapid edits replace the running binary cleanly. Windows/WSL polling is intentional. Dependency/cache volumes keep host and container installations separate:

- `sqlite_data` → `/data`: saved names and calculation history, owned by API UID/GID `10001`.
- `web_dependencies` → frontend `node_modules`: isolated JavaScript dependencies.
- `go_modules` and `go_build`: reusable Go module and compilation caches.

Apply dependency, Dockerfile, or environment changes with `docker compose up -d --build --wait`. Ordinary source edits need no manual container restart. For an interrupted Vite configuration/entry-module change, `docker compose restart web` clears its module graph. Check `docker compose logs -f api` for the latest successful API startup after Go edits.

Use tools inside containers for dependency maintenance. On bind mounts where a root-created lockfile prevents an npm update, these commands update packages and then restore nonroot ownership of dependency/cache directories:

```sh
docker compose exec --user root web npm install
docker compose exec --user root web chown -R node:node /app/node_modules /home/node/.npm
```

The application still runs as the nonroot `node` user. Do not replace the normal workflow with a host Node installation.

### Troubleshooting

- If a host port is already occupied, change `WEB_PORT` or `API_PORT` in `.env` and recreate the services.
- If the page reports a connection error, check `docker compose ps` and `docker compose logs api web`. The API must be healthy before the frontend proxy can succeed.
- If edits are not reflected on Windows/WSL, keep `WATCH_POLLING=true` and inspect Air/Vite logs. Restart/rebuild after changing watcher configuration itself.
- Recreating containers preserves data; deleting the named volume does not. Keep the same Compose project name when switching development/production so both configurations use `calculator-workspace_sqlite_data`.

## Using the workspace

Create a thread, optionally rename it, and enter numbers with the keypad or keyboard. Select an operation, enter its second operand, and press **Enter** or **=**. Square root and percentage operate immediately on the current value when no binary operation is pending.

- Threads keep independent histories. Rename actions trim whitespace; deletion requires confirmation and removes that thread's history.
- History is chronological. **Latest** jumps to the recent results; **Use this result** loads a value into the current operand without calculating.
- Selecting another binary operation after entering both operands submits the preceding calculation and chains its returned result. Chaining is **left to right**: `2 + 3`, then `× 4`, produces `20`. There is no expression parser or operator-precedence evaluator.
- Repeating equals without a new operation does nothing. Typing after a result starts fresh; selecting an operation continues from that result. **Change sign** edits its sign as a decimal string.
- A request disables calculator input to prevent duplicates. Thread switching remains available, and a late response updates only its originating thread.
- Draft input survives switching threads in the current page. The selected thread is remembered in local storage. Saved threads/history survive page reloads; unfinished drafts reset on reload.

| Keyboard                | Action                   |
| ----------------------- | ------------------------ |
| `0`–`9`, `.`            | Number and decimal input |
| `+`, `-`, `*`, `/`, `^` | Binary operations        |
| `R`, `%`                | Square root, percentage  |
| `Enter`, `=`            | Calculate                |
| `Backspace`, `Esc`      | Remove a digit, clear    |

Shortcuts pause in forms, dialogs, editable text, and controls outside the keypad. Browser modifier shortcuts remain available. The mobile thread list opens in a focus-managed drawer.

## REST API examples

All routes use `/api/v1`. POST/PATCH bodies require `Content-Type: application/json`. Operands and results are **JSON strings**, never JSON numbers.

| Method | Path                         | Request / successful response                              |
| ------ | ---------------------------- | ---------------------------------------------------------- |
| GET    | `/health`                    | `200` readiness JSON; `503` if the database is unavailable |
| GET    | `/threads`                   | `200` array, most recently active first                    |
| POST   | `/threads`                   | `{}` or `{"name":"Budget"}` → `201` thread                 |
| GET    | `/threads/{id}`              | `200` thread                                               |
| PATCH  | `/threads/{id}`              | `{"name":"Renamed"}` → `200` thread                        |
| DELETE | `/threads/{id}`              | `204`, no response body; history is deleted too            |
| GET    | `/threads/{id}/calculations` | `200` chronological array                                  |
| POST   | `/calculations`              | Structured operation request → `201` saved calculation     |

Lists return `[]` when empty. Missing threads return `404`. Thread IDs use canonical UUID format. Names contain 1–80 Unicode codepoints after trimming; omitting the name during creation uses `Untitled Thread`. Thread responses contain `id`, `name`, `createdAt`, and `updatedAt`. Timestamps use UTC RFC3339.

These one-line `curl` examples use the frontend proxy origin. In Windows PowerShell, use `curl.exe` if `curl` is aliased to a PowerShell command.

```sh
curl http://localhost:5173/api/v1/health
curl -X POST http://localhost:5173/api/v1/threads -H 'Content-Type: application/json' -d '{"name":"Budget"}'
```

Copy the returned thread `id` into `threadId` for the next request:

```sh
curl -X POST http://localhost:5173/api/v1/calculations -H 'Content-Type: application/json' -d '{"threadId":"REPLACE_WITH_CREATED_UUID","operation":"add","operands":["12.50","7.25"]}'
```

Example successful response (IDs and timestamp vary):

```json
{
  "id": "70fedcc3-d2b2-4ca6-9cf9-5ec6a34d6e4d",
  "threadId": "550e8400-e29b-41d4-a716-446655440000",
  "operation": "add",
  "operands": ["12.50", "7.25"],
  "expression": "12.50 + 7.25",
  "result": "19.75",
  "createdAt": "2026-11-12T12:00:00Z"
}
```

PowerShell also supports an end-to-end example without copying an ID:

```powershell
$thread = Invoke-RestMethod -Method Post -Uri http://localhost:5173/api/v1/threads -ContentType 'application/json' -Body '{"name":"Budget"}'
$body = @{ threadId = $thread.id; operation = 'add'; operands = @('12.50', '7.25') } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:5173/api/v1/calculations -ContentType 'application/json' -Body $body
Invoke-RestMethod -Uri "http://localhost:5173/api/v1/threads/$($thread.id)/calculations"
```

There are no individual arithmetic endpoints. Every operation uses `POST /calculations`:

| Operation  | Operands | Meaning                   | Example result                    |
| ---------- | -------- | ------------------------- | --------------------------------- |
| `add`      | `[a, b]` | `a + b`                   | `["12.50", "7.25"]` → `"19.75"`   |
| `subtract` | `[a, b]` | `a - b`                   | `["10", "3"]` → `"7"`             |
| `multiply` | `[a, b]` | `a * b`                   | `["2.5", "4"]` → `"10"`           |
| `divide`   | `[a, b]` | `a / b`                   | `["1", "3"]` → `"0.333333333333"` |
| `power`    | `[a, b]` | `a ^ b`, integer exponent | `["2", "-3"]` → `"0.125"`         |
| `sqrt`     | `[a]`    | `sqrt(a)`                 | `["2"]` → `"1.414213562373"`      |
| `percent`  | `[a]`    | `a / 100`                 | `["25"]` → `"0.25"`               |

Percentage is unary conversion to a fraction, not “a percent of b.” Binary operations require exactly two operands; square root and percentage require exactly one.

### Numerical policy

- Decimal arithmetic uses `shopspring/decimal`, including explicit-precision division and square root. No binary floating-point engine runs in either application layer.
- Input strings allow an optional minus sign, up to **24 integer digits** and **12 fractional digits**, and a maximum total length of **38 characters**. Magnitude must be below `10^24`; the smallest nonzero input is `0.000000000001`.
- Accepted examples: `"0"`, `"-2"`, `"12.50"`. Scientific notation, leading plus signs, leading integer zeros such as `"01"`, surrounding whitespace, `"NaN"`, `"Infinity"`, expressions, and non-string operands are rejected. API decimals need digits on both sides of a decimal point.
- Results have at most **12 decimal places**, rounded **half away from zero**. Trailing fractional zeros and negative zero are normalized; original operand strings remain in saved history.
- Addition/subtraction/multiplication and nonnegative integer powers use exact intermediates before final rounding. Negative powers use a rounded reciprocal. Results outside the supported magnitude return `RESULT_OUT_OF_RANGE`; a nonzero result that rounds to zero returns `RESULT_UNDERFLOW`.
- Power accepts integer-valued exponents from **−20 through 20**. The explicit convention is **`0^0 = 1`**. Zero to a negative exponent, division by zero, and square roots of negative values are errors.

These limits bound computation and let every successful result be reused as an operand.

### Validation and errors

Requests are limited to **8 KiB**, must be valid UTF-8 JSON objects, reject unknown fields/trailing JSON, and validate UUIDs, names, allowed operations, operand counts, decimal precision, and bounds on the server. Frontend validation is additional feedback, not an authorization or correctness boundary.

Errors use one envelope:

```json
{
  "error": {
    "code": "DIVISION_BY_ZERO",
    "message": "Cannot divide by zero."
  }
}
```

| Status | Meaning                                                                                      |
| ------ | -------------------------------------------------------------------------------------------- |
| `400`  | Malformed JSON, unknown fields, trailing content, or incorrect decoded types                 |
| `403`  | Disallowed origin when optional CORS is enabled                                              |
| `404`  | Missing thread or route                                                                      |
| `405`  | Unsupported HTTP method                                                                      |
| `413`  | Request body exceeds 8 KiB                                                                   |
| `415`  | Unsupported content type                                                                     |
| `422`  | Validation/domain failure, including invalid UUIDs, operands, exponents, or numerical limits |
| `500`  | Generic unexpected error; internal details stay in server logs                               |

Failed calculations are not persisted. SQL uses parameters, operations map to explicit Go branches, and arbitrary expressions/code are never executed. HTTP timeouts, context propagation, structured request logs, graceful shutdown, and readiness checks protect the service lifecycle.

## Tests and quality checks

With the development services running:

```sh
docker compose exec api go test ./...
docker compose exec api go test -race ./...
docker compose exec api go vet ./...
docker compose exec web npm test -- --run
docker compose exec web npm run typecheck
docker compose exec web npm run lint
docker compose exec web npm run build
```

Go table-driven tests cover all operations and numeric boundaries. `httptest` integration tests use temporary SQLite files for CRUD, isolation, cascades, strict validation, atomic rollback, and reopening data. Vitest/React Testing Library tests exercise thread management, keypad/keyboard input, history/reuse, advanced operations, error recovery, duplicate submission, and late responses after thread switching.

Dockerized browser checks cover the real frontend/API integration, responsive layouts, accessibility, watcher rebuilding, and SQLite persistence across container recreation. `scripts/docker-gate.cjs` records the original minimal-bootstrap gate and is not the final application's test runner. Current integration helpers are `scripts/workspace-check.cjs` and `scripts/live-history-check.cjs`; they use temporary verification threads and preserve unrelated user data. Recorded commands/results live in `feature-list.json`.

## Design decisions and assumptions

```text
Browser → web / Vite :5173 → /api proxy → api / Go :8080 → SQLite /data/calculator.db
```

- **Two application services:** React/TypeScript/Vite/Tailwind, Radix-backed shadcn/ui primitives, and Lucide on the frontend; Go/Chi on the backend. TanStack Query owns server state; ordinary React state owns unfinished input. React Hook Form/Zod handle naming feedback.
- **Independent arithmetic:** `internal/calculator` has no HTTP/database dependencies. Handlers decode/validate requests, the calculator evaluates structured operations, and the concrete repository persists results. No DI framework, expression parser, extra state library, or orchestration platform is needed.
- **SQLite:** `database/sql` with the pure-Go `modernc.org/sqlite` driver, WAL mode, foreign keys on every connection, a busy timeout, and a single connection keep local concurrency predictable. Embedded versioned migrations run transactionally and idempotently. Calculation insertion and thread activity updates share a transaction; an internal sequence guarantees history order even for equal timestamps.
- **Persistence:** SQLite data lives in a Docker named volume, with the database owned by the nonroot API user and created with mode `0600`. Cache/dependency volumes are separate from saved calculations.
- **Deliberately local:** Authentication and account ownership are intentionally outside this take-home assignment. Everyone accessing this instance shares its threads. Host ports bind to loopback; no public deployment is performed. History is unpaginated, appropriate to a small local workspace.
- **Before public multi-user exposure:** add authentication, per-user authorization/ownership checks, TLS, CSRF/session protections where applicable, rate/resource limits, backups/restores, monitoring, pagination/retention, and a database/concurrency strategy sized for the deployment. CORS alone is not access control.

Repository boundaries are `apps/api` and `apps/web`. Root `AGENTS.md` and `feature-list.json` require Docker-first, dependency-aware implementation, evidence before completion, and one commit per completed feature. The initial infrastructure gate passed before business features began; tracker entries retain verification evidence and discovered fixes.

## Formatting and pre-commit hook

Enable the tracked Git hook once per clone:

```sh
git config core.hooksPath .githooks
```

Commits run Prettier through a cached Docker formatter image and lint-staged. Supported staged files are formatted/re-staged; paths with spaces and partially staged files are handled without discarding unrelated edits. Go stays under `gofmt`. No host Node installation is required. See [Formatting without host Node.js](tools/format/README.md) for format/check commands and hook verification.

## Production-oriented containers

The optional production configuration uses multi-stage builds: a compiled Go binary in a lightweight nonroot runtime and static frontend assets served by unprivileged Nginx. Runtime images omit Go/Node development toolchains, Air, Vite, and source bind mounts. Nginx forwards `/api` to the Go service.

Run one configuration at a time; development and production use the same host ports and persistent SQLite volume:

```sh
docker compose down
docker compose -f compose.production.yaml up --build -d --wait
```

Open the same http://localhost:5173 address. To return to development:

```sh
docker compose -f compose.production.yaml down
docker compose up --build
```

Omit `-v` when switching configurations to preserve saved threads/history. Run the `exec`-based Go/frontend test commands against the development configuration, where their toolchains are available. Production containerization does not add authentication or make this local application suitable for public multi-user hosting by itself.
