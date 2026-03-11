# ContextOS — Multi-Model Build Instructions

> This file governs how all models build ContextOS together.
> Every model reads this file at the start of every session.
> No model deviates from these rules for any reason.

---

## The Model Team

| Model | Tool | Owns |
|---|---|---|
| **Claude** | Windsurf Cascade | Backend core, security, agent, review + fixes |
| **Gemini 2.5 Pro** | Google AI Studio | Frontend (Next.js dashboard, landing page) |
| **GPT-4o** | Cursor | VS Code extension, TypeScript-heavy files |
| **Deepseek V3** | Cursor | Celery workers, integration connectors |

---

## Split of Responsibility — Permanent

Each model owns its domain completely. Never write files outside your domain.

### Claude — Windsurf Cascade
```
backend/app/core/           ← ALL files
backend/app/models/         ← ALL files
backend/app/schemas/        ← ALL files
backend/app/api/routes/     ← ALL files
backend/app/services/       ← ALL files (except workers)
backend/alembic/            ← ALL files
backend/Dockerfile
backend/requirements.txt
docker-compose.yml
docker-compose.prod.yml
nginx/nginx.conf
LAUNCH_CHECKLIST.md
```

### Gemini 2.5 Pro — Google AI Studio
```
frontend/src/app/           ← ALL pages
frontend/src/components/    ← ALL components
frontend/src/lib/api.ts
frontend/src/store/auth.ts
frontend/src/middleware.ts
frontend/package.json
frontend/tsconfig.json
frontend/tailwind.config.ts
frontend/next.config.ts
frontend/.env.local         ← template only, never real values
```

### GPT-4o — Cursor
```
vscode-extension/src/extension.ts
vscode-extension/src/contextCollector.ts
vscode-extension/src/apiClient.ts
vscode-extension/src/sidebarProvider.ts
vscode-extension/package.json
vscode-extension/tsconfig.json
vscode-extension/webpack.config.js
```

### Deepseek V3 — Cursor
```
backend/app/integrations/github.py
backend/app/integrations/notion.py
backend/app/integrations/slack.py
backend/app/workers/celery_app.py
backend/app/workers/github_worker.py
backend/app/workers/notion_worker.py
backend/app/workers/slack_worker.py
```

---

## Handoff Protocol — Git Commit

Every model handoff goes through Git. No exceptions.

```
Model A finishes its files
        ↓
Model A output → Surya pastes into files → git add . && git commit
        ↓
Model B pulls latest: git pull
        ↓
Model B reads: .windsurfrules + this file + files it depends on
        ↓
Model B builds its files
        ↓
Repeat
```

**What Model B always receives before starting:**
1. This instructions file (`ContextOS_Model_Instructions.md`)
2. `.windsurfrules`
3. The specific files it depends on (listed per phase below)

**Model B never starts without those 3 things.**

---

## Conflict Resolution

`.windsurfrules` is the tiebreaker for all conflicts. No negotiation.

If two models produce conflicting implementations:
1. Check `.windsurfrules` — whichever implementation matches it wins
2. If both match `.windsurfrules` — Claude reviews and picks one
3. Claude's decision is final

Claude is the integration layer. When in doubt, Claude fixes it.

---

## Output Format — All Models

Every model outputs **complete files only**. No explanation. No commentary. No markdown prose between files.

### Correct output format
````
```python
# backend/app/core/config.py

from pydantic_settings import BaseSettings
...
[complete file]
```

```python
# backend/app/core/database.py

from sqlalchemy.ext.asyncio import ...
...
[complete file]
```
````

### Wrong output format
```
Here is the config.py file. This file handles settings using Pydantic...

```python
# incomplete or with placeholders
```

Let me know if you need any changes!
```

**Rules:**
- File path as first comment inside every code block
- One code block per file
- No text between files
- No "here is", "this file does", "let me know"
- No placeholders — `# TODO`, `# implement this`, `pass`, `...` are forbidden
- Move to next file automatically after finishing each one

---

## The Tech Stack — Every Model Follows This

### Backend (Claude + Deepseek V3)

| Category | Use | Never Use |
|---|---|---|
| Framework | FastAPI 0.111+ | Django, Flask |
| Language | Python 3.11 | Any other version |
| ORM | SQLAlchemy 2.0 async | Anything else |
| DB driver | asyncpg | psycopg2 |
| Migrations | Alembic only | `create_all()` |
| Validation | Pydantic v2 | v1 style |
| HTTP client | httpx async | requests |
| Task queue | Celery 5.4 + Redis | anything else |
| Scheduler | Celery Beat | APScheduler, cron |
| Logging | loguru | print, standard logging |
| Auth | python-jose + passlib[bcrypt] | PyJWT |
| Encryption | cryptography AES-256-GCM | Fernet |
| LLM | Anthropic claude-sonnet-4-20250514 | OpenAI, Gemini |
| Embeddings | sentence-transformers all-MiniLM-L6-v2 | OpenAI embeddings |
| Agent | LangGraph ReAct | LangChain AgentExecutor |
| Vector DB | Qdrant only | Pinecone, Chroma |
| Primary DB | PostgreSQL 15 | MySQL, SQLite |
| Cache | Redis 7 | Memcached |
| Rate limiting | slowapi | anything else |
| Billing | stripe 9.3+ | anything else |

### Frontend (Gemini 2.5 Pro)

| Category | Use | Never Use |
|---|---|---|
| Framework | Next.js 14 App Router | Pages Router, Remix |
| Language | TypeScript 5 strict | JavaScript |
| Styling | Tailwind CSS 3 dark theme | CSS modules, inline styles |
| Components | shadcn/ui | MUI, Chakra, Ant Design |
| State | Zustand 4 | Redux, Context API for global state |
| HTTP | axios with interceptors | fetch(), ky |
| Icons | lucide-react | heroicons, fontawesome |
| Dates | date-fns | moment.js |
| Markdown | react-markdown | marked |
| Storage | Zustand memory only | localStorage, sessionStorage |

### VS Code Extension (GPT-4o)

| Category | Use |
|---|---|
| Language | TypeScript 5 |
| Bundler | webpack 5 |
| Markdown | marked 9 inside WebView |
| Auth storage | VS Code SecretStorage |
| API calls | From extension.ts only, never from WebView |

### Workers + Integrations (Deepseek V3)

| Category | Use |
|---|---|
| Language | Python 3.11 async |
| HTTP | httpx async |
| Logging | loguru |
| Tasks | Celery with bind=True, max_retries=3 |
| Scheduler | Celery Beat |

---

## Security Rules — All Models, No Exceptions

These apply to every file every model writes:

```
NEVER store raw OAuth tokens — always encrypt with AES-256-GCM first
NEVER store raw API keys — always SHA256 hash first
NEVER store raw passwords — always bcrypt with cost factor 12
NEVER log tokens, passwords, or API keys — only user_id and email
NEVER expose stack traces to HTTP responses
NEVER return internal errors to client — only clean JSON messages
NEVER query user data without WHERE user_id = :user_id
NEVER skip webhook signature verification
NEVER process webhook before verifying signature
ALWAYS return 200 from webhooks immediately — process in Celery
ALWAYS sanitize user input before passing to Claude API
ALWAYS use httpOnly cookies or memory for JWT — never localStorage
```

---

## Phase Build Order

Build phases sequentially. No model starts phase N+1 until phase N passes its checklist.

---

### Phase 1 — Backend Foundation
**Owner: Claude**
**Deepseek V3: not yet**
**Gemini: not yet**
**GPT-4o: not yet**

Claude builds these files completely, in this order:

```
docker-compose.yml
backend/requirements.txt
backend/app/core/config.py
backend/app/core/database.py
backend/app/core/security.py
backend/app/core/encryption.py
backend/app/models/__init__.py
backend/app/models/user.py
backend/app/models/project.py
backend/app/models/integration.py
backend/app/models/context_chunk.py
backend/app/models/conversation.py
backend/app/schemas/auth.py
backend/app/schemas/project.py
backend/app/api/routes/health.py
backend/app/api/routes/auth.py
backend/app/api/routes/projects.py
backend/app/main.py
backend/Dockerfile
backend/alembic.ini
backend/alembic/env.py
```

**Phase 1 Handoff Checklist — Surya verifies before Phase 2:**
```
□ docker compose up -d → all 3 databases running
□ uvicorn app.main:app --reload → starts with no errors
□ alembic upgrade head → runs with no errors
□ curl http://localhost:8000/health → {"status":"ok"}
□ POST /api/v1/auth/register → returns token
□ POST /api/v1/auth/login → returns token
□ GET /api/v1/auth/me → returns user
□ git add . && git commit -m "Phase 1 complete"
```

---

### Phase 2A — Integrations + Workers
**Owner: Deepseek V3**
**Depends on: Phase 1 complete and committed**

**What Deepseek V3 reads before starting:**
- `.windsurfrules`
- `ContextOS_Model_Instructions.md`
- `backend/app/core/config.py` (reads settings)
- `backend/app/core/encryption.py` (uses for token storage)
- `backend/app/core/database.py` (uses for db sessions)
- `backend/app/models/integration.py` (uses for saving integrations)
- `backend/app/models/context_chunk.py` (uses for saving chunks)

**Deepseek V3 builds these files, in this order:**
```
backend/app/integrations/github.py
backend/app/integrations/notion.py
backend/app/integrations/slack.py
backend/app/workers/celery_app.py
backend/app/workers/github_worker.py
backend/app/workers/notion_worker.py
backend/app/workers/slack_worker.py
```

**Deepseek V3 prompt to paste into Cursor:**

```
Read these files first before writing anything:
- .windsurfrules
- ContextOS_Model_Instructions.md
- backend/app/core/config.py
- backend/app/core/encryption.py
- backend/app/core/database.py
- backend/app/models/integration.py
- backend/app/models/context_chunk.py

Build Phase 2A — Integrations and Workers.
Output complete files only. No explanation. File path as first comment.

FILES TO BUILD:

backend/app/integrations/github.py
Class GitHubIntegration:
- get_oauth_url(user_id, state) → str — https://github.com/login/oauth/authorize, scopes: repo read:user read:org
- exchange_code_for_token(code) → dict — POST https://github.com/login/oauth/access_token
- get_user_info(access_token) → dict — GET https://api.github.com/user
- get_repos(access_token) → list — GET https://api.github.com/user/repos, sort=updated, per_page=50
- get_commits(access_token, repo_full_name, since=None) → list — with full diff via GET /repos/{repo}/commits/{sha}
- get_pull_requests(access_token, repo_full_name, state="open") → list
- get_issues(access_token, repo_full_name, state="open") → list — exclude PRs
- verify_webhook_signature(body_bytes, signature_header, secret) → bool — HMAC SHA256
- setup_webhook(access_token, repo_full_name, webhook_url, secret) → dict
- format_commit_as_text(commit, repo_name) → str

backend/app/integrations/notion.py
Class NotionIntegration:
- get_oauth_url(user_id, state) → str
- exchange_code_for_token(code) → dict — POST https://api.notion.com/v1/oauth/token
- get_all_pages(access_token) → list — POST /v1/search, handle pagination
- get_page_content(access_token, page_id) → str — recursive block fetching, convert all block types to text
- get_databases(access_token) → list
- get_database_entries(access_token, database_id) → list
- format_page_as_text(page_meta, content) → str

backend/app/integrations/slack.py
Class SlackIntegration:
- get_oauth_url(user_id, state) → str — scopes: channels:read channels:history groups:read groups:history im:read im:history mpim:history users:read team:read
- exchange_code_for_token(code) → dict — POST https://slack.com/api/oauth.v2.access
- get_workspace_info(access_token) → dict
- get_channels(access_token) → list — only channels where is_member=True
- get_channel_history(access_token, channel_id, oldest_timestamp=None, limit=200) → list — with thread replies, resolve usernames, skip bot messages and messages < 10 chars
- get_user_name(access_token, user_id, cache) → str — cache results to avoid repeated API calls
- verify_slack_signature(body, timestamp, signature, signing_secret) → bool — HMAC SHA256
- format_messages_as_text(messages, channel_name) → str — readable format with timestamps

backend/app/workers/celery_app.py
- Create Celery app with Redis broker from settings.REDIS_URL
- Redis result backend
- task_serializer json, result_expires 3600
- Celery Beat schedule:
  sync_notion_every_30_min: every 1800 seconds → sync_notion_changes
  sync_slack_every_hour: every 3600 seconds → sync_slack_changes

backend/app/workers/github_worker.py
- initial_github_sync(user_id, integration_id, access_token): all repos up to 20, last 30 days commits, open PRs, open issues, process each through context_processor
- process_push_event(payload, user_id, integration_id, access_token): extract commits, fetch full details, process
- process_pr_event(payload, user_id, integration_id): process PR data
- process_issue_event(payload, user_id, integration_id): process issue data
All tasks: bind=True, max_retries=3, default_retry_delay=60, loguru logging

backend/app/workers/notion_worker.py
- initial_notion_sync(user_id, integration_id, access_token): all pages and databases
- sync_notion_changes(user_id, integration_id, access_token): pages modified since last_synced only
All tasks: bind=True, max_retries=3, loguru logging

backend/app/workers/slack_worker.py
- initial_slack_sync(user_id, integration_id, access_token): last 30 days, max 20 channels, max 10 DMs
- process_slack_message(message_data, user_id, integration_id): single real-time message, skip if < 20 chars
- sync_slack_changes(user_id, integration_id, access_token): new messages since last_synced
All tasks: bind=True, max_retries=3, loguru logging

IMPORTANT: All workers call context_processor.process_and_store() for storing chunks.
Import context_processor from app.services.context_processor.
Do not implement the storage logic inside workers — just call the service.
```

**Phase 2A Handoff Checklist — Surya verifies:**
```
□ All 7 files created with no syntax errors
□ python -c "from app.integrations.github import GitHubIntegration" → no errors
□ python -c "from app.workers.celery_app import celery_app" → no errors
□ git add . && git commit -m "Phase 2A complete — integrations and workers"
```

---

### Phase 2B — Backend Services + Routes
**Owner: Claude**
**Depends on: Phase 2A complete and committed**

**What Claude reads before starting:**
- `.windsurfrules`
- All Phase 1 files already written by Claude
- All Phase 2A files written by Deepseek V3

**Claude builds these files, in this order:**
```
backend/app/services/embedding_service.py
backend/app/services/qdrant_service.py
backend/app/services/context_processor.py
backend/app/services/intent_classifier.py
backend/app/services/context_retriever.py
backend/app/services/context_assembler.py
backend/app/services/react_agent.py
backend/app/services/cache_service.py
backend/app/api/routes/github.py
backend/app/api/routes/notion.py
backend/app/api/routes/slack.py
backend/app/api/routes/context.py
backend/app/api/routes/query.py
backend/app/api/routes/integrations.py
```

**Claude prompt for Phase 2B:**
```
Read .windsurfrules first.

Phase 1 and Phase 2A are complete. Git is up to date.
Deepseek V3 built all integration and worker files.

Read these files before building:
- backend/app/integrations/github.py
- backend/app/integrations/notion.py
- backend/app/integrations/slack.py
- backend/app/workers/github_worker.py
- backend/app/workers/notion_worker.py
- backend/app/workers/slack_worker.py

Build Phase 2B — Services and Routes.
Output complete files only. No explanation. File path as first comment.

[paste full file list with specs from ContextOS_Complete_Dev_Guide.md Phase 2B section]
```

**Phase 2B Handoff Checklist:**
```
□ uvicorn app.main:app --reload → starts with no import errors
□ celery -A app.workers.celery_app worker --loglevel=info → starts
□ GET /api/v1/integrations/github/connect → returns {oauth_url}
□ POST /api/v1/query with JWT → returns streamed answer
□ git add . && git commit -m "Phase 2B complete — services and routes"
```

---

### Phase 2C — VS Code Extension
**Owner: GPT-4o**
**Depends on: Phase 2B complete and committed**

**What GPT-4o reads before starting:**
- `.windsurfrules`
- `ContextOS_Model_Instructions.md`
- `backend/app/api/routes/query.py` (to understand the SSE format)
- `backend/app/api/routes/auth.py` (to understand API key auth)
- `backend/app/api/routes/context.py` (to understand sync endpoint)

**GPT-4o prompt for Phase 2C:**

```
Read these files before writing anything:
- .windsurfrules
- ContextOS_Model_Instructions.md
- backend/app/api/routes/query.py
- backend/app/api/routes/auth.py
- backend/app/api/routes/context.py

Build Phase 2C — VS Code Extension.
Output complete files only. No explanation. File path as first comment.
Auto-move to next file without waiting.

FILES TO BUILD:

vscode-extension/package.json
- name: contextos, displayName: ContextOS, version: 0.0.1
- engines: { vscode: ^1.85.0 }
- activationEvents: ["onStartupFinished"]
- contributes:
    viewsContainers: activitybar id contextos-sidebar
    views: { contextos-sidebar: [{ id: contextos.chatView, name: ContextOS }] }
    commands: contextos.connect, contextos.sync, contextos.clearChat
- main: ./dist/extension.js
- scripts: build (webpack), watch (webpack --watch), package (vsce package)
- devDependencies: @types/vscode, @types/node, typescript, webpack, webpack-cli, ts-loader, @vscode/vsce
- dependencies: marked, axios

vscode-extension/tsconfig.json
Standard VS Code extension tsconfig, strict mode on.

vscode-extension/webpack.config.js
Entry: ./src/extension.ts, Output: ./dist/extension.js, Target: node, External: vscode

vscode-extension/src/contextCollector.ts
Class WorkspaceContextCollector:
collectAll() → WorkspaceContext {
  openFiles: [{ path, content, language, isActive }]
    - all open text documents
    - skip: node_modules, .git, venv, __pycache__, dist, build, .next
    - max 20 files, max 50KB per file
  folderStructure: string tree 2 levels deep (same exclusions)
  gitLog: [{ hash, message, author, date, diff }]
    - git log --oneline -10 --format="%H|%s|%an|%ai"
    - for each commit: git diff --stat HASH^..HASH (max 500 chars)
    - use child_process.execSync with cwd = workspace root
    - return [] if no git repo
  diagnostics: [{ file, line, severity, message }]
    - vscode.languages.getDiagnostics()
    - only errors and warnings, max 20
  activeFile: { path, content, language, cursorLine }
}

vscode-extension/src/apiClient.ts
Class APIClient:
- constructor: read apiUrl from settings (default http://localhost:8000), apiKey from SecretStorage
- sendQuery(question, context) → AsyncGenerator<StreamEvent>
    POST /api/v1/query
    Header: X-API-Key
    Body: { question, workspace_context: context, stream: true }
    Parse SSE stream — yield each parsed event
    Event types: thinking, searching, token, sources, done, error
- syncWorkspace(context) → Promise<void>
    POST /api/v1/context/sync
    Header: X-API-Key
- saveApiKey(key) → store in vscode.SecretStorage
- getApiKey() → retrieve from vscode.SecretStorage
- clearApiKey() → delete from vscode.SecretStorage
- isConnected() → bool

vscode-extension/src/sidebarProvider.ts
Class SidebarProvider implements vscode.WebviewViewProvider:
resolveWebviewView(webviewView):
  enableScripts: true
  HTML content: complete dark chat UI with:
    - bg: #0d1117
    - header: "ContextOS" text + green/red status dot + sync icon button
    - messages area: scrollable, auto-scroll to bottom
    - user messages: right-aligned, bg #1a6cf0, white text
    - AI messages: left-aligned, bg #161b22, gray-300 text
    - AI messages render markdown via marked.js (loaded via CDN in webview)
    - thinking indicator: animated dots + current step text
    - thinking steps: collapsed list of steps with icons
    - sources section: chips showing cited files/commits/docs
    - input: auto-resize textarea + send button
    - Ctrl+Enter sends message
    All CSS and JS inline in the HTML string.

Handle messages from WebView:
  type "sendMessage":
    1. collect context via contextCollector.collectAll()
    2. call apiClient.sendQuery(question, context)
    3. stream events back to WebView via postMessage
  type "connect":
    1. vscode.window.showInputBox asking for API key
    2. save via apiClient.saveApiKey()
    3. send "connected" event to WebView
  type "sync":
    1. collect context
    2. call apiClient.syncWorkspace(context)
    3. send "synced" event to WebView
  type "clearChat":
    send clearChat to WebView

vscode-extension/src/extension.ts
activate(context):
  1. Create SidebarProvider instance
  2. Register webview view provider for "contextos.chatView"
  3. Register commands:
     contextos.connect → open input box → save API key → refresh sidebar → update status bar
     contextos.sync → collect context → sync → show notification
     contextos.clearChat → send clear to sidebar
  4. Status bar item:
     "$(circle-filled) ContextOS" green if connected
     "$(circle-outline) ContextOS: Not Connected" gray if not
  5. Check connection on activate → set status bar accordingly

deactivate(): cleanup
```

**Phase 2C Handoff Checklist:**
```
□ cd vscode-extension && npm install && npm run build → no errors
□ F5 in VS Code → extension loads in new window
□ ContextOS icon appears in activity bar
□ Sidebar opens with chat UI
□ Status bar shows connection status
□ git add . && git commit -m "Phase 2C complete — VS Code extension"
```

---

### Phase 3 — Full Next.js Dashboard
**Owner: Gemini 2.5 Pro**
**Depends on: Phase 2B + 2C complete and committed**

**What Gemini reads before starting:**
- `.windsurfrules`
- `ContextOS_Model_Instructions.md`
- `backend/app/api/routes/auth.py` (API contracts)
- `backend/app/api/routes/query.py` (SSE stream format)
- `backend/app/api/routes/github.py` (integration endpoints)
- `backend/app/api/routes/notion.py`
- `backend/app/api/routes/slack.py`
- `backend/app/api/routes/billing.py`
- `backend/app/api/routes/teams.py`

**Gemini 2.5 Pro prompt for Phase 3:**

```
Read these files before writing anything:
- .windsurfrules (critical — follow every rule in it)
- ContextOS_Model_Instructions.md
- backend/app/api/routes/auth.py
- backend/app/api/routes/query.py
- backend/app/api/routes/github.py
- backend/app/api/routes/notion.py
- backend/app/api/routes/slack.py
- backend/app/api/routes/billing.py
- backend/app/api/routes/teams.py

Build Phase 3 — Complete Next.js Dashboard.
Output complete files only. No explanation. File path as first comment.
Auto-move to next file without waiting.

Tech rules:
- Next.js 14 App Router only
- TypeScript strict mode
- Tailwind dark theme (bg-gray-950 pages, bg-gray-900 cards)
- shadcn/ui components
- Zustand for global state — never Context API
- axios via lib/api.ts — never fetch() directly
- Never localStorage — Zustand memory only
- lucide-react icons

FILES TO BUILD:

frontend/package.json
frontend/tsconfig.json (strict: true)
frontend/tailwind.config.ts (dark theme custom colors)
frontend/next.config.ts
frontend/src/lib/api.ts (axios instance, JWT interceptor, all API functions typed)
frontend/src/store/auth.ts (Zustand: user, token, setUser, setToken, logout)
frontend/src/middleware.ts (protect /dashboard/*, redirect to /login)
frontend/src/app/layout.tsx
frontend/src/app/page.tsx (landing page: hero, problem, solution, features, pricing, footer)
frontend/src/app/(auth)/login/page.tsx
frontend/src/app/(auth)/register/page.tsx
frontend/src/app/dashboard/page.tsx (stats cards, recent activity, quick actions)
frontend/src/app/dashboard/chat/page.tsx
  - streaming chat, SSE consumer
  - user messages right-aligned blue
  - AI messages left-aligned with markdown
  - thinking steps collapsible
  - sources as chips below each AI message
  - conversation history sidebar
  - team context toggle (Personal / Team)
frontend/src/app/dashboard/integrations/page.tsx
  - cards for VS Code, GitHub, Notion, Slack
  - connect/disconnect buttons
  - sync status, chunks count, last sync time
  - manual sync button
frontend/src/app/dashboard/projects/page.tsx
frontend/src/app/dashboard/team/page.tsx
  - if no team: create team card
  - if in team: members table, invite modal, pending invitations, stats
frontend/src/app/dashboard/billing/page.tsx
  - current plan badge
  - usage progress bar (red > 80%)
  - plans comparison table
  - upgrade → Stripe checkout
  - manage → Stripe portal
frontend/src/app/dashboard/settings/page.tsx
  - profile update
  - API key management (generate + list + delete)
  - show new key in modal: "Copy now — never shown again"
  - danger zone: clear all context, delete account
frontend/src/app/invite/[token]/page.tsx (public — no auth required)
frontend/src/components/ui/Button.tsx
frontend/src/components/ui/Input.tsx
frontend/src/components/ui/Card.tsx
frontend/src/components/ui/Badge.tsx
frontend/src/components/ui/Modal.tsx
frontend/src/components/ui/Toast.tsx
frontend/src/components/ui/Spinner.tsx
frontend/src/components/ui/UpgradeBanner.tsx
frontend/src/components/chat/MessageBubble.tsx
frontend/src/components/chat/ThinkingIndicator.tsx
frontend/src/components/chat/ChatInput.tsx
frontend/src/components/integrations/IntegrationCard.tsx
```

**Phase 3 Handoff Checklist:**
```
□ cd frontend && npm install && npm run dev → starts on localhost:3000
□ localhost:3000 loads dark landing page with no console errors
□ /register → creates account → redirects to /dashboard
□ /login → logs in → redirects to /dashboard
□ /dashboard → shows stats (may be 0s, that is ok)
□ /dashboard/chat → types question → sees streaming response
□ /dashboard/integrations → shows 4 integration cards
□ /dashboard/billing → shows plan comparison table
□ npm run build → zero TypeScript errors
□ git add . && git commit -m "Phase 3 complete — Next.js dashboard"
```

---

### Phase 4 — Teams + Billing Models + Security
**Owner: Claude**
**Depends on: Phase 3 complete and committed**

**Claude builds these files:**
```
backend/app/models/team.py
backend/app/models/billing.py
backend/app/schemas/team.py
backend/app/schemas/billing.py
backend/app/api/routes/teams.py
backend/app/api/routes/billing.py
backend/app/api/routes/admin.py
backend/app/services/team_context_service.py
backend/app/services/billing_service.py
backend/app/core/rate_limiter.py
backend/app/core/middleware.py
backend/app/core/monitoring.py
backend/app/services/react_agent.py (update for team context)
backend/app/api/routes/query.py (update: usage limit check + record)
docker-compose.prod.yml
nginx/nginx.conf
LAUNCH_CHECKLIST.md
```

**Phase 4 Handoff Checklist:**
```
□ alembic revision --autogenerate -m "teams and billing" && alembic upgrade head → no errors
□ POST /api/v1/teams → creates team
□ POST /api/v1/teams/{id}/invite → returns invitation link
□ POST /api/v1/billing/checkout → returns Stripe checkout URL
□ POST /api/v1/billing/webhooks → accepts Stripe test events
□ Free user blocked after 50 queries → 429 response with upgrade message
□ git add . && git commit -m "Phase 4 complete — teams, billing, security"
```

---

## Model-Specific Rules

### Claude (Windsurf Cascade)
- Always read `.windsurfrules` before every session
- You are the integration layer — if files from other models have bugs that block your work, fix them
- Never rewrite files owned by other models without Surya's request
- When writing services, write them defensively — assume integration files may have edge cases

### Gemini 2.5 Pro (Google AI Studio)
- Read all relevant backend route files before building frontend — match API contracts exactly
- Every `api.get()` / `api.post()` must use the exact endpoint path from the backend routes
- SSE consumer in chat page must handle all event types: `thinking`, `searching`, `token`, `sources`, `done`, `error`
- All pages must work with no backend running (show loading/error states gracefully)
- `npm run build` must pass with zero TypeScript errors before handing off

### GPT-4o (Cursor)
- Read `backend/app/api/routes/query.py` to understand the exact SSE event format before building `apiClient.ts`
- Store API keys in `vscode.SecretStorage` only — never `globalState`, never in settings
- Never make HTTP calls from WebView JavaScript — route all API calls through `extension.ts`
- The sidebar HTML must be a single self-contained string — no external files

### Deepseek V3 (Cursor)
- Every Celery task must have `bind=True`, `max_retries=3`, `default_retry_delay=60`
- Never implement storage logic in workers — always call `context_processor.process_and_store()`
- Rate limit all external API calls — add 1-second delay between GitHub/Notion/Slack requests
- Slack URL verification challenge must be returned before signature verification — Slack sends it without a valid signature

---

## Cross-Model Interface Contracts

These are the exact contracts between models. Breaking these breaks the integration.

### Deepseek V3 → Claude interface (context_processor)

Deepseek workers call:
```python
from app.services.context_processor import context_processor

await context_processor.process_and_store(
    content=str,           # raw text content
    source_type=str,       # "github_commit" | "github_pr" | "github_issue" | "notion" | "slack_channel" | "slack_message" | "vscode_file"
    source_url=str,        # URL or identifier
    user_id=UUID,
    integration_id=UUID | None,
    metadata=dict,         # any extra data
    db=AsyncSession,
)
# Returns: int (count of new chunks stored)
```

### GPT-4o → Claude interface (API endpoints)

Extension calls these endpoints exactly:
```
POST /api/v1/query
Headers: X-API-Key: ctx_xxxxx
Body: { "question": str, "workspace_context": dict, "stream": true }
Response: text/event-stream
Events: thinking | searching | token | sources | done | error

POST /api/v1/context/sync
Headers: X-API-Key: ctx_xxxxx
Body: { "files": [...], "git_log": [...], "diagnostics": [...] }
Response: { "chunks_added": int }
```

### Gemini 2.5 Pro → Claude interface (all API calls)

Frontend axios calls all use `Bearer {token}` from Zustand auth store:
```
Authorization: Bearer eyJ...
Content-Type: application/json
```

SSE stream format Gemini must consume:
```
data: {"event": "thinking", "message": "Analyzing your question..."}
data: {"event": "searching", "source": "github", "count": 3}
data: {"event": "searching", "source": "notion", "count": 2}
data: {"event": "token", "content": "word"}
data: {"event": "sources", "sources": [...]}
data: {"event": "done", "conversation_id": "uuid"}
data: {"event": "error", "message": "Something went wrong"}
```

---

## Final Output Rules — All Models

```
✅ File path as first comment inside every code block
✅ One code block per file
✅ Files output in the exact order specified
✅ Move to next file automatically
✅ No text between files
✅ No explanation of what the file does
✅ No "here is", "this handles", "let me know"
✅ Every import used in the file
✅ Every function fully implemented
✅ Type hints on every parameter and return value
✅ Docstring on every class and public method
✅ loguru for all logging (Python) — never print()
✅ All edge cases handled (None, empty, API failure)

❌ No TODO
❌ No placeholder comments
❌ No pass or ...
❌ No raise NotImplementedError
❌ No hardcoded secrets
❌ No explanation prose between files
❌ No asking "should I continue?"
```

---

> Four models. One product. One set of rules.
> `.windsurfrules` is the single source of truth.
> Claude is the integration layer.
> Ship it.
