# Astra Control

An open-source, self-hosted work dashboard for agent tasks and AI conversations across machines and runtimes.

See Codex, Hermes, OpenClaw, and Open WebUI work in one owner-scoped recent feed. Codex keeps its existing controls; the other sources are observation-only in this release. A separate Runtime view reports connector health, model catalogs, router state, and loaded local models without turning raw inference requests into work cards.

**Early preview · single owner · MIT licensed.** Independent project, not affiliated with OpenAI or Anthropic.

## Run

Clone this repository and enter its directory first. Requires Node 22.13+ (built-in SQLite), Python 3, Codex signed in on each machine, and an existing noninteractive SSH connection for remote machines.

```sh
npm ci
npm run build
mkdir -p data
cp config.example.json data/config.json
# Adjust paths, host names, and optional private HTTPS origin.
npm start
```

Visit `http://localhost:4318`. The server binds only to loopback. Keep `data/` private; it contains bounded excerpts, chat, and the durable inbox. It is excluded from Git. External source credentials live in separate `0600` files and are never returned to the browser or persisted in SQLite. The coordinator and Codex workers continue to use the installed Codex login.

## What works

- A paginated, filterable feed of every non-archived Codex task, including subagents, plus visible Hermes, OpenClaw, and Open WebUI work (and pinned archives when a source returns them). Exact propagated correlation identifiers can collapse provenance; title, text, and timestamp similarity never do.
- Provider-neutral status, source/profile/agent, execution host, requested/resolved model, inference locality, confidence, watch state, and a bounded latest excerpt. Recent detail is fetched on demand (at most 30 bounded entries); full transcripts stay in their source systems.
- Dedicated action inbox for completed turns, failures, delivery problems, and live managed-task permission requests. Current failed, interrupted, and abandoned in-progress work is backfilled on first observation; obsolete state alerts resolve when the source clears. Repeated updates are grouped by task, with filtering, search, sorting, and batch handling for non-approval items.
- Result-first task review with the latest response, branch, changed-file count, reported verification evidence, compact conversation history, and read-only Git state (local refs, no automatic fetch).
- New tasks assigned to a searchable saved Codex project through the documented Codex App Server protocol. New Git work is isolated in a sibling `codex/*` worktree by default; message, steer, interrupt, and answer supported requests in the dashboard.
- Per-machine and per-source diagnostics show exact captured-item totals, active work, runtime/project discovery, last contact, and connector errors, with an explicit retry action. The sidebar and API expose the installed version and Git commit.
- Idle, unowned existing threads can be resumed. Desktop-owned threads remain read-only here, with a Codex link. Native desktop permission requests cannot be reliably enumerated or answered by this MVP.
- An on-demand coordinator using `codex exec` returns a summary and proposed instructions. Sending a proposal is an explicit UI action. No recurring model calls or periodic chat notifications.
- Idempotent command records; uncertain delivery is retained for review and is never retried automatically.
- Independent source health and failure containment. Hermes and Open WebUI poll every 12 seconds; OpenClaw uses protocol-v4 session events plus 60-second reconciliation. Last snapshots remain visible and become stale after 45 seconds.
- Runtime inventory for the GPU broker, router, safe metrics, known providers, and loaded local models. Prompts and raw completion traffic are deliberately excluded.

## Honest limits

This is not a replacement for each source’s native client. Hermes, OpenClaw, and Open WebUI are observation-only: their cards link back to their source when a public deep-link base is configured, and mutation controls are not rendered. Existing desktop-owned Codex tasks cannot be steered here until their owning client releases them. Start new Codex tasks here for full control. The create form lists saved projects from compatible Codex runtimes, disambiguates duplicate names by checkout, and falls back to checkouts observed in task history. For Git repositories, the default isolated mode creates a sibling worktree and a new `codex/*` branch from the selected checkout's current `HEAD`. Non-Git checkouts cannot use isolated mode. Running directly in an existing checkout requires an explicit confirmation when another active task is already using it.

Worktrees prevent simultaneous edits in one directory, but they do not prove that task scopes are compatible or make later merges conflict-free. Repository-wide reservations, scope comparison, merge/push actions, and deployment verification remain roadmap work.

Task discovery reads Codex's local SQLite projections in read-only mode and checks advisory writer locks without changing contents. These schemas are internal and version-dependent. Current tested versions are recorded in `docs/VERIFICATION.md`. App Server is experimental; incompatible versions fail visibly. The dashboard never edits Codex databases, authentication, permission policies for existing threads, or existing desktop processes.

Snapshots refresh without calling a model. Hermes’s five-minute activity flag is presented as “Recently active” and explicitly marked heuristic. OpenClaw active run IDs and Open WebUI’s unfinished-generation flag are authoritative source facts. A stale source is shown as offline after 45 seconds; this does not prove a remote agent stopped. A completed turn does not imply release readiness; pushes, merges, deployment, and automatic retry remain separate.

Managed agents are tied to the hub's App Server subprocesses. Restarting/stopping the hub interrupts this ownership, and pending approval IDs expire. Reopen a task to inspect its state before resuming. Closing the browser does not stop the hub or its agents. Keep the hub machine running and Codex signed in.

## Hosting and authentication

Run on macOS or your own Linux server. Public browser access uses Cloudflare Tunnel with Cloudflare Access sign-in and server-side JWT verification; viewing devices do not need Tailscale. Private Tailscale Serve deployments are also supported. The dashboard stays bound to loopback.

See [hosting](docs/HOSTING.md) for authentication, configuration, Linux service installation, and deployment verification. Do not expose an unauthenticated port. Public source code and private task data are separate: keep configuration, transcripts, credentials, and runtime state out of Git.

The machine connector uses existing SSH settings; no SSH keys, inbound SSH settings, or firewall rules are changed. Codex credentials stay on their respective machines. The on-demand coordinator runs locally with user config disabled and a read-only sandbox, using only supplied task excerpts; routing remains deterministic server code.

## Checks

```sh
npm run build
npm test
python3 -m unittest discover -s tests -p '*_test.py'
```

See [verification](docs/VERIFICATION.md), [operations](docs/OPERATIONS.md), [architecture](docs/ARCHITECTURE.md), and [contributing](CONTRIBUTING.md).
