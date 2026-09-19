# Architecture and integration direction

## Current

The browser talks to a loopback Node hub over HTTP and server-sent invalidation events. SQLite persists normalized work items/sources/correlations/cursors, inbox entries, Codex command delivery, and coordinator messages. The initial migration transactionally projects existing Codex rows into the neutral tables while retaining the original task key, watch/managed flags, inbox links, and command history.

`WorkItem` separates the conversation from its adapter, execution host, model provider, requested/resolved model, and inference locality. A source record contains its native identifier, profile/agent, deep link, and advertised capability set. Multiple source records share one work item only when an exact propagated correlation identifier matches; no fuzzy linking exists. SQLite stores metadata plus at most a 4,000-character latest excerpt. Detail calls read at most 30 bounded entries from the source with a total response cap.

Codex continues to use local/SSH read-only projections plus App Server JSON-RPC for its existing controls. Each snapshot includes every non-archived parent and subagent task; only recent or actionable tasks carry bounded preview detail. Hermes uses its loopback dashboard API and explicit profile allowlist. Open WebUI uses an owner API key and owner-scoped chat endpoints. OpenClaw uses the pinned official protocol-v4 Gateway client, a persisted Ed25519 device identity, and only `operator.read` plus `operator.approvals`. External adapters advertise observation-only capabilities in v1. One adapter can fail or become incompatible without taking the dashboard or other sources offline.

The browser groups durable inbox records for the same task at presentation time; the underlying records remain independently auditable. Batch resolution is transactional and excludes live approvals. Task review is result-first: the latest final response and observed repository evidence precede compacted conversation and technical activity. Machine diagnostics use the same authenticated hub and connector path as ordinary refreshes.

The adapter contract and implementations are in `src/adapters.ts`; Runtime inventory is isolated in `src/runtime.ts`. Codex-specific control remains in `src/rpc.ts`, `src/hosts.ts`, `src/engine.ts`, and `connector/snapshot.py`. The browser gets summary/inbox/Runtime state from `/api/state`, pages through `/api/work-items`, and requests bounded source detail only when a card opens.

The on-demand coordinator is a read-only planning process, not an unrestricted shell agent. It receives bounded task/project/host/inbox context, treats source content as untrusted, and emits a strict action schema. The hub validates exact identifiers and current state, then sequentially routes accepted `send`, `interrupt`, `archive`, `create`, `watch`, `resolve`, `approval`, and `refresh` actions through the same engine methods used by the authenticated UI. Accepted and failed execution results are stored beside the recommendation. Permanent deletion and repository integration/release operations are deliberately absent from the action schema.

## Runtime and status semantics

Hermes and Open WebUI reconcile every 12 seconds. OpenClaw subscribes before reading its initial roster, merges session events, performs a trailing list read when bootstrap events overlap, and reconciles at least every 60 seconds. Last good snapshots are retained. Open WebUI card availability becomes stale after 45 seconds, OpenClaw uses at least 90 seconds to cover its reconciliation interval, and Hermes uses 180 seconds so a complete paginated inventory can finish without a false stale transition.

Statuses are normalized to `active`, `recent`, `waiting`, `idle`, `completed`, `failed`, `offline`, and `unknown`, with explicit `authoritative` or `heuristic` confidence. A Codex in-progress projection is active only while its task database has a live writer lock; interrupted or unlocked in-progress work maps to waiting. Current waiting and failed states create durable state-derived inbox entries even on first observation, and those entries auto-resolve when the state clears. Hermes’s five-minute activity heuristic maps to `recent`. OpenClaw uses source-reported active run identities and timestamps. Open WebUI uses the unfinished-generation active flag. Model aliases never imply local/cloud placement: locality remains unknown unless the source or broker explicitly reports it.

The Runtime page queries the configured loopback GPU broker for model catalog, router state, allowlisted numeric metrics, and loaded-model summaries. It does not ingest prompts, responses, or raw completion requests. Secrets, auth fields, messages, and prompt-like fields are stripped from Runtime payloads before browser serialization.

## Repository coordination

Cloud isolation and Git worktrees protect filesystems, but they do not prevent two otherwise isolated tasks from changing the same files or producing branches that conflict at integration time. Astra Control should coordinate at the repository level before it dispatches work from the browser or to a cloud provider.

Repository identity must not rely on a checkout path. The hub should normalize a provider repository ID or Git remote and record the execution host, checkout/worktree, branch, base commit, task intent, and known file scope. Local repositories without a remote may use a host-scoped Git common directory as a fallback identity.

The dispatch preflight should apply these rules:

1. Never start a second writer in an occupied checkout. Create an isolated worktree/environment or refuse the start.
2. For active tasks in separate checkouts of the same repository, allow clearly disjoint work and give each task a concise sibling-work summary.
3. When scopes overlap or cannot be determined, serialize the work or require an explicit owner choice. Do not silently assume that environment isolation makes the changes compatible.
4. Before merge, push, or pull-request actions, refresh the repository state, compare the current base and changed paths, and surface conflicts for review. Do not auto-merge or auto-rebase merely because both tasks completed.

Reservations must be durable and reconciled against observed runtime state. A stale or disconnected task does not release its repository reservation by itself. The current implementation ships the first safety layer: new Git tasks default to a sibling worktree and `codex/*` branch, while the existing-checkout mode warns about active tasks and requires an explicit confirmation. It does not yet normalize repository identity, reserve repositories, compare task scopes, or revalidate integration actions, so the broader guarantees above remain roadmap work.

## Codex integration investigation

[Codex App Server documentation](https://learn.chatgpt.com/docs/app-server) describes conversation, streaming, approval, and runtime APIs plus stdio, WebSocket, and Unix transports. Its remote CLI interface is a useful shared-runtime prototype target. The documentation labels the WebSocket transport experimental and unsupported for production workloads.

A remote CLI connection is not proof that an existing desktop app can attach to the same runtime. Desktop coexistence, event subscriptions, writer ownership, and which client receives and resolves requests must be tested separately. The MVP's separate App Server cannot take over a thread still owned by the desktop. Private IPC and direct database edits are not a supported bridge.

The next prototype should use an isolated runtime and disposable thread, two authenticated clients, a harmless permission request, a mid-turn message, and a disconnect/reconnect. Record which events both clients receive and which responses are accepted before integrating it into the board.

## Future providers

Claude Code and other tools are roadmap items, not supported integrations today. Use each provider's documented SDK/runtime surface and preserve its permissions model. An adapter must not pretend that all providers share the same approval or resumption semantics.
