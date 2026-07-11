# Changelog

All notable changes to this project are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.4.11] - 2026-07-11

### Changed

- Social sharing metadata carries explicit X and Twitter titles and descriptions, matching the other tools in the suite.

## [1.4.10] - 2026-07-11

### Fixed

- A disabled primary button no longer blends the pressed-key look with the dashed disabled outline. The primary styling outranked the disabled state, so buttons such as a not-yet-usable submit looked clickable and not clickable at once, with light mode even painting the full chartreuse key under the dashes. Disabled primaries now render as a flat ghost in both themes.

## [1.4.9] - 2026-07-11

### Fixed

- Tables are readable on phones. The old narrow-screen treatment turned tables into sideways-scrolling boxes with no hint that more columns existed, so status pills were chopped mid-word and explanation columns sat invisible off-screen. Rows now restack as cards on narrow screens: names and pills flow on one line, the explanation wraps at full width beneath them, decorative header rows step aside, and nothing scrolls sideways.

## [1.4.8] - 2026-07-11

### Changed

- The film grain steps up once more in both themes. With the fine dot size this reads as richer paper texture rather than noise. README previews regenerated.

## [1.4.7] - 2026-07-11

### Changed

- The film grain is a touch more present in both themes, still well below its original strength, keeping gradients dithered while the texture stays a quiet detail. README previews regenerated.

## [1.4.6] - 2026-07-11

### Changed

- Button shadows are lighter. The ground shadow under the 3D keys drops much of its opacity and trades its tight spread for a softer blur, so it reads as ambient light falloff instead of an ink block, and the hard edge tone eases slightly in both themes. The key geometry and travel are unchanged. README previews regenerated.

## [1.4.5] - 2026-07-11

### Added

- The resize corner of text boxes shows a hand-drawn affordance again: two diagonal grip lines in brand green floating on a transparent square, so people can tell the box expands while the rounded corner stays clean. Light mode uses the deeper green for contrast on cream.

## [1.4.4] - 2026-07-11

### Fixed

- Scrollbars inside rounded boxes no longer break the corner. A scrollbar strip is always rectangular, so the glow, the center rail, and the system resize grip read as a square poking through a text box's corner radius. Inner scrollables now show a clean chartreuse pill with no glow or rail and an invisible resizer, while the page scrollbar, whose corners really are square, keeps the full glowing treatment.

## [1.4.3] - 2026-07-11

### Changed

- The scrollbar now carries the brand. The thumb is a glowing chartreuse key-cap pill with the same top-lit gradient the buttons use, riding a faint chartreuse center rail. It brightens and thickens under the pointer and charges up with a hotter gradient and stronger glow while being dragged. Firefox shows a solid chartreuse thumb through the standard scrollbar properties.

## [1.4.2] - 2026-07-11

### Added

- Custom scrollbars, on the page and inside any scrollable box such as the paste areas and code snippets. A slim rounded pill floats on a fully transparent track in each theme's surface tone, thickens and brightens under the pointer, and turns chartreuse while being dragged, the same accent the buttons use. WebKit browsers get the full treatment and Firefox gets the matching thin themed scrollbar through the standard properties.

## [1.4.1] - 2026-07-11

### Added

- Selected text now wears the brand. Highlighting any text shows the same chartreuse-with-dark-ink pairing the primary buttons use, identical in both themes, replacing the browser's default blue.

## [1.4.0] - 2026-07-11

### Added

- The parser now reports dynamic security constants, duplicate definitions, non-string salts, dynamic salts, and invalid environment types without claiming a false pass.
- Regression coverage now includes code-like secrets, heredocs, uppercase PHP function names, concatenated expressions, duplicate constants, PHP string escapes, dynamic lockdown values, input limits, environment-aware debug mode, and random-source failures.
- Engine limits cap pasted input at 1 MiB, and CI covers supported Node.js releases 20, 22, and 24 alongside Windows and macOS.

### Changed

- Parsing now uses a lexical pass that separates executable PHP from strings, comments, heredocs, and nested expressions before recognizing calls or assignments.
- Debug mode on a declared local or development environment is informational instead of lowering the hardening score.
- Salt generation uses rejection sampling to avoid modulo bias and rejects duplicate output from a faulty random source.
- Privacy, static-analysis limits, salt rotation, and rule sources are documented more precisely.

### Fixed

- Code-like text inside a password, salt, quoted string, or heredoc can no longer create false findings for constants, table prefixes, or `ini_set()` calls.
- A quoted literal followed by concatenation is no longer mistaken for the complete value of a dynamic expression.
- PHP function names are recognized case-insensitively, quoted string escapes are decoded consistently, and unterminated strings are not trusted.
- `display_errors` values such as `Off`, `false`, and `No` are no longer reported as enabled.
- String and integer forms of `WP_DEBUG_LOG` that select the default log path are now reported consistently.

## [1.3.25] - 2026-07-11

### Fixed

- The cursor dust now lands directly on the pointer. The trail canvas is a replaced element, so inset alone did not stretch it and it laid out at its intrinsic retina-scaled size; on high-density displays every spark drew at a multiple of the cursor's position, drifting further from it toward the bottom right of the page. The canvas is now explicitly stretched to the viewport, verified at retina density.

## [1.3.24] - 2026-07-11

### Added

- A magical cursor trail. Tiny chartreuse sparks with the occasional twinkling four point star follow the pointer and burn out about a second after it rests. Dark mode gets pale glowing dust, light mode a deeper green so it stays visible on cream. It runs on a single fixed canvas, spawn rate follows how far the pointer travels, and the animation loop stops the moment the last spark dies, so an idle page costs nothing. Touch devices never load it and reduced motion turns it off entirely.

## [1.3.23] - 2026-07-11

### Changed

- The film grain is finer and milder. Each grain dot is now half its previous size, one device pixel on typical phone screens, and the overall intensity is reduced by about a quarter in both themes. Finer grain dithers banding more efficiently per unit of opacity, so gradients stay smooth while the texture recedes to a whisper. README previews regenerated.

## [1.3.22] - 2026-07-11

### Fixed

- The theme toggle no longer glitches when tapped on phones. Touch browsers pin the hover state to the last-tapped control, so after a tap the toggle sat stuck mid-twist with its hover halo on, layered over the press spin. All decorative hover styling for buttons, the toggle, and the scroll-to-top control now only exists on devices that can actually hover; touch devices get the clean press feedback alone. Controls also opt out of the double-tap zoom gesture, so taps respond without hesitation.

## [1.3.21] - 2026-07-11

### Fixed

- The film grain now actually renders on iPhone and iPad. WebKit does not apply SVG filters when an SVG is rasterized as a CSS background image, so the turbulence-based tile painted a faint dark veil with no noise at all on iOS, leaving gradient banding fully visible there. The grain is now a small pre-rendered raster tile that every browser draws identically, and it renders pixel-crisp on high-density screens instead of being smoothed into blur when the display upscales it. Gradient banding is dithered away in both themes with no soft or low-quality look. README previews regenerated.

## [1.3.20] - 2026-07-11

### Fixed

- The key press finally travels. During a click the pointer is still hovering, and the hover lift rule outranked the press rule, so the cap held its raised position while the shadows switched to pressed geometry, which read as the base jumping up instead of the cap going down. The press is now declared after the hover lift at matching specificity and wins the cascade, so the cap visibly sinks 3px into its anchored base on every click.
- Dark mode's primary button no longer loses its 3D edge on hover. A leftover rule from before the key redesign replaced the whole hover shadow with a flat glow.
- In light mode the pressed shadow now outranks the hover shadow mid click, so the primary button's base geometry stays correct through the press.
- Tapping controls on phones no longer flashes the system's default grey tap rectangle over the design's own pressed states. Keyboard focus outlines are unaffected.

## [1.3.19] - 2026-07-11

### Changed

- The 3D key buttons are rebuilt on realistic press physics. The base and its ground shadow are now anchored in place through every state: at rest the cap sits proud on a 5px base, hovering lifts the cap 1px while the base bottom stays put, and pressing sinks the cap 3px into the base with 2px of it still showing beneath the sunken cap, its ground shadow never moving and the shading inside the cap deepening. Before, the whole assembly moved together and the press read as the base rising instead of the cap sinking. Under reduced motion the cap stays still and only the shading responds. README previews are regenerated with the new resting stance.

## [1.3.18] - 2026-07-10

### Changed

- Pressing a button now reads as the cap sinking into its socket. Before, the dark bottom edge collapsed as the button traveled down, which looked like the base rising to meet it. The edge now stays put beneath the sunken cap and a soft shadow falls across the cap's top, so the press feels like a real key going down.

## [1.3.17] - 2026-07-10

### Added

- A whisper of film grain now sits over the whole page in both themes. Large soft gradients band into visible steps on most displays; the static monochrome noise dithers those steps away and gives the surface a subtle print-like tooth. It is one tiled SVG turbulence texture with no blend mode and no animation, so it composites for free, stays out of pointer input, and is dropped entirely in print. README previews are regenerated with the new surface.

## [1.3.16] - 2026-07-10

### Fixed

- The theme toggle now turns and swells on hover on every page, the playful twist that until now only the WHMCS Emoji Compatibility Guide showed. All pages always shared the same hover rule, but a more specific button rule was overriding its transform with the standard key lift on the other tools. The toggle's hover and press rules now outrank the tactile key rules everywhere.
- Hovers and tooltips respond during the theme crossfade again. The crossfade overlay intercepts pointer input by default, which deadened the page, most noticeably the toggle's own hover twist and tooltip, for half a second after every theme switch. The live page underneath now stays interactive while the fade plays, matching how immediate the toggle felt before the fade shipped.

## [1.3.15] - 2026-07-10

### Fixed

- Tooltip arrows are visible again. The arrow is a bordered square whose colored wedge sat entirely behind the tooltip bubble, which paints later and shares the same ink color, so the bubble swallowed the arrow and nothing bridged the gap to the button. The arrow now sits with its tip in the gap, 4px off the button, and its base tucked one pixel under the bubble edge, painting above the bubble so the two read as a single speech-bubble shape. Both variants are fixed, the standard bubble above a button and the theme toggle's bubble below it.

## [1.3.14] - 2026-07-10

### Fixed

- The theme crossfade no longer stutters on phones. The browser's default crossfade blends the old and new page snapshots with a plus-lighter blend inside an isolated compositing group, which means two full-screen render passes every frame. Desktop GPUs absorb that, phone GPUs drop frames. The new page now sits fully opaque underneath while the old snapshot simply fades out above it, which reads identically on an opaque page and costs a single alpha layer. Decorative drift animations also pause for the half second the fade runs, freeing GPU headroom on mobile without any visible freeze.

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

[1.4.11]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.4.11
[1.4.10]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.4.10
[1.4.9]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.4.9
[1.4.8]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.4.8
[1.4.7]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.4.7
[1.4.6]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.4.6
[1.4.5]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.4.5
[1.4.4]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.4.4
[1.4.3]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.4.3
[1.4.2]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.4.2
[1.4.1]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.4.1
[1.4.0]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.4.0
[1.3.25]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.3.25
[1.3.24]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.3.24
[1.3.23]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.3.23
[1.3.22]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.3.22
[1.3.21]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.3.21
[1.3.20]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.3.20
[1.3.19]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.3.19
[1.3.18]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.3.18
[1.3.17]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.3.17
[1.3.16]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.3.16
[1.3.15]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.3.15
[1.3.14]: https://github.com/JaydenYoonZK/wp-config-doctor/releases/tag/v1.3.14
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
