# Hosting on your own server

Astra Control can run on a Linux server while its agents run on that server and SSH-connected workstations. A browser does not need a VPN when the dashboard is published through an authenticated HTTPS gateway. Execution-machine connections can remain private.

## Prepare the server

Install Node 22.13+, Python 3, and Codex. Sign in to Codex on each execution machine. Establish noninteractive SSH from the hub to each workstation through your preferred private network. Keep credentials out of the browser and repository.

Clone the project, run `npm ci` and `npm run build`, then create private `data/config.json` from `config.example.json`. The server host should be local (omit `ssh`); workstation hosts should use their existing SSH aliases. Preserve host IDs if migrating an existing database.

Run `python3 scripts/install-linux.py` to install `astra-control.service` under the current user's systemd services. It uses `~/.local/share/astra-control`, binds 127.0.0.1, and preserves existing configuration/state. User services require an active user manager; ask the machine administrator about lingering if it must run after logout.

Inspect with `systemctl --user status astra-control` and `journalctl --user -u astra-control`. Stop with `systemctl --user stop astra-control`. The installer prints a backup location; restore its code/unit files and reload systemd to roll back. Restore package.json and package-lock.json together and run `npm ci --omit=dev --ignore-scripts` for their dependencies.

## Public hostname and browser sign-in

The supported public access configuration uses Cloudflare Tunnel and Cloudflare Access. Before publishing a route:

1. Choose a hostname on a domain you control.
2. Create a self-hosted Access application for the whole hostname, including `/api/*`. Allow only your intended owner identity. Do not use a bypass policy.
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

The JWT guard has automated signed-token tests. A new public domain deployment still needs live owner sign-in and off-network verification; the code alone does not establish a secure deployed route. Shared-runtime desktop integration and Claude Code support are separate roadmap milestones.
