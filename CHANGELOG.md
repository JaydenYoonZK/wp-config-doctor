# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.3.13] - 2026-07-10

### Fixed

- Text no longer flashes and re-settles mid fade when switching between light and dark mode. Text color inherits, so during the old per-element fade every element kept re-easing its parent's already animating color, which made type lag behind the page and snap late. The switch now crossfades the whole page as a single composited snapshot through the View Transitions API, so text and background move together in one smooth pass. The theme toggle is excluded, so its sun and moon morph still plays live. Browsers without view transitions fall back to fading backgrounds, borders and shadows only, with text changing in one clean step.

## [1.3.12] - 2026-07-10

### Fixed

- The inline code chip inside alerts no longer renders as a dead grey block in light mode. Its 35% black wash was tuned for dark backgrounds; over the light pink alert it read as mud. In light mode the chip is now a crisp near-white card with a hairline red keyline, so the decoded payload stands out cleanly.

### Changed

- Switching themes now fades the whole page between night and day over half a second instead of snapping instantly, which could startle or dazzle, especially dark to light at night. The fade covers colors only (backgrounds, text, borders, shadows, SVG fills), and the theme toggle is excluded so its sun and moon morph keeps its own spring timing.

## [1.3.11] - 2026-07-10

### Fixed

- The theme toggle now shows the crescent moon on phones. The previous build morphed the mark by animating SVG geometry (the circle's radius and the mask position) from CSS, which desktop browsers support but iOS Safari does not apply, so dark mode on a phone showed a plain dot instead of a moon. The switch is rebuilt on opacity and transform only, the sun spins away as a true crescent path spins in, which every mobile browser animates. Same look on desktop, now correct everywhere.

## [1.3.10] - 2026-07-10

### Changed

- The theme toggle is redesigned from an emoji swap into a morphing mark. One vector drawing plays the whole switch: the sun's core grows into the moon while a masked bite slides in to carve the crescent, the eight rays spring away with an overshoot, and the mark tilts to seat the crescent, all reversed when switching back. The moon is brand chartreuse at night and the sun is warm amber by day, the round button trades the key edge for a soft brand halo on hover, and a tooltip appears below it saying which mode a click will switch to, on hover and keyboard focus only, never on touch. The morph is disabled under reduced-motion preferences.
- The README preview is regenerated.

## [1.3.9] - 2026-07-10

### Fixed

- The back-to-top button no longer casts a heavy black smudge in light mode. Its shadow was a single wide dark-theme blur that was never re-tuned for a cream background. Each theme now gets a layered shadow of its own: a tight warm contact shadow plus a soft chartreuse halo in light mode, and a grounded contact shadow with a gentle chartreuse under-glow in dark, with matching hover and pressed variants.

## [1.3.8] - 2026-07-10

### Changed

- Removed the pulsing status dot from the privacy pill. The animated dot has become one of the most recognizable template cliches on the web, and it was redundant next to the lock icon that already carries the meaning. The pill now leads with the lock alone, with its padding evened out.
- The README preview is regenerated.

## [1.3.7] - 2026-07-10

### Added

- Tactile depth across the interface. Every button is now built like a physical key: a hard edge shadow beneath it, a soft ambient shadow, and a hairline top bevel. Hovering lifts the key slightly, and pressing travels it down while the edge collapses underneath, a real press you can feel. Primary buttons carry a chartreuse edge and glow, secondary buttons use a warm brand-brown edge in light mode and a deep neutral one in dark, disabled buttons stay flat since a dead control should not look pressable, and the movement is disabled under reduced-motion preferences while the shadow feedback remains. Cards gain a quiet layered elevation per theme.
- The README preview is regenerated.

## [1.3.6] - 2026-07-10

### Fixed

- The menu's hover state no longer turns grey, and no longer sticks. Hovering used a grey panel tone that clashed with the brand language, and on phones a tap glued that grey pill to the last-tapped item because touch browsers keep a sticky hover. Hover styling now only applies on devices with a real pointer and uses a faint chartreuse brand tint, while the active item keeps the stronger chartreuse wash and always wins when it is both hovered and active.
- The active menu item now also carries `aria-current`, so screen readers hear which section you are in, kept in sync with the highlight by the same scroll logic.

## [1.3.5] - 2026-07-10

### Changed

- Light mode brings the brand home. The signature chartreuse #abcf37 button with dark ink text, the same button dark mode has always had, is now the primary action in light mode too, and chartreuse drives the accent washes, the menu band, the page glow, and the decorative scene. The airy cream background and crisp white cards return, links use a fresh deep green that passes AA on every chartreuse wash, and the verdict colors return to the vivid set with bright washes. Every rendered text pair measures 4.5:1 or better on the live page (the brand button measures above 10:1), and the dark theme is untouched.
- The README preview is regenerated for the new palette.

## [1.3.4] - 2026-07-10

### Changed

- Light mode now uses the studio palette chosen from design references: sand background #EEE3CF, warm ivory cards, coral #FE6E54 primary buttons with dark ink text (mirroring dark mode's dark-on-chartreuse buttons), a deep coral accent for links and highlights, sage #93A86C washes with the dark green #375554 as success text, a pale gold #FCDB99 wash under warning pills, teal #40A5A0 washes with indigo #363D6E as info text, and a coral, sage, and teal decorative scene. Every rendered text pair measures 4.5:1 or better on the live page, and the dark theme is untouched.
- The README preview is regenerated for the new palette.

## [1.3.3] - 2026-07-10

### Changed

- Light mode is redesigned around a warm editorial palette inspired by premium product sites: terracotta coral becomes the accent for buttons, links, and highlights, the success wash turns sage, the danger red deepens toward crimson so it stays clearly apart from the coral, type warms one step browner, the menu band turns soft sage, and the decorative scene (orbs, spheres, cube wireframes) moves to coral, sage, and warm brown. The cream background and the whole dark theme are untouched, and every rendered text pair measures 4.5:1 or better on the live page.
- The README preview is regenerated for the new light palette.

## [1.3.2] - 2026-07-10

### Changed

- Light mode's palette is rebuilt around fresh hues instead of darkened earth tones. The accent is now a vivid deep green, success is emerald, the warning orange is clear instead of brown, and the red is brighter. Chip and pill washes are tinted from bright brand colors rather than from the dark text colors, so they read as lively pastels instead of a gray film, and the light-mode decorative constants (page glow, cube wireframes, spheres) moved from olive to brand chartreuse. Every rendered text pair was re-measured at 4.5:1 or better on the live page; dark mode is untouched.
- The README preview is regenerated to show the new light palette beside dark mode.

## [1.3.1] - 2026-07-10

### Added

- CI now runs the test suite and browser module syntax checks on Linux, Windows, and macOS.
- Security reporting is documented through GitHub private vulnerability reports.
- Regression coverage now verifies that `DISALLOW_FILE_MODS` also satisfies the dashboard file-editor lockdown check.

### Fixed

- `DISALLOW_FILE_MODS` no longer triggers a false warning about the dashboard file editor being enabled. WordPress treats it as the broader file-modification lockdown, so it also disables the file editor.
- The README stars badge now links to the repository page instead of the zero-star `/stargazers` page that GitHub returns as 404.
- The browser tool cache-busts its config audit engine import so Pages serves the current audited code.

## [1.3.0] - 2026-07-09

### Added

- Flags `WP_HOME` and `WP_SITEURL` when they are hardcoded to an insecure `http://` address. Pinning either to http forces WordPress to build links and redirects over plain HTTP, which breaks a site served over HTTPS, triggers mixed-content warnings, or causes a redirect loop when the server upgrades http to https. A concatenated value like `'http://' . $host` is left alone, since it is dynamic rather than a fixed insecure address.

### Notes

This release followed a second audit, this time hammering the PHP parser with real-world wp-config patterns: environment-variable passwords (`getenv(...)`, correctly not read as an empty password), double-quoted constant names and table prefixes, several `define()` calls on one line, Windows line endings, multi-line calls, and heredoc values (which no longer corrupt the defines that follow them). All parsed correctly, and the earlier fixes (comment stripping, PHP string truthiness, the `WP_ALLOW_REPAIR` and `WP_DEBUG_LOG` checks, and the score-versus-issues reconciliation) remain in place.

## [1.2.6] - 2026-07-09

### Changed

- Light mode's status colors are livelier and now measurably meet WCAG AA. The olive green, brown amber, and muted red came from darkening alone, which made them muddy; they are replaced with fully saturated deep equivalents (accent #4c7a00, green #1d7a25, orange #ba4700, red #c62a22), the soft chip tints were eased to match, primary buttons in light mode use white text on the deep accent, and light muted text was deepened one step. Measured on the rendered page, every status pill, link, button label, and muted text now sits at 4.5:1 or better; the previous accent and the muted text on tinted chips quietly failed. Dark mode is untouched.

## [1.2.5] - 2026-07-09

### Added

- The hero illustration now has a light-mode version. It is the same inline drawing recolored through the theme tokens, so it follows the theme toggle instantly and always stays in step with the palette. Dark mode is unchanged.

## [1.2.4] - 2026-07-09

### Fixed

- Clicking a menu item now always highlights the item you clicked. The highlight was driven by an observer watching a band in the middle of the viewport, but a menu jump lands the section heading at the top, outside that band, so the green pill often stayed on a section the page had merely scrolled past. The active item is now computed directly from the scroll position: the last section whose heading sits above the reading line under the header, with the last section winning at the very bottom of the page.

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

[1.3.13]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.3.13
[1.3.12]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.3.12
[1.3.11]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.3.11
[1.3.10]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.3.10
[1.3.9]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.3.9
[1.3.8]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.3.8
[1.3.7]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.3.7
[1.3.6]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.3.6
[1.3.5]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.3.5
[1.3.4]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.3.4
[1.3.3]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.3.3
[1.3.2]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.3.2
[1.3.1]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.3.1
[1.2.6]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.2.6
[1.2.5]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.2.5
[1.2.4]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.2.4
[1.2.3]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.2.3
[1.3.0]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.3.0
[1.2.2]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.2.2
[1.2.1]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.2.1
[1.2.0]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.2.0
[1.1.0]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.1.0
[1.0.1]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.0.1
[1.0.0]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.0.0
