# WP Config Doctor 🩺

Paste your `wp-config.php` and get a plain-language security and performance audit, plus a fresh salt generator. Runs entirely in your browser, so your database credentials never leave your device.

<p>
  <a href="https://jaydenyoonzk.github.io/wp-config-doctor/"><img src="https://img.shields.io/badge/Live%20tool-open-abcf37?style=for-the-badge&logo=githubpages&logoColor=black" alt="Open the live tool"></a>
  <a href="https://github.com/JaydenYoonZK/wp-config-doctor/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/JaydenYoonZK/wp-config-doctor/ci.yml?style=for-the-badge&label=tests" alt="CI status"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/JaydenYoonZK/wp-config-doctor?style=for-the-badge" alt="MIT License"></a>
</p>

<a href="https://jaydenyoonzk.github.io/wp-config-doctor/?demo">
  <img src="docs/assets/preview.png" alt="WP Config Doctor shown in light and dark themes, the hero with its wp-config.php audit illustration scoring findings by severity" width="100%">
</a>

**[Open the live tool](https://jaydenyoonzk.github.io/wp-config-doctor/)** or **[see it audit a sample](https://jaydenyoonzk.github.io/wp-config-doctor/?demo)**. Nothing is uploaded.

## Why this exists

wp-config.php holds database credentials, authentication salts, debug settings, and several security switches. Small mistakes there can be hard to notice: production debug output, sample salts, or dashboard file editing left available after setup. This tool checks those settings without connecting to the site or database.

## What it checks

Every finding is ranked by severity and comes with the exact line to add or change:

- **Security keys and salts**: all eight present, none still on the sample placeholder, none duplicated, none too short
- **Debug exposure**: `WP_DEBUG`, `WP_DEBUG_DISPLAY`, and a forced `ini_set('display_errors', 1)`, including the case where `WP_DEBUG` is set to a string like `'false'`, which PHP treats as on
- **Unauthenticated repair page**: `WP_ALLOW_REPAIR` left enabled
- **Database credentials**: empty or common-default password (checked locally, never shown or sent)
- **File editing**: `DISALLOW_FILE_EDIT` or the broader `DISALLOW_FILE_MODS`
- **Transport**: `FORCE_SSL_ADMIN`, and `WP_HOME` / `WP_SITEURL` hardcoded to an insecure `http://` address
- **Table prefix**: whether it is still the default `wp_`
- **Hardening and performance extras**: automatic updates, debug log location, environment type, post revisions, memory limit
- **Static-analysis uncertainty**: dynamic expressions and duplicate security constants are reported for manual verification instead of receiving a false pass

It also generates eight fresh 64-character salts with the Web Crypto API. Rejection sampling avoids modulo bias, and duplicate output from a faulty random source is rejected.

## How privacy is enforced

The published build is a static page. The audit runs in your browser, stores nothing, and does not send the pasted text anywhere. Its Content Security Policy sets `connect-src 'none'`, blocks forms, and limits images to the same origin or embedded data. The [engine](docs/config.js) is small enough to inspect, and the tool can be run locally. You may also redact the four `DB_` lines; the remaining checks still work.

## Use it

No install: [jaydenyoonzk.github.io/wp-config-doctor](https://jaydenyoonzk.github.io/wp-config-doctor/)

Run locally:

```bash
git clone https://github.com/JaydenYoonZK/wp-config-doctor.git
cd wp-config-doctor
npm run serve   # http://localhost:8411
```

## Use the engine in your own project

`docs/config.js` is a dependency-free ES module:

```js
import { audit, generateSalts } from "./config.js";

const { findings, score } = audit(wpConfigText);
const freshSalts = generateSalts();   // eight define() lines
```

## Tests

```bash
npm test
```

36 tests cover lexical parsing, comments, heredocs, PHP strings and escapes, nested expressions, duplicate definitions, dynamic values, environment-aware debug checks, salts, URL and repair-page findings, input limits, and unbiased salt generation. Coverage is measured with `npm run test:coverage`.

## Limits

This is static analysis, not a PHP runtime. It does not execute environment lookups, helper functions, conditionals, or concatenated expressions. Those values are marked for manual verification. Input is capped at 1 MiB so an accidental paste cannot tie up the page. A high score covers this file only; it does not assess plugins, users, hosting, file permissions, backups, or whether the running site matches the pasted file.

## Rule sources

The audit follows WordPress's own documentation for [wp-config.php](https://developer.wordpress.org/advanced-administration/wordpress/wp-config/), [hardening](https://developer.wordpress.org/advanced-administration/security/hardening/), [HTTPS administration](https://developer.wordpress.org/advanced-administration/security/https/), and the allowed values returned by [`wp_get_environment_type()`](https://developer.wordpress.org/reference/functions/wp_get_environment_type/). For a server-side alternative, WP-CLI provides [`wp config shuffle-salts`](https://developer.wordpress.org/cli/commands/config/shuffle-salts/).

## License

MIT. Built and maintained by [Jayden Yoon ZK](https://github.com/JaydenYoonZK). Part of a WordPress toolkit with [WP Serial Fix](https://github.com/JaydenYoonZK/wp-serial-fix) and [WP Plugin Checkup](https://github.com/JaydenYoonZK/wp-plugin-checkup).
