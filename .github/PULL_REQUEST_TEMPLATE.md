## Owner workflow

<!-- What becomes observable or actionable for the owner? Link the issue. -->

## Capability and safety boundary

<!-- Which source capabilities change? What remains unsupported or source-native? -->

- [ ] Unsupported controls remain disabled or omitted with a reason.
- [ ] No source database, authentication state, permission policy, or live process is modified outside a documented interface.
- [ ] Payload bounds, redaction, loopback/private transport, and independent adapter failure behavior are preserved.
- [ ] Fixtures, logs, and media are synthetic and contain no private work data.

## Verification

<!-- List automated checks and any disposable live verification actually performed. -->

- [ ] `npm run build`
- [ ] `npm test`
- [ ] `python3 -m unittest discover -s tests -p '*_test.py'`
- [ ] New failure modes have automated coverage.

## Documentation

- [ ] `docs/COMPATIBILITY.md` reflects any source or capability change.
- [ ] Configuration, architecture, hosting, roadmap, and verification docs are updated where relevant.
- [ ] Remaining limitations and unverified live behavior are stated explicitly.

