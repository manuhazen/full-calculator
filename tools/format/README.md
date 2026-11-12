# Formatting without host Node.js

The repository uses Prettier for TypeScript/TSX, JavaScript, JSON, CSS, HTML, Markdown, and YAML. Go remains formatted with `gofmt`; Go, SQL, TOML, generated build output, and dependency directories are excluded from Prettier.

Git attributes and Prettier both use LF endings, including on Windows, so cloned shell hooks and container sources remain portable.

Build the cached formatter image from the repository root:

```sh
docker build -f tools/format/Dockerfile -t calculator-workspace-formatter .
docker run --rm -v "${PWD}:/workspace" calculator-workspace-formatter npm run format:check
docker run --rm -v "${PWD}:/workspace" calculator-workspace-formatter npm run format
docker compose exec api gofmt -w cmd internal
```

`${PWD}` works in PowerShell and common POSIX shells. On Windows, run Docker Desktop with Linux containers. The formatter container carries Node, Prettier, lint-staged, and Git; no host Node or Go installation is needed.

Enable the tracked hook once per clone:

```sh
git config core.hooksPath .githooks
```

Each commit runs the Docker-backed hook. Its image build is cached, then lint-staged formats and re-stages only supported staged files. Filenames with spaces are supported. Unstaged edits to partially staged files are hidden and restored by lint-staged; formatting conflicts fail the commit and preserve the original work instead of silently discarding changes. Go files are not sent to Prettier. Do not bypass the hook to conceal a formatting failure.

The hook inherits the contributor's Git name/email for lint-staged's temporary safety stash. It does not publish code or contact external services other than ordinary container/dependency downloads.

`verify-hook.ps1` is the Windows verification helper used during implementation. It creates an isolated Git fixture under ignored `tmp/`, exercises a real commit with a deliberately unformatted staged filename containing spaces, and checks that a distant unstaged edit survives. It never uses the application's Git index. The regression check passed with Docker Desktop and Git for Windows.
