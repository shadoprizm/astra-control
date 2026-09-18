# Operations

Run one active hub for a deployment. State is stored in `data/control.sqlite`, alongside private `data/config.json`. The database contains task excerpts, the watch list, action inbox, coordinator history, and command delivery records.

## macOS

Build and test, create `data/config.json`, then run `python3 scripts/install-local.py`. The installer copies the runtime to `~/.local/share/astra-control`, preserves existing configuration/state, backs up code and the LaunchAgent, and installs the per-user `io.astra.control` service. Node must be on PATH. The machine must remain awake.

Stop with `launchctl bootout gui/$(id -u)/io.astra.control`. Restore deployment files and the LaunchAgent from the printed backup location to roll back. Keep `data/` to preserve the inbox.

## Linux

See docs/HOSTING.md. Install a user service with `python3 scripts/install-linux.py`. The script backs up replaced files and preserves an existing data directory. It does not configure DNS, tunnels, SSH keys, or system firewall rules.

## Updates and migration

Finish or pause dashboard-managed work before restarting or moving the hub: the current version owns App Server subprocesses, so stopping it closes its runtime connections. Pending permission IDs expire after restart. Inspect tasks before resuming; never replay uncertain actions automatically.

Back up SQLite with its backup API or after stopping the hub; copying only a live `.sqlite` file can omit WAL data. Preserve host IDs when moving the hub so task keys remain stable. Mark transferred managed sessions as unowned until their state is reconciled. Do not run two hubs against the same database.

The CLI login, SSH setup, and repository paths belong to each execution machine. A host that cannot be reached is displayed as offline; that does not prove its agents stopped.
