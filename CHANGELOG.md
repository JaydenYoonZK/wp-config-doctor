# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.2.3] - 2026-07-09

### Changed

- The menu now sits in its own tinted band under the brand bar on every screen size, giving the header a clear hierarchy: brand and theme toggle on top, menu below, every item always visible. The whole header is sticky again on all devices, and section jumps measure the header instead of assuming its height, so they land exactly below it however many rows the menu wraps to.

## [1.2.2] - 2026-07-09

### Fixed

- On phones the menu no longer hides items behind an invisible horizontal scroll. Below 720px it wraps onto its own row under the brand with every item visible and centered, and the bar scrolls away with the page instead of pinning several rows to a small screen; the back-to-top button brings it back into reach. Desktop keeps the single sticky row, and section jumps account for the new offsets.

## [1.2.1] - 2026-07-09

### Fixed

- The Paste button works on iPhone and iPad again. The previous touch flow skipped the iOS clipboard confirmation and waited for a manual paste that most people never discover, so the button looked dead. The clipboard is now requested the same way on every device: iOS shows its Paste confirmation at the tap point, and confirming it fills the box and runs the audit in one motion. If the read is declined, the box is focused with a hint and the audit runs by itself as soon as a paste lands. An empty clipboard now says so.

## [1.2.0] - 2026-07-09

### Fixed

- `WP_DEBUG` set to a string is now correctly reported as on. PHP treats every non-empty string as true, so `define('WP_DEBUG', 'false')` actually enables debug mode, a costly mistake the audit used to miss entirely. It now flags the string form specifically and explains why.
- `WP_DEBUG_LOG` pointed at a custom path is no longer flagged. That is the recommended way to move the log out of the web root, so nagging about it was wrong. Only the default `true` (which writes to the web-readable `wp-content/debug.log`) is flagged now.
- Informational notes no longer inflate the issue count. A fully hardened file scored 100 but still claimed a handful of "issues to review", which were only tidiness suggestions. The headline count now reflects actual issues and matches the score.

### Added

- Check for `WP_ALLOW_REPAIR`. Left enabled, it exposes an unauthenticated database repair page at `/wp-admin/maint/repair.php`, so the audit flags it as high severity.
- A Content Security Policy that sets `connect-src 'none'`, enforcing the "nothing leaves your browser" promise at the browser level rather than only in the code.

### Changed

- Accessibility: the paste box now has a real label, the results region announces itself to screen readers, the score is exposed as text alongside the dial, and the back-to-top button leaves the tab order when it is hidden.
- The score dial now fills from the top instead of the three o'clock position, matching the hero illustration.
- The salt generator no longer draws spaces into a key, avoiding an invisible leading or trailing space.

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

[1.2.3]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.2.3
[1.2.2]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.2.2
[1.2.1]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.2.1
[1.2.0]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.2.0
[1.1.0]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.1.0
[1.0.1]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.0.1
[1.0.0]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.0.0
