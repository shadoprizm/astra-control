# Security

This software can launch coding agents with access to your repositories and configured tools. Treat access to the dashboard as access to those capabilities. The MVP is single-owner; it does not implement team roles or tenant isolation.

Keep the service bound to loopback. External access requires an authenticated reverse proxy and application-side identity verification. Never expose the raw Codex App Server or a bare dashboard port to the Internet. See docs/HOSTING.md.

Keep `data/`, local configuration, credentials, transcripts, backups, and logs out of version control. Provider credentials stay on execution machines. The repository contains only synthetic test fixtures and example configuration.

To report a vulnerability, use the repository's private vulnerability reporting feature when enabled. Otherwise contact the maintainer through their GitHub profile to arrange a private report; do not disclose credentials or exploit details in a public issue.

Only the current main branch receives fixes during the preview period. See docs/VERIFICATION.md for what has and has not been tested.

## Owner-only Internet deployment

Protect the entire hostname with Cloudflare Access. Allow one exact owner identity, require an independent second factor (prefer a security key/passkey), use short sessions, and leave signup, Access access requests, broad domain rules, service-token bypasses, and anonymous paths disabled. The application has no account registration route. Set its allowedEmails list to the same single owner.

Treat an authenticated owner as having the execution machine's existing agent permissions. This release does not provide OS-level isolation from that account. Keep provider approval policies enabled, and do not publish raw agent runtimes or SSH ports.

The autonomous coordinator has the same bounded Control Centre authority as the owner UI. Its planning subprocess is read-only and source excerpts are explicitly treated as untrusted, but accepted structured actions can still start agents, send instructions, interrupt work, archive tasks, and answer supported approval requests. Deterministic validation constrains identifiers and action types; it cannot prove that every approved agent command is semantically safe. Keep the dashboard owner-only, phrase broad delegation carefully, and inspect the recorded per-action outcomes. Permanent thread deletion, deployment, push/merge, and worktree removal are not exposed to the coordinator.

The app sends noindex/nofollow/noarchive/nosnippet, no-store, a restrictive CSP, and other security headers on successes and errors. It supplies a robots exclusion file and noindex HTML metadata. The reverse proxy must also prevent indexing of its own login/error pages, which do not pass through the application. Crawling directives are advisory; authorization protects task content. Public DNS and certificate records can reveal a hostname. Do not publish personal deployment addresses in this repository.

Owner mutations require a valid signed identity, the configured origin, and a CSRF token. Action bursts and open event streams are bounded. These limits do not replace the gateway's network abuse controls. Use Cloudflare Access logs for authentication auditing and the application's command history for dispatched actions. Authentication testing must cover unauthorized users and unauthenticated API/SSE requests before enabling a public route.
