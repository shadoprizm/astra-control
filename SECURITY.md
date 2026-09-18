# Security

This software can launch coding agents with access to your repositories and configured tools. Treat access to the dashboard as access to those capabilities. The MVP is single-owner; it does not implement team roles or tenant isolation.

Keep the service bound to loopback. External access requires an authenticated reverse proxy and application-side identity verification. Never expose the raw Codex App Server or a bare dashboard port to the Internet. See docs/HOSTING.md.

Keep `data/`, local configuration, credentials, transcripts, backups, and logs out of version control. Provider credentials stay on execution machines. The repository contains only synthetic test fixtures and example configuration.

To report a vulnerability, use the repository's private vulnerability reporting feature when enabled. Otherwise contact the maintainer through their GitHub profile to arrange a private report; do not disclose credentials or exploit details in a public issue.

Only the current main branch receives fixes during the preview period. See docs/VERIFICATION.md for what has and has not been tested.
