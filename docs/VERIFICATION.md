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

## Release 0 safety hardening — 2026-09-20

- TypeScript compilation, frontend syntax, 68 Node tests, 13 Python tests, and `git diff --check` passed before promotion. New coverage includes the authority truth table, hostile transcript and approval payloads, proposal-only coordinator behavior, stable proposal IDs, stale evidence revisions, approval overflow beyond 250 activities, actor attribution, exact Codex protocol versions, ordered migrations, SQLite backups, and a disposable restore of a pre-migration database.
- Coordinator output is server-enforced proposal-only. The former mutation method was removed from the planning path. A send, create, archive, watch change, inbox resolution, refresh, or approval emitted by the model is persisted as a proposal and cannot call a workspace mutation.
- The Mac and Linux installations migrated through schema versions 3 and 4. Both created two SQLite-native pre-migration backups with `0600` permissions. The command audit gained its actor column, and the durable proposal ledger was present after restart.
- The immutable pre-briefing decision baseline captured one historical decision on the Mac at 61,339 ms. The aggregate contains no request title, body, transcript, or approval payload.
- Live App Server initialization enabled controls only after the exact tested versions were observed: Codex `0.154.0-alpha.6.2` on macOS and `0.151.0-alpha.7.2` on Linux. The UI retained observation and exposed the control reason while a deliberately incomplete parser failed closed during staging; the parser was corrected against both native initialization forms before Linux promotion.
- Both installed hubs had zero active hub-managed turns before restart. The macOS installer promoted the exact release commit and LaunchAgent health passed. The Linux installer ran the full suite, checksum-verified the artifact, promoted the same commit, and systemd returned active.
- The macOS rollback drill restored the pre-release `0.3.0` artifact and database, proved its loopback health, then restored the current Release 0 build and database. The Linux drill restored the prior production commit, proved the service active behind its expected `403` application authentication boundary, then restored the current build and proved the same boundary. Additional current-state backups were retained on both hosts.
- The first Linux drill attempt exposed a missing Node directory in the ad hoc maintenance script's noninteractive `PATH`. Its `finally` block had already restored the current files and database; the service was restarted with the installer's PATH and the full rollback-and-restore drill was rerun successfully. The shipped Linux installer already constructs this PATH and did not have the defect.
- Anonymous access to the production hostname continued to terminate at Cloudflare Access. The in-app verification browser had no owner session, so it stopped at the Access login page; application-side live state was verified through the installed service, database, system manager, and exact release manifest without bypassing authentication.

## Release 1A briefing foundation — 2026-09-20

- TypeScript compilation, frontend syntax, 75 Node tests, 13 Python tests, and `git diff --check` passed before promotion. Briefing tests treat hostile excerpts as evidence only, require open inbox state before presenting a decision, suppress stale and evidence-drifted model proposals, and keep feedback bound to an exact recommendation and revision.
- The workspace now exposes four read-only sections: Now running, Decisions for you, Recommendations, and Next steps. The same four fields appear on each work card and in task review. Every entry links to expandable evidence and reports source confidence.
- The only briefing mutation stores a local `useful`, `wrong`, or `stale` rating after the server confirms that recommendation ID and evidence revision are still current. The briefing path has no dispatcher or workspace mutation route.
- Browser acceptance covered the four-column desktop layout, the single-column 390×844 layout, evidence expansion, feedback submission, and preservation of expanded evidence through a live rerender.
- Release 1A remains in measurement mode. Its definition of done still requires at least 50 owner decisions over at least 14 days, a 20% median time-to-decision improvement from the Release 0 baseline, and no increase in missed actionable decisions.

## Release 1A proposal-only shadow analysis — 2026-09-20

- TypeScript compilation, frontend syntax, 79 Node tests, 13 Python tests, and `git diff --check` passed before promotion. New coverage proves hostile evidence remains bounded data, unexpected action fields are rejected, evidence reservations and budgets are transactional, local-only projects are excluded before prompt construction, and a full shadow cycle does not call send, create, approval, archive, or pause methods.
- A live synthetic `codex exec` probe using `gpt-5.6-luna` returned the strict recommendation schema in 7.5 seconds and reported 13,911 input tokens plus 108 output tokens. The result contained no action or tool request.
- Every analysis is unique to a task and evidence revision. Failed attempts count against the daily call ceiling, token usage is recorded when the route reports it, and abandoned `running` rows are failed during recovery rather than replayed.
- Browser acceptance covered the shadow recommendation in the briefing and task card plus the Runtime status, budget, queue, and recent-result panels at the default desktop viewport and 390×844. No browser warnings or errors were recorded.
- The seven-day measurement period, p50/p95 budget calibration, and Release 1A decision outcome gate remain open. Shadow output is proposal-only throughout measurement and cannot grant Release 1B or Release 4 authority.
