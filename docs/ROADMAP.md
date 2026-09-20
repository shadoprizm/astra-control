# Roadmap

## Direction

One self-hosted workspace for supervising agent tasks and AI conversations across repositories, machines, and inference locations. Codex, Claude Code, Hermes, OpenClaw, and Open WebUI share a neutral observation model; deeper provider controls remain planned. Public source code does not mean public access to an operator's dashboard.

## 0.1 — Open-source foundation

- [x] Multi-machine discovery, watched tasks, durable inbox, coordinator, and managed Codex actions.
- [x] Separate deployable project, MIT license, contribution and security guidance.
- [x] Authenticated server deployment reachable without a client VPN.
- [x] Clean-tree, tested, checksum-verified release installers with exact build identity on macOS and Linux.
- [ ] Complete a destructive rollback drill on both platforms.

## 0.2 — Unified work capture

- [x] Provider-neutral work/source/correlation schema with transactional Codex migration.
- [x] Paginated work inventory, bounded on-demand detail, source filters, watch state, and SSE invalidation.
- [x] Hermes profile allowlist, Open WebUI owner scope, and read-only paired OpenClaw Gateway integration.
- [x] Quiet actionable inbox policy and separate Runtime/model/router view.
- [x] Finish live staged capability probes and source inventory acceptance on the production hub.
- [ ] Add repeatable disposable conversation fixtures for every supported source.

## 0.3 — Deeper controls

- [ ] Prototype a shared App Server runtime using a supported client connection, with desktop interoperability explicitly measured.
- [ ] Test live steering, questions, approval ownership, interrupt, simultaneous clients, reconnect, and restart recovery.
- [ ] Display observed capabilities and session ownership per task.
- [ ] Move runtime lifetime out of the web hub, so a browser or hub restart does not stop agents.
- [ ] Prefer protocol discovery/events over internal SQLite projections wherever the runtime supports them.
- [x] Document the compatibility matrix and preserve the read-only fallback when a desktop session cannot be attached.

Success means a user can act on a shared live session without switching windows, losing history, or accidentally running a second writer. Do not market desktop integration as complete until this is verified against the actual desktop client.

## 0.4 — Multi-provider coordination

- [x] Extract a provider contract for inventory, bounded detail/events, health, model catalog, and capability reporting.
- [ ] Extend the contract with source-specific create/resume, send/steer, interrupt, and request controls after observation proves stable.
- [x] Add read-only Claude Code local activity capture with bounded detail and live waiting-state observation.
- [ ] Replace or extend the version-sensitive Claude activity projection with a documented control/event surface when one is available.
- [ ] Normalize status and inbox events while retaining provider-native request schemas and restrictions.
- [ ] Pair outbound machine connectors so workstations do not need inbound public ports.

## 0.5 — Review and release

- [ ] Normalize repository identity across local, remote, and cloud execution environments.
- [ ] Add durable repository reservations and refuse concurrent writers in one checkout.
- [x] Create isolated Git worktrees for browser-dispatched Codex work by default, with an explicit existing-checkout override.
- [ ] Compare active same-repository task scopes; allow disjoint work and serialize or request an explicit owner choice when overlap is known or uncertain.
- [ ] Revalidate base commits and changed paths before merge, push, or pull-request actions.
- [ ] Diffs, test evidence, and branch state in the board.
- [ ] Explicit commit, push, and pull-request actions with recorded outcomes.
- [x] Grouped inbox triage with filters, search, sorting, and batch handling for non-approval items.
- [ ] Notification preferences and recovery from interrupted delivery.

No fixed dates yet. Each milestone needs live verification with disposable tasks before enabling it for ongoing work.
