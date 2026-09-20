# Release and launch checklist

Use this checklist for a tagged public release. Copy it into the release issue or pull request and retain the completed record.

## Scope and truth

- [ ] Freeze the release scope and list the owner workflows it improves.
- [ ] Reconcile the README, compatibility matrix, roadmap, and verification record with the shipped behavior.
- [ ] Confirm every advertised control is backed by the current source capability and ownership state.
- [ ] State meaningful limitations in the release notes; do not describe roadmap work as shipped.
- [ ] Confirm the package version, lockfile, sidebar version, and release manifest agree.

## Automated verification

- [ ] Start from a clean tree and run `npm ci`.
- [ ] Run `npm run build`.
- [ ] Run `npm test`.
- [ ] Run `python3 -m unittest discover -s tests -p '*_test.py'`.
- [ ] Confirm GitHub checks pass on macOS and Linux.
- [ ] Run installer syntax and frontend module checks recorded by the current verification process.

## Disposable live verification

- [ ] Verify inventory, detail, staleness, pagination, reconnect, and independent connector failure with non-sensitive work.
- [ ] Exercise each changed mutation with a disposable task and only the permissions required for that action.
- [ ] Restart the hub and confirm pending requests expire safely and uncertain actions are not replayed.
- [ ] Verify a backup and rollback path before promotion.
- [ ] Record exact source versions when the source exposes them; record the gap when it does not.

## Security and privacy

- [ ] Review the diff for credentials, transcripts, private configuration, personal hostnames, repository names, screenshots, logs, and generated databases.
- [ ] Confirm the dashboard still binds to loopback and configured source endpoints remain loopback-only.
- [ ] Confirm credential and device files require `0600` permissions.
- [ ] Verify unauthenticated page, API, event-stream, asset, health, and mutation requests fail closed in public mode.
- [ ] Verify the exact owner identity, issuer, audience, origin, CSRF protection, no-store, and no-index behavior in the target deployment.

## Launch assets

- [ ] Capture a real 30–60 second product walkthrough using synthetic tasks and sanitized machine/source names.
- [ ] Capture current desktop and mobile screenshots from the release candidate; inspect every pixel for private data.
- [ ] Prepare a concise release note: problem, visible outcome, compatibility change, verification, and known limit.
- [ ] Prepare one workflow-specific announcement for each relevant source community; avoid a generic feature list.
- [ ] Link announcements to the same tagged release and compatibility matrix.
- [ ] Assign one place for questions and compatibility reports, and answer with reproducible evidence.

## Promotion

- [ ] Tag the exact verified commit.
- [ ] Install through the normal release installer rather than from an uncommitted checkout.
- [ ] Reconcile the repository commit, installed release manifest, and running sidebar identity.
- [ ] Confirm the prior deployment and private state can be recovered.
- [ ] Publish only after the sanitized walkthrough and installation path have been tested by someone other than the author when possible.

## After release

- [ ] Triage installation failures before adding features.
- [ ] Record confirmed source/version combinations in `docs/COMPATIBILITY.md`.
- [ ] Convert repeated questions into README or hosting guidance.
- [ ] Review launch traffic for activation evidence: successful installs, connected sources, actionable inbox events, and retained users—not stars alone.
