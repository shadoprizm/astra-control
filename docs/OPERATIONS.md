# Operations

Run one active hub for a deployment. State is stored in `data/control.sqlite`, alongside private `data/config.json`. The database contains normalized source metadata, bounded latest excerpts, the watch list, action inbox, coordinator history, and Codex command delivery records. Full source transcripts are not mirrored.

## macOS

Create `data/config.json`, commit the release, then run `python3 scripts/install-local.py`. The installer refuses a dirty source tree, installs exact dependencies, runs all tests and the build before stopping the service, copies a checksum-verified artifact to `~/.local/share/astra-control`, preserves existing configuration/state, backs up code/data and the LaunchAgent, writes `release.json`, and installs the per-user `io.astra.control` service. Node, npm, and Git must be on PATH. The machine must remain awake.

Stop with `launchctl bootout gui/$(id -u)/io.astra.control`. Restore deployment files and the LaunchAgent from the printed backup location to roll back. Keep `data/` to preserve the inbox.

## Linux

See docs/HOSTING.md. Install a user service with `python3 scripts/install-linux.py`. It applies the same clean-tree, test, build, checksum, release-manifest, backup, and post-start service checks as the macOS installer. It preserves the data directory and separately backs up configured credential/device files. It does not configure DNS, tunnels, SSH keys, or system firewall rules.

## Updates and migration

Finish or pause dashboard-managed work before restarting or moving the hub: the current version owns App Server subprocesses, so stopping it closes its runtime connections. Pending permission IDs expire after restart. Inspect tasks before resuming; never replay uncertain actions automatically.

Back up SQLite with its backup API or after stopping the hub; copying only a live `.sqlite` file can omit WAL data. Back up private configuration and connector credential/device files separately, preserving `0600` permissions. Preserve host and source IDs when moving the hub so task/source keys remain stable. Mark transferred managed sessions as unowned until their state is reconciled. Do not run two hubs against the same database.

The schema migration is idempotent and retains existing Codex task keys, watches, managed state, inbox links, and command history. Restore and verify the backup before promotion. An incompatible external adapter is expected to show its own health error while the rest of the dashboard remains available; do not remove its last snapshot merely because a poll failed.

The CLI login, SSH setup, and repository paths belong to each execution machine. A host that cannot be reached is displayed as offline; that does not prove its agents stopped.

## Coordinator authority

The coordinator runs only when the owner submits a coordinator message. Its default configuration is `{"model":"gpt-6-astra","reasoningEffort":"xhigh","maxActions":12}`; override those fields under `coordinator` in `data/config.json` when necessary. A response may execute up to `maxActions` validated controls immediately, so treat dashboard access as task-control access and review the Activity and coordinator execution results after broad instructions. Coordinator planning failures execute no actions. Individual action failures do not cause implicit retries and do not prevent later independently validated actions from reporting their own result.
