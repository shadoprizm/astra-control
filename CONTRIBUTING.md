# Contributing

Astra Control is an early, single-owner coordination dashboard. Start with an issue describing the user workflow and the observable result before undertaking a large change.

Use Node 22.13+ and Python 3. Run `npm ci`, `npm run build`, `npm test`, and `python3 -m unittest discover -s tests -p '*_test.py'` before opening a pull request. Test live integrations only with disposable tasks and repositories you own.

Keep provider-specific protocols behind explicit boundaries. Report capabilities honestly: an unavailable action must be disabled with a reason. Do not force ownership of sessions, edit another application's databases, or automatically replay actions with uncertain delivery. Tests should cover the failure modes the change introduces.

Never include real task transcripts, credentials, local configuration, private hostnames, or screenshots containing personal work. Use synthetic fixtures. Submit security reports privately as described in SECURITY.md.

Contributions are licensed under the repository's MIT license. This project is independent and is not affiliated with OpenAI or Anthropic.
