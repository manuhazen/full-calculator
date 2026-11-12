# Calculator Workspace

A Docker-first calculation workspace. Application features are tracked in `feature-list.json`; the initial bootstrap verifies infrastructure before business features begin.

## Development

Only Docker Desktop (Linux containers) and Docker Compose are required. From the repository root:

```sh
docker compose up --build
```

Open http://localhost:5173. The browser requests `/api/v1/health` through Vite, which proxies to `http://api:8080` on the private Compose network. Direct API health is at http://localhost:8080/api/v1/health.

Source is bind-mounted. Vite HMR and Air rebuild the frontend/backend respectively; polling supports Windows/WSL bind mounts. Dependencies and build caches stay in containers/volumes. API runs as nonroot UID 10001; its `/data` directory is owned by that user. SQLite will be stored at `/data/calculator.db` on the `sqlite_data` named volume.

Environment values have defaults; optionally copy `.env.example` to `.env` to change ports and configuration. `WATCH_POLLING=false` disables frontend polling on filesystems with reliable events. The backend watcher uses polling by default. No secrets are required.

```sh
docker compose logs -f api web
docker compose stop
docker compose start
docker compose down
```

Stopping or recreating containers preserves named volumes. **`docker compose down -v` deletes data** and is not part of normal development or verification.

## Bootstrap checks

```sh
docker compose config --quiet
docker compose build
docker compose exec api go test ./...
docker compose exec web npm run typecheck
docker compose exec web npm run build
```

The feature tracker records which checks actually ran and any blockers. A running Docker daemon alone does not prove the application verification gate has passed.
