# MVP verification — 2026-09-18

## Automated checks

- TypeScript build: passed.
- Eight Node tests passed: durable inbox, event deduplication, command idempotency, recovery of uncertain sends, watched-only snapshot events, approval lifecycle, offline-state retention, offered-decision enforcement.
- Four Python tests passed: top-level inventory filtering, unknown state for unlocked in-progress turns, exclusion of internal reasoning, null command-output handling.
- Frontend JavaScript syntax check: passed.

## Live checks

- Read-only snapshots from the Mac and Astra: both online, 60 recent tasks per host initially. Seven existing tasks added to Watching.
- Mac Codex version: `0.154.0-alpha.6.2`.
- Astra Codex version: `0.151.0-alpha.7.2`.
- Created a harmless dashboard task on each host. Responses: `MAC_COORDINATION_READY` and `ASTRA_COORDINATION_READY`.
- Follow-up delivery on both hosts: `MAC_FOLLOWUP_RECEIVED` and `ASTRA_FOLLOWUP_RECEIVED`.
- Real App Server command approval received, rendered in the browser, declined using the offered cancel decision, then confirmed resolved by Codex. Test turn paused. No permission was granted and the test command was not executed.
- On-demand coordinator correctly summarized the two test results and returned no dispatches.
- Background-service migration retained all seven watched tasks, all seven pending non-test inbox entries, and command history.
- After restart, resumed a managed Mac task and obtained `RESTART_RECOVERY_OK`.
- Cleared the recovery-test inbox entry using the deployed browser UI. Test tasks remain available under All tasks; they are not watched.
- Browser verification: desktop layout, 390px mobile breakpoint, new-task creation, follow-up submission, live permission display and decline, inbox handling; no browser console errors during the check.
- Private HTTPS page and API returned 200 from the Mac; HTTPS health check also succeeded from Astra.
- Wrong Host, cross-origin mutation, missing CSRF, and incorrect Tailscale login each returned 403.
- Existing Tailscale Serve route on port 443 remained unchanged; the dashboard uses its own private port 8443.

## Limits established during testing

The desktop's private app-tool socket is not available to external clients. The MVP does not circumvent that restriction. It reads existing task projections and uses the documented App Server protocol for managed task controls. Existing desktop-owned task steering and native approval enumeration remain unavailable until ownership is released. The interface describes this explicitly.

Offline behavior and duplicate/uncertain delivery were tested deterministically without disconnecting or interrupting the user's real machines or agents. Approval acceptance, every possible MCP form, Git push/merge/deploy, and remote service failover are not covered by this MVP.

## UI and isolation follow-up — 2026-09-19

- 32 Node tests passed, including grouped inbox behavior, batch resolution, project disambiguation, checkout conflict assessment, result summaries, conversation compaction, isolated task dispatch, and forced machine retry.
- Five Python tests passed, including creation of a real sibling worktree and `codex/*` branch in a disposable Git repository.
- TypeScript build and frontend JavaScript syntax checks passed.
- Browser verification covered the dedicated inbox with two completion groups, multi-select and batch handling, result-first task review, machine diagnostics, searchable project selection, active-checkout warnings, and the 390px mobile layout.
- Browser verification did not submit a new task, so no user repository or live agent was created. The connector worktree path was exercised only in the disposable automated test; remote live task isolation and abandoned-worktree recovery remain unverified.

## Unified work capture — 2026-09-19

- TypeScript build passed with the neutral work model, normalized SQLite tables, paginated APIs, four source types, and Runtime projection.
- 44 Node tests passed. New coverage includes transactional Codex migration with preserved watch/action/command state, no duplicate work, exact-correlation-only linking, archive/pin filtering, model/locality filters, 4,000-character excerpt limits, Hermes profile behavior, Open WebUI owner-scoped endpoints, quiet ordinary chat replies, durable watched background completion, current failure/waiting backfill, writer-lock-aware Codex status, captured-inventory reporting, source-specific freshness intervals, and duplicate failure/action suppression.
- The OpenClaw integration test performs a real protocol-v4 WebSocket challenge/response against a fixture Gateway, checks the Ed25519 device proof, verifies the exact `operator.read` and `operator.approvals` scopes, injects an overlapping bootstrap event, observes the trailing reconciliation list, deduplicates repeated approvals, and asserts that no write RPC is called.
- Six Python connector/worktree tests passed, including an inventory larger than the former fixed recent cap. Frontend module syntax checks, installer syntax checks, and the TypeScript build passed.
- Source endpoints are rejected unless loopback. Source and Runtime credential files must be `0600`. Auth/token-like fields are redacted or stripped from error and Runtime projections, and external source payloads persist bounded metadata rather than transcripts.

The final production acceptance record appears below after promotion. `astra-kclaw` is explicitly out of scope; its changed SSH host key must not be bypassed.

## Production acceptance — 2026-09-19

- The clean-tree Linux installer rebuilt and ran 44 Node tests, six Python tests, and TypeScript compilation before each promotion. It checksum-verified the copied artifact, wrote the release manifest, restarted the user service, and confirmed systemd active. The repository, `origin/main`, installed `release.json`, and running service were reconciled to one exact commit.
- The live authenticated UI reported v0.2.1 plus its commit, two connected Codex machines, two authoritative active tasks, eight migrated watched tasks, and 60 grouped attention items. Those 60 corresponded to 51 current waiting/interrupted states, eight current failures, and one retained completion; 59 state-derived items were created by the new first-observation backfill.
- Full direct Codex snapshots and normalized production rows matched exactly: 1,192 Mac tasks and 104 Astra tasks, including subagents and tasks beyond the former 60-item cap.
- External inventories contained 1,255 Hermes sessions, 141 OpenClaw sessions, and 56 Open WebUI chats. The Runtime page exposed those exact captured totals. OpenClaw’s 60-second reconciliation interval receives a dedicated 90-second freshness window, and the 1,255-session Hermes pagination receives 180 seconds, so healthy sources no longer oscillate stale while a scheduled full refresh is still completing.
- The production database held 2,748 visible work items after reconciliation: two active, 51 waiting, eight failed, 61 unknown, 770 idle, and 1,856 completed at the acceptance instant. The seven prior Mac watch selections were merged with the existing production selection using a transactional SQLite backup; all eight appeared in the live UI.
- Anonymous HTTPS requests redirected to Cloudflare Access rather than reaching the application. The authenticated owner page and live-update stream remained functional through the release. No connector credential, private configuration, transcript database, or personal deployment address was committed to the public repository.
- The legacy macOS LaunchAgent had no running managed tasks, was disabled and stopped after production passed, leaving the Linux deployment as the only active hub. Its files and database were retained for recovery.

## Open-source preparation

The public repository begins with a clean source snapshot; private deployment history, runtime data, credentials, machine identifiers, and diagnostic artifacts are excluded. Six additional Node authentication tests cover valid signed owner tokens, missing assertions including localhost Host, forged signatures, unauthorized identities, expired tokens, wrong audiences, untrusted hosts/peers, fail-closed configuration, and legacy private access.

Public DNS/Access deployment and shared desktop runtime integration are not established by these unit tests. See the roadmap for remaining live acceptance checks.

## Owner-only deployment hardening

Two additional Node tests exercise authenticated action limits and a running public-mode HTTP server. Anonymous requests to the page, API, event stream, health check, assets, and robots file return 403 with no-store/noindex headers. Forged email/Tailscale headers and a forged JWT with localhost Host are rejected. Registration requests cannot bypass authentication. Total: 16 Node tests plus 4 Python tests.

These checks do not prove that a particular Cloudflare account has an owner-only MFA policy. That policy, proxy-generated login headers, and a real owner sign-in must be verified at deployment.

## v0.3 release reconciliation — 2026-09-20

- The package and lockfile now identify the release candidate as `0.3.0`; the running sidebar and installed release manifest remain deployment-time checks and must identify the eventual exact commit.
- TypeScript compilation, frontend JavaScript syntax, 54 Node tests, 13 Python tests, and `git diff --check` passed locally. The new approval lifecycle coverage proves that an invalidated request stays expired and that even a reused native request ID creates a distinct approval on a new runtime connection.
- Expired approval copy now directs the operator to resume or inspect the task and have the agent request approval again. Expired IDs and uncertain writes are never replayed automatically.
- The README and compatibility contract explicitly limit standalone Codex discovery to configured local or SSH runtime projections. ChatGPT conversations and Codex Cloud tasks are not captured by the standalone panel.
- The demo was exercised in a real browser at 1,440×900 and 390×844 with no console warnings or errors. The two committed product screenshots were recaptured from the v0.3 candidate and contain only synthetic demo data.
- Repository promotion, installer execution, authenticated live acceptance, rollback verification, and exact running release identity remain release-owner checks after the candidate commit exists.
