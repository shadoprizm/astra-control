# Roadmap

## Direction

One self-hosted workspace for supervising agent tasks and AI conversations across repositories, machines, and inference locations. Codex, Claude Code, Hermes, OpenClaw, and Open WebUI share a neutral observation model; deeper provider controls remain planned. Public source code does not mean public access to an operator's dashboard.

Project authority will inherit owner-set, versioned defaults from the [per-project objective template](PROJECT_OBJECTIVE_TEMPLATE.md). Task prose may narrow those defaults but cannot grant itself a new action class, filesystem root, provider, network destination, or funding limit.

The staged path from the current activity feed to the decision-oriented Astra experience, including release gates, provider order, value, and risks, is defined in the [Astra Control proposal](ASTRA_CONTROL_PROPOSAL.md).

## Astra release status

### Release 0 — Safety foundation

- [x] Proposal-only coordinator, deterministic authority, evidence-bound proposal IDs, actor audit, ordered migration backups, rollback drills, adversarial tests, protocol gates, objective template, and immutable pre-briefing baseline.

### Release 1A — Read-only briefing

- [x] Deterministic Now, Decision, Recommendation, and Next brief for current work.
- [x] Attention-ordered workspace overview and the same four fields on task cards and task review.
- [x] Evidence expansion, confidence display, revision-bound useful/wrong/stale feedback, and stale model-proposal suppression.
- [x] Responsive desktop and 390px layouts with no briefing mutation authority.
- [ ] Measure at least 50 owner decisions over at least 14 days and compare median time-to-decision and missed decisions with the Release 0 baseline.
- [x] Instrument proposal-only shadow analysis with one call per evidence revision, transactional daily call and observable-token ceilings, bounded excerpts, latency/usage capture, and pre-prompt local-only exclusion.
- [ ] Complete at least seven days of shadow data, inspect p50/p95 demand and recommendation feedback, and set the production analysis budget from those measurements.

Release 1A remains in measurement mode until both open checks pass. Shadow recommendations have no action authority. Release 1B dispatcher and worker work does not inherit authority from this UI.

## 0.1 — Open-source foundation

- [x] Multi-machine discovery, watched tasks, durable inbox, coordinator, and managed Codex actions.
- [x] Separate deployable project, MIT license, contribution and security guidance.
- [x] Authenticated server deployment reachable without a client VPN.
- [x] Clean-tree, tested, checksum-verified release installers with exact build identity on macOS and Linux.
- [x] Complete a destructive rollback drill on both platforms.

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
- [x] Project Claude Code activity from an SSH-connected workstation into a remote hub without exposing the workstation service.
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
