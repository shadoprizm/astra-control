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

Offline behavior and duplicate/uncertain delivery were tested deterministically without disconnecting or interrupting the user's real machines or agents. Approval acceptance, every possible MCP form, automatic worktree creation, Git push/merge/deploy, and remote service failover are not covered by this MVP.

## Open-source preparation

The public repository begins with a clean source snapshot; private deployment history, runtime data, credentials, machine identifiers, and diagnostic artifacts are excluded. Six additional Node authentication tests cover valid signed owner tokens, missing assertions including localhost Host, forged signatures, unauthorized identities, expired tokens, wrong audiences, untrusted hosts/peers, fail-closed configuration, and legacy private access.

Public DNS/Access deployment and shared desktop runtime integration are not established by these unit tests. See the roadmap for remaining live acceptance checks.

## Owner-only deployment hardening

Two additional Node tests exercise authenticated action limits and a running public-mode HTTP server. Anonymous requests to the page, API, event stream, health check, assets, and robots file return 403 with no-store/noindex headers. Forged email/Tailscale headers and a forged JWT with localhost Host are rejected. Registration requests cannot bypass authentication. Total: 16 Node tests plus 4 Python tests.

These checks do not prove that a particular Cloudflare account has an owner-only MFA policy. That policy, proxy-generated login headers, and a real owner sign-in must be verified at deployment.
