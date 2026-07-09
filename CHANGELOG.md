# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.1.0] - 2026-07-09

### Fixed

- Commented-out `define()` lines are no longer audited as if they were active. A commented `// define('WP_DEBUG', true);` no longer raises a false "WP_DEBUG is on" alarm, and a commented `/* define('DISALLOW_FILE_EDIT', true); */` is now correctly reported as still enabled instead of passing (which was a false sense of security). The comment stripping is string-aware, so a salt containing `/`, `*`, or `#` is preserved intact.

### Added

- The audit now recognizes the wp-config-sample.php database placeholders and notes that the pasted file looks unconfigured.

### Changed

- The Paste button is always the green primary action and replaces the box in one click.

## [1.0.1] - 2026-07-07

### Fixed

- Fixed a duplicate id that sent generated salts into the section heading instead of the output box, breaking the salt generator and causing horizontal overflow on mobile. Salts now render in their own field and the heading is intact.
- No horizontal page shift on mobile, snippets wrap, and long inline URLs in the docs wrap instead of clipping.

## [1.0.0] - 2026-07-07

First stable release.

### Added

- Security and performance audit of a pasted wp-config.php, with findings ranked by severity and each carrying the exact line to fix it.
- Checks for security keys and salts (missing, placeholder, duplicate, short), debug exposure, empty or default database password, file editing lockdown, forced SSL admin, default table prefix, automatic updates, and performance constants.
- A 0 to 100 score as a rough hardening indicator.
- Fresh salt generator using the Web Crypto API, producing eight quote-safe 64-character keys.
- PHP-aware parser that correctly reads salts containing parentheses, quotes, and escapes.
- Dependency-free ES module engine (docs/config.js) with 10 Node tests.
- Browser UI in the shared suite design with light and dark themes and a ?demo deep link.

[1.0.1]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.0.1
[1.0.0]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.0.0
