# Roadmap

## Direction

One self-hosted workspace for supervising coding agents across repositories and machines. Codex is the first integration. Claude Code and additional coding tools are planned providers. Public source code does not mean public access to an operator's dashboard.

## 0.1 — Open-source foundation

- [x] Multi-machine discovery, watched tasks, durable inbox, coordinator, and managed Codex actions.
- [x] Separate deployable project, MIT license, contribution and security guidance.
- [ ] Authenticated server deployment reachable without a client VPN.
- [ ] Reproducible release and upgrade checks on macOS and Linux.

## 0.2 — Deeper Codex integration (next product milestone)

- [ ] Prototype a shared App Server runtime using a supported client connection, with desktop interoperability explicitly measured.
- [ ] Test live steering, questions, approval ownership, interrupt, simultaneous clients, reconnect, and restart recovery.
- [ ] Display observed capabilities and session ownership per task.
- [ ] Move runtime lifetime out of the web hub, so a browser or hub restart does not stop agents.
- [ ] Prefer protocol discovery/events over internal SQLite projections wherever the runtime supports them.
- [ ] Document the compatibility matrix and preserve the read-only fallback when a desktop session cannot be attached.

Success means a user can act on a shared live session without switching windows, losing history, or accidentally running a second writer. Do not market desktop integration as complete until this is verified against the actual desktop client.

## 0.3 — Multi-provider coordination

- [ ] Extract a provider contract for inventory, transcript/events, create/resume, send/steer, interrupt, requests, and capability reporting.
- [ ] Add a Claude Code adapter against its documented integration surface.
- [ ] Normalize status and inbox events while retaining provider-native request schemas and restrictions.
- [ ] Pair outbound machine connectors so workstations do not need inbound public ports.

## 0.4 — Review and release

- [ ] Isolated worktree creation and concurrent-writer detection.
- [ ] Diffs, test evidence, and branch state in the board.
- [ ] Explicit commit, push, and pull-request actions with recorded outcomes.
- [ ] Batch triage, notification preferences, and recovery from interrupted delivery.

No fixed dates yet. Each milestone needs live verification with disposable tasks before enabling it for ongoing work.
