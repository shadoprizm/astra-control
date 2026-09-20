# Contributing

ThreadHelm is an early, single-owner coordination dashboard. Contributions are most useful when they start with a real supervision workflow and an observable result.

## Before writing code

Open an issue before a large change. Describe:

- what work is happening, in which source, and on which machine;
- what the owner needs to notice or do;
- what the source can prove through a documented API or protocol;
- what success and failure look like without relying on private task content.

Use the integration-request template for a new source. Observation and control are separate capabilities: discovering a session does not imply that ThreadHelm can safely send, interrupt, approve, or archive it. Include the provider’s documented integration surface and permission/ownership model.

Good first contributions include synthetic source fixtures, compatibility reports, installation fixes, status-semantic tests, redaction tests, and documentation for a verified workflow.

## Development

Use Node 22.19+ and Python 3. Run `npm ci`, `npm run build`, `npm test`, and `python3 -m unittest discover -s tests -p '*_test.py'` before opening a pull request. Test live integrations only with disposable tasks and repositories you own.

Keep provider-specific protocols behind explicit boundaries. Report capabilities honestly: an unavailable action must be disabled with a reason. Do not force ownership of sessions, edit another application's databases, or automatically replay actions with uncertain delivery. Tests should cover the failure modes the change introduces.

If a source contract changes, update `docs/COMPATIBILITY.md`, `config.example.json`, and the relevant architecture or hosting guidance in the same pull request. Record live testing in `docs/VERIFICATION.md` only when it actually occurred; otherwise state the remaining verification gap.

Pull requests should be focused enough to review independently. Explain the owner workflow, security boundary, verification performed, and any limitation that remains. Do not combine an adapter, unrelated UI redesign, and deployment change in one pull request.

## Privacy and security

Never include real task transcripts, credentials, local configuration, private hostnames, or screenshots containing personal work. Use synthetic fixtures. Submit security reports privately as described in SECURITY.md.

Do not weaken loopback binding, source endpoint restrictions, credential-file permissions, application authentication, no-index behavior, payload bounds, or action validation to make a demo easier. A new external access path needs threat-model documentation and tests.

## Community expectations

Be precise and kind. Challenge behavior and assumptions, not people. Compatibility reports are welcome even when they expose a limitation; an honest unsupported state is better than an unreliable control.

Contributions are licensed under the repository's MIT license. This project is independent and is not affiliated with OpenAI or Anthropic.
