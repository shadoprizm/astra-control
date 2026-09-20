# Architecture and integration direction

## Current

The browser talks to a loopback Node hub over HTTP and server-sent invalidation events. SQLite persists normalized work items/sources/correlations/cursors, inbox entries, Codex command delivery, and coordinator messages. The initial migration transactionally projects existing Codex rows into the neutral tables while retaining the original task key, watch/managed flags, inbox links, and command history.

`WorkItem` separates the conversation from its adapter, execution host, model provider, requested/resolved model, and inference locality. A source record contains its native identifier, profile/agent, deep link, and advertised capability set. Multiple source records share one work item only when an exact propagated correlation identifier matches; no fuzzy linking exists. SQLite stores metadata plus at most a 4,000-character latest excerpt. Detail calls read at most 30 bounded entries from the source with a total response cap.

Codex continues to use local/SSH read-only projections plus App Server JSON-RPC for its existing controls. Each snapshot includes every non-archived parent and subagent task; only recent or actionable tasks carry bounded preview detail. Claude Code uses owner-local project transcripts for inventory/detail and its live session-state files for authoritative active or waiting state; historical idle state remains heuristic. Hermes uses its loopback dashboard API and explicit profile allowlist. Open WebUI uses an owner API key and owner-scoped chat endpoints. OpenClaw uses the pinned official protocol-v4 Gateway client, a persisted Ed25519 device identity, and only `operator.read` plus `operator.approvals`. External adapters advertise observation-only capabilities in v1. One adapter can fail or become incompatible without taking the dashboard or other sources offline.

The browser groups durable inbox records for the same task at presentation time; the underlying records remain independently auditable. Batch resolution is transactional and excludes live approvals. Task review is result-first: the latest final response and observed repository evidence precede compacted conversation and technical activity. Machine diagnostics use the same authenticated hub and connector path as ordinary refreshes.

The adapter contract and implementations are in `src/adapters.ts`; Runtime inventory is isolated in `src/runtime.ts`. Codex-specific control remains in `src/rpc.ts`, `src/hosts.ts`, `src/engine.ts`, and `connector/snapshot.py`. The browser gets summary/inbox/Runtime state from `/api/state`, pages through `/api/work-items`, and requests bounded source detail only when a card opens.

The on-demand coordinator is a read-only planning process, not an unrestricted shell agent. It receives bounded task/project/host/inbox context, treats source content as untrusted, and emits a strict action schema. The hub validates exact identifiers and current state, then sequentially routes accepted `send`, `interrupt`, `archive`, `create`, `watch`, `resolve`, `approval`, and `refresh` actions through the same engine methods used by the authenticated UI. Accepted and failed execution results are stored beside the recommendation. Permanent deletion and repository integration/release operations are deliberately absent from the action schema.

### Demo isolation

`npm run demo` is a separate execution mode, not a production configuration preset. It constructs no `Host`, source adapter, credential reader, or Runtime endpoint and never starts the refresh timer. Its eight synthetic work items, inbox records, bounded conversations, connector health, and model inventory live in an in-memory SQLite database that disappears when the process exits.

The server refuses to start demo mode while `THREADHELM_CONFIG` is set, and a `mode: "demo"` value in a normal configuration file is rejected. Real-agent mutations—send, pause, archive, create, coordinator, approval, and machine refresh—return an explicit conflict response. Harmless interactions such as filtering, toggling a sample watch, and marking a sample inbox record handled affect only that process's in-memory database. The browser carries a persistent sample-workspace banner and suppresses links and controls that could imply a live integration. The former `ASTRA_CONFIG`, `ASTRA_DEMO`, and `ASTRA_DEMO_PORT` environment names remain accepted temporarily for upgrade compatibility.

## Runtime and status semantics

Claude Code, Hermes, and Open WebUI reconcile every 12 seconds. Claude transcript summaries are cached by file size and modification time, and only direct parent-session transcripts enter inventory; subagent logs remain inside their parent source history. When the hub is remote, the Claude adapter can instead page through those already-bounded records and detail endpoints over a pre-existing SSH connection to the workstation's loopback ThreadHelm service. OpenClaw subscribes before reading its initial roster, merges session events, performs a trailing list read when bootstrap events overlap, and reconciles at least every 60 seconds. Last good snapshots are retained. Claude Code and Open WebUI card availability becomes stale after 45 seconds, OpenClaw uses at least 90 seconds to cover its reconciliation interval, and Hermes uses 180 seconds so a complete paginated inventory can finish without a false stale transition.

Statuses are normalized to `active`, `recent`, `waiting`, `idle`, `completed`, `failed`, `offline`, and `unknown`, with explicit `authoritative` or `heuristic` confidence. A Codex in-progress projection is active only while its task database has a live writer lock; interrupted or unlocked in-progress work maps to waiting. Current waiting and failed states create durable state-derived inbox entries even on first observation, and those entries auto-resolve when the state clears. Claude Code uses a live, process-backed session record for authoritative `active`/`waiting`/`idle`; transcript-only history is heuristic `idle`. Hermes’s five-minute activity heuristic maps to `recent`. OpenClaw uses source-reported active run identities and timestamps. Open WebUI uses the unfinished-generation active flag. Model aliases never imply local/cloud placement: locality remains unknown unless the source or broker explicitly reports it.

The Runtime page queries the configured loopback GPU broker for model catalog, router state, allowlisted numeric metrics, and loaded-model summaries. It does not ingest prompts, responses, or raw completion requests. Secrets, auth fields, messages, and prompt-like fields are stripped from Runtime payloads before browser serialization.

## Repository coordination

Cloud isolation and Git worktrees protect filesystems, but they do not prevent two otherwise isolated tasks from changing the same files or producing branches that conflict at integration time. ThreadHelm should coordinate at the repository level before it dispatches work from the browser or to a cloud provider.

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

## Future provider controls

Claude Code observation deliberately does not imply session control. A future control adapter should use a documented SDK/runtime surface and preserve Claude's permissions model rather than writing its activity files or forcing it into Codex-shaped approval and resumption semantics. The local activity projection is version-sensitive and must fail visibly when its source schema is incompatible.
