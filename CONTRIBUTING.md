# Contributing

The most useful contributions are hardening checks worth adding and real wp-config.php shapes the parser stumbles on.

## Suggest a check

Open an [issue](https://github.com/JaydenYoonZK/wp-config-doctor/issues/new/choose) describing the constant or pattern, why it matters, and a source (a vendor doc or a well-known hardening guide). Checks should cite a real risk, not just a preference.

## Development

No build step, no dependencies. The engine is a pure ES module (docs/config.js); the UI (docs/app.js) only touches the DOM.

```bash
npm test         # run the suite
npm run serve    # local server on :8411
```

New rules and parser changes need a test in test/config.test.mjs, ideally with both a passing and a failing fixture.

## Pull requests

Small and focused merges fastest. For anything structural, open an issue first.
