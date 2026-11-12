# Working on Calculator Workspace

- Create one separate Git commit for each completed feature. Verify acceptance criteria first, then include that feature's implementation and tracker evidence in its commit. Use the stable feature ID in the commit message (for example, `feat(F003): bootstrap Go API container`). Never combine multiple completed features into one commit or commit unverified work as completed. Preserve unfinished changes belonging to other features.

- Read `feature-list.json` first when starting or resuming work. Preserve stable IDs and unfinished work; inspect existing code before changing it.
- The tracker is the single source of truth. Choose an eligible feature, verify dependencies, set `in_progress`, implement, run acceptance checks, record evidence and update UTC `updatedAt`. Mark `completed` only after acceptance criteria pass. Record blockers precisely.
- Docker is the default development and testing environment. Developers need only Docker and Docker Compose.
- Use Prettier for supported frontend, JSON, CSS, Markdown, and YAML files, and gofmt for Go files. F036 tracks repository formatting and a pre-commit hook that runs Prettier on staged supported files. Keep the hook compatible with the Docker-only development workflow and never skip it to hide formatting failures.
- F008 is a mandatory Docker verification gate. Until build, startup, direct/proxied health, frontend HMR, backend rebuild, logs and restart checks pass, implement only minimum application bootstraps. Never skip this gate or develop business logic behind an unresolved blocker.
- Never report checks that did not run as passing. Preserve failed/unavailable checks and limitations in the tracker and documentation.
- Keep arithmetic independent of HTTP/storage. Every mathematical operation runs on the Go backend through the unified calculation endpoint; never add a browser arithmetic engine.
- Keep decimal operands/results as strings, validate server-side, use parameterized SQL, and keep changes small and testable.
- Do not delete named Docker volumes as part of routine verification. Container recreation and data deletion are different operations.
