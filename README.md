# IRIS AI (Next-Gen-Friend)

IRIS AI is a local-first desktop assistant built with Electron + React. It combines voice interaction, system automation, workflow macros, mobile control (ADB), local memory, and optional cloud auth into one desktop runtime.

The repository folder is `Next-Gen-Friend`, while the packaged desktop app name is `IRIS AI`.

## Table of Contents

1. [What IRIS Does](#what-iris-does)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Requirements](#requirements)
6. [Quick Start](#quick-start)
7. [Environment Variables](#environment-variables)
8. [NPM Scripts](#npm-scripts)
9. [Local Data and Storage](#local-data-and-storage)
10. [Feature Overview](#feature-overview)
11. [Supabase Setup](#supabase-setup)
12. [Phone (ADB) Setup](#phone-adb-setup)
13. [Security Notes](#security-notes)
14. [Validation Status](#validation-status)
15. [Troubleshooting](#troubleshooting)
16. [Additional Docs](#additional-docs)
17. [Contributing](#contributing)
18. [License](#license)

## What IRIS Does

IRIS is not just a chat UI. It can execute real desktop actions through IPC handlers in the Electron main process.

Core themes:

- Voice-first interaction with real-time tool calling.
- Desktop automation (open/close apps, shell commands, keyboard/mouse actions, window control).
- File operations (read/write/search/index/open/manage files and directories).
- Local memory and notes.
- Macro/workflow editor with reusable automation graphs.
- Optional deep research and code RAG workflows.
- Optional Android phone control over ADB.
- Optional Supabase-based cloud auth and profile flows.

## Architecture

IRIS follows Electron's multi-process model:

1. `Main process` (`src/main`): privileged OS access, IPC handlers, automation, storage, external API calls.
2. `Preload` (`src/preload/index.ts`): controlled bridge exposing `window.electron.ipcRenderer.invoke(...)`.
3. `Renderer` (`src/renderer`): React UI, widgets, dashboard, auth views, macro editor.

Execution path:

`UI intent -> preload IPC bridge -> main-process handler -> OS/API action -> UI update`

## Tech Stack

- Electron 39
- React 19 + TypeScript
- Vite / electron-vite
- Tailwind CSS
- Framer Motion + GSAP
- Supabase JS client
- Groq SDK / Google GenAI integrations
- `@xenova/transformers` + `vectordb` for local semantic search
- ADB shell integration for Android control

## Project Structure

```text
Next-Gen-Friend/
  src/
    main/          # Electron main process: IPC handlers, services, OS actions
    preload/       # Context bridge
    renderer/      # React app (views, widgets, tools, services)
  resources/       # App resources (icon, etc.)
  build/           # Packaging assets (icons, NSIS resources, entitlements)
  supabase/        # SQL schema and supabase notes
  README.md
  FEATURES_GUIDE.md
  PHONE_CONNECTION_GUIDE.md
```

## Requirements

- Node.js 20+ (recommended)
- npm 10+ (recommended)
- Windows is the primary target platform for full feature coverage
- For phone features: ADB installed and available in `PATH` (or set `ADB_PATH`)
- For cloud auth features: a configured Supabase project
- For AI features: API keys (set in app settings and/or local `.env`)

## Quick Start

```bash
git clone https://github.com/krishrathi1/Next-Gen-Friend.git
cd Next-Gen-Friend
npm install
```

Create your local env file:

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS/Linux:

```bash
cp .env.example .env
```

Run development mode:

```bash
npm run dev
```

Build:

```bash
npm run build
```

## Environment Variables

`IRIS` stores primary runtime AI keys in local app settings/secure storage, but local development still uses `.env` for several integrations.

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes (for auth flows) | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes (for auth flows) | Supabase anon key |
| `VITE_SUPABASE_REDIRECT_URL` | Recommended | OAuth callback URL (default fallback: `http://127.0.0.1:54321/auth/callback`) |
| `VITE_BACKEND_KEY` | Optional | URL for backend used by Axios client |
| `VITE_GEMINI_API_KEY` | Optional | Local development fallback key |
| `VITE_IRIS_AI_API_KEY` | Optional | Legacy/development key name in `.env.example` |
| `MAIN_VITE_GROQ_API_KEY` | Optional | Groq key placeholder in `.env.example` |
| `VITE_IMAGE_AI_API_KEY` | Optional | Image generation integrations |
| `VITE_TAVILY_API_KEY` | Optional | Deep research integration |
| `VITE_NOTION_API_KEY` | Optional | Notion integration |
| `VITE_NOTION_DATABASE_ID` | Optional | Notion target DB |

Note: most day-to-day key entry is expected through `Settings -> API Keys` in the app UI.

## NPM Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Run Electron + renderer in development mode |
| `npm run start` | Preview built app |
| `npm run typecheck` | Run node + web TypeScript checks |
| `npm run lint` | Run ESLint checks |
| `npm run build` | Typecheck + production build |
| `npm run build:win` | Build Windows installers (`nsis`, `msi`) |
| `npm run build:mac` | Build macOS package |
| `npm run build:linux` | Build Linux targets |
| `npm run build:unpack` | Build unpacked app output |
| `npm run format` | Prettier format |

## Local Data and Storage

At runtime, IRIS writes local files under Electron `app.getPath('userData')`.

Common files/directories:

- `iris_secure_vault.json`: encrypted Gemini/Groq key blob (`safeStorage` when available)
- `Notes/*.md`: note files
- `Gallery/*`: generated/saved images
- `Chat/iris_memory.json`: short conversation memory
- `iris_workflows.json`: saved macro/workflow graphs
- `Connected Devices/Connect-mobile.json`: ADB device history
- `iris_semantic_db/`: semantic index data
- `iris_scan_states/*.json`: resumable codebase ingestion state
- `electron-store` entries: vault PIN hash, face descriptors, personality profile

## Feature Overview

Major capability groups:

- Dashboard: live status, microphone and vision controls, transcript/state surface.
- Workflows: visual macro editor with trigger/action nodes and reusable sequences.
- Notes and Gallery: local knowledge and media memory views.
- Phone module: connect to Android via ADB, stream screenshots, telemetry, quick actions.
- System tools: app control, terminal execution, file operations, keyboard/mouse automation.
- AI widgets: weather, stocks, map, image generation, coding stream, deep research, RAG/oracle.

For step-by-step usage of UI modules, see [`FEATURES_GUIDE.md`](./FEATURES_GUIDE.md).

## Supabase Setup

For auth/device-lock flows, initialize Supabase schema:

1. Create/open your Supabase project.
2. Run SQL from `supabase/schema.sql` in Supabase SQL Editor.
3. Set `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and redirect URL in `.env`.
4. Ensure OAuth redirect includes `http://127.0.0.1:54321/auth/callback`.

## Phone (ADB) Setup

Phone module requires working ADB connectivity.

- Install Android platform-tools.
- Ensure `adb` is in `PATH`, or set `ADB_PATH`.
- Pair/connect your phone (USB-first setup is most reliable).

Full guide: [`PHONE_CONNECTION_GUIDE.md`](./PHONE_CONNECTION_GUIDE.md)

## Security Notes

- Renderer access is routed through IPC; privileged operations execute in main process handlers.
- Sensitive API keys for core voice flow are stored in local secure vault (`safeStorage` where available).
- PIN and face-lock metadata is stored locally via `electron-store`.
- IRIS can execute system-level actions. Treat this project as a privileged desktop runtime.

Important hardening note:

- Current `BrowserWindow` config sets `webSecurity: false` and `sandbox: false` for compatibility. Review and harden before production distribution in untrusted environments.

## Validation Status

Current local checks:

- `npm run typecheck`: passes
- `npm run lint`: fails with a large existing backlog across many source files

This README update is accurate to current code and scripts, but lint cleanup is still an open engineering task.

## Troubleshooting

1. App fails with missing Supabase variables: set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env`.
2. OAuth callback not completing: confirm redirect URL is `http://127.0.0.1:54321/auth/callback`.
3. Phone cannot connect: verify `adb devices` works in terminal first.
4. Voice features not starting: save Gemini/Groq keys in `Settings -> API Keys`.
5. Wormhole/deep-research features failing: check required keys (Tavily/Notion/Groq) and network availability.

## Additional Docs

- [`FEATURES_GUIDE.md`](./FEATURES_GUIDE.md)
- [`PHONE_CONNECTION_GUIDE.md`](./PHONE_CONNECTION_GUIDE.md)
- [`CONTRIBUTING.md`](./CONTRIBUTING.md)
- [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md)
- [`SECURITY.md`](./SECURITY.md)

## Contributing

Contributions are welcome. Please read [`CONTRIBUTING.md`](./CONTRIBUTING.md) first and keep changes scoped, testable, and documented.

## License

MIT. See [`LICENSE`](./LICENSE).
