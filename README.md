# Astra Control

An open-source, self-hosted control board for coding agents across machines and repositories.

Watch ongoing work, review a durable action inbox, and interact with dashboard-managed Codex tasks from one browser window. Codex is supported today; deeper shared-session integration, Claude Code, and other providers are on the [roadmap](docs/ROADMAP.md).

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

Visit `http://localhost:4318`. The server binds only to loopback. Keep `data/` private; it contains task excerpts, chat, and the durable inbox. It is excluded from Git. No API key is required: the coordinator and workers use the installed Codex login and its usage allowance.

## What works

- Recent top-level tasks from each configured machine, with a watch list and last-observed timestamps.
- Durable action inbox: completed turns, failures, delivery problems, and live managed-task permission requests.
- Recent messages, tool execution evidence, and read-only Git state (local refs, no automatic fetch).
- New tasks through the documented Codex App Server protocol; message, steer, interrupt, and answer supported requests in the dashboard.
- Idle, unowned existing threads can be resumed. Desktop-owned threads remain read-only here, with a Codex link. Native desktop permission requests cannot be reliably enumerated or answered by this MVP.
- An on-demand coordinator using `codex exec` returns a summary and proposed instructions. Sending a proposal is an explicit UI action. No recurring model calls or periodic chat notifications.
- Idempotent command records; uncertain delivery is retained for review and is never retried automatically.

## Honest limits

This is an MVP, not a replacement for every Codex desktop control. Existing desktop-owned tasks cannot be steered here until their owning client releases them. Start new tasks here for full control. Tasks run in the selected existing checkout, not an automatically created worktree. Do not launch concurrent writers in the same checkout.

Task discovery reads Codex's local SQLite projections in read-only mode and checks advisory writer locks without changing contents. These schemas are internal and version-dependent. Current tested versions are recorded in `docs/VERIFICATION.md`. App Server is experimental; incompatible versions fail visibly. The dashboard never edits Codex databases, authentication, permission policies for existing threads, or existing desktop processes.

Snapshots refresh every 12 seconds using ordinary processes, without calling a model. A stale host is shown as offline after 45 seconds. This does not prove a remote agent stopped. A completed turn does not imply release readiness; pushes, merges, deployment, and automatic retry are deliberately outside this MVP.

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
