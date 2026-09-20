# Hosting on your own server

ThreadHelm can run on a Linux server while its agents run on that server and SSH-connected workstations. A browser does not need a VPN when the dashboard is published through an authenticated HTTPS gateway. Execution-machine connections can remain private. The installer migrates private state from an earlier `~/.local/share/astra-control` installation and retires the former `astra-control.service` unit only after the new `threadhelm.service` is active.

## Prepare the server

Install Node 22.19+, Python 3, and Codex. Sign in to Codex on each execution machine. Establish noninteractive SSH from the hub to each workstation through your preferred private network. Keep credentials out of the browser and repository.

Clone the project and create private `data/config.json` from `config.example.json`. The server host should be local (omit `ssh`); workstation hosts should use their existing SSH aliases. Preserve host IDs if migrating an existing database.

Commit or stash every source change, then run `python3 scripts/install-linux.py` to install `threadhelm.service` under the current user's systemd services. The installer refuses a dirty tree, runs `npm ci`, the complete test suite, and a fresh build before stopping the service. It backs up the prior deployment and private state, checksum-verifies the copied artifact, writes an exact version/commit `release.json`, installs production dependencies, and verifies that systemd reports the service active. It uses `~/.local/share/threadhelm`, binds 127.0.0.1, and preserves existing configuration/state. User services require an active user manager; ask the machine administrator about lingering if it must run after logout.

## External source connectors

Every configured network source endpoint must resolve to loopback; the server refuses non-loopback Hermes, OpenClaw, Open WebUI, and Runtime URLs. Put each secret in its own owner-readable `0600` file outside the repository. The Claude Code adapter has no provider credential. It either reads absolute `projectsDir` and optional `sessionsDir` paths on the hub, or uses a pre-existing noninteractive SSH connection to query a loopback-only ThreadHelm instance on the workstation that owns those files:

```json
{
  "id": "claude-workstation",
  "name": "Claude Code",
  "adapter": "claude",
  "hostId": "workstation",
  "bridge": {"ssh": "workstation", "baseUrl": "http://127.0.0.1:4318"},
  "maxSessions": 500,
  "locality": {"providers": {"anthropic": "cloud"}}
}
```

The bridge invokes only bounded read endpoints over SSH, remaps the upstream source identity to the hub source, and never exposes the workstation endpoint to the network. The workstation service must already have its local Claude source configured and remain available. The example configuration shows the permitted Hermes profiles; the adapter also enforces that allowlist and will not ingest excluded family profiles.

Locality is accepted only from source-reported fields, exact model IDs found in the local Runtime catalog, or explicit `locality.providers`, `locality.models`, and `locality.profiles` configuration. Keep aliases such as `Astra Smart Router` and Open WebUI route names unmapped unless the source reports their resolved route.

Open WebUI must use a route-restricted API key from the owner account. ThreadHelm calls only owner-scoped chat list, pinned, detail, and model endpoints. It never calls user/admin inventory. Configure `deepLinkBase` separately if browser links should use an authenticated public Open WebUI origin; the data API remains loopback.

OpenClaw uses `@openclaw/gateway-client` and creates a stable `0600` Ed25519 identity at `deviceFile`. The first connection uses the shared bootstrap token from `tokenFile` and may report `PAIRING_REQUIRED`. On the Gateway host, inspect `openclaw devices list` and approve that exact ThreadHelm request. It asks only for `operator.read` and `operator.approvals`; a request containing write/admin scope is not expected. The issued device token is stored back into `deviceFile`. Keep both files in private backups.

Hermes requires a stable file-backed `HERMES_DASHBOARD_SESSION_TOKEN`. Write the same value into the configured token file and the Hermes service environment before restarting both services; an automatically rotating dashboard token will make the connector fail closed.

The optional Runtime connector reads the broker's `/v1/models`, `/router/status`, and safe metrics endpoints. Use `loadedModelUrls` for loopback-only llama.cpp `/models` and Ollama `/api/ps` endpoints when model-load state is exposed by separate runtimes. Each endpoint fails independently.

Inspect with `systemctl --user status threadhelm` and `journalctl --user -u threadhelm`. The authenticated dashboard, `/api/state`, and `/healthz` report the installed version/commit and captured inventory totals. Stop with `systemctl --user stop threadhelm`. The installer prints a backup location; restore its code/unit/manifest files and reload systemd to roll back. Restore package.json and package-lock.json together and run `npm ci --omit=dev --ignore-scripts` for their dependencies.

## Public hostname and browser sign-in

The supported public access configuration uses Cloudflare Tunnel and Cloudflare Access. Before publishing a route:

1. Choose a hostname on a domain you control.
2. Create a self-hosted Access application for the whole hostname, including `/api/*`. Allow one exact owner identity. Require independent MFA, preferably a security key/passkey, and use a one-hour application session. Disable Access access requests, app-launcher listing, and any bypass policy. Verify the account supports the required MFA configuration before publishing.
3. Record the application audience and team issuer. Add this to private `data/config.json`:

```json
{
  "port": 4318,
  "publicOrigin": "https://control.example.com",
  "auth": {
    "mode": "cloudflare-access",
    "issuer": "https://your-team.cloudflareaccess.com",
    "audience": "YOUR_APPLICATION_AUDIENCE",
    "allowedEmails": ["owner@example.com"]
  },
  "hosts": [
    {"id": "server", "name": "Server", "codex": "/absolute/path/to/codex"},
    {"id": "workstation", "name": "Workstation", "ssh": "workstation", "codex": "/absolute/path/to/codex"}
  ]
}
```

4. Restart the app and verify that requests without a signed assertion return 403, including requests using a localhost Host header.
5. Route only the chosen hostname through your local cloudflared connector to `http://127.0.0.1:4318`. Keep existing tunnel routes intact. Never route the raw App Server port.
6. Test a signed-in owner, an unauthorized identity, an anonymous browser, API requests, and event-stream reconnect from outside your private network.

The application verifies the Access JWT signature, issuer, audience, expiry, and owner email. It does not trust an email header by itself. Authentication also applies to health checks and localhost requests in this mode. Open event streams close at token expiry and reconnect through authentication. Token expiry is the revocation boundary for already-open streams.

See [Cloudflare JWT validation](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/). `publicOrigin` without an authentication configuration is rejected at startup.

## Existing private deployments

Tailscale Serve remains supported with `publicOrigin` and `allowedLogin`. Its identity-header mode is only for a trusted local Tailscale proxy; do not use it behind a public reverse proxy. A deployment chooses one authentication mode. Separate legacy deployments can remain available during migration but should not both control the same sessions.

## Current status

The JWT guard has automated signed-token tests, and the reference production installation has passed owner sign-in, anonymous redirect, off-network reachability, exact release identity, and live inventory acceptance. Every new installation must repeat those checks; the code alone does not establish a secure deployed route. Shared-runtime desktop integration and Claude session controls remain separate roadmap milestones.

## Search exclusion

All application responses include `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` and `Cache-Control: no-store`. HTML has matching robots metadata. `/robots.txt` disallows every path and remains behind authentication. Protecting the full hostname prevents crawlers from obtaining workspace content. Verify the Access login/error responses separately for noindex; origin headers cannot control responses generated by the gateway. No public sitemap or registration endpoint exists.

The public hostname itself may be discoverable through DNS/certificate records. Never rely on an unlisted address or robots directives as an access control.
