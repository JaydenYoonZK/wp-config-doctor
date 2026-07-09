/**
 * wp-config-doctor engine
 *
 * Parses a pasted wp-config.php and audits it against a WordPress
 * security and performance hardening checklist. Pure functions, no DOM,
 * no network. Runs in the browser and under Node's test runner.
 *
 * The parser is deliberately tolerant: it reads define() constants and
 * the $table_prefix, correctly handling salt strings that contain
 * parentheses, quotes, and escapes (which naive regexes truncate).
 */

export const SALT_KEYS = [
  "AUTH_KEY", "SECURE_AUTH_KEY", "LOGGED_IN_KEY", "NONCE_KEY",
  "AUTH_SALT", "SECURE_AUTH_SALT", "LOGGED_IN_SALT", "NONCE_SALT"
];

const PLACEHOLDER = /put your unique phrase here|generateme|^$/i;

/* ------------------------------- parser ------------------------------- */

/** Read a PHP single- or double-quoted string starting at index i (the quote). */
function readPhpString(src, i) {
  const quote = src[i];
  let out = "";
  let j = i + 1;
  while (j < src.length) {
    const c = src[j];
    if (c === "\\") {
      const next = src[j + 1];
      // In single quotes PHP only escapes \' and \\; keep others literal.
      if (quote === "'") {
        if (next === "'" || next === "\\") { out += next; j += 2; continue; }
        out += c; j += 1; continue;
      }
      out += next; j += 2; continue;
    }
    if (c === quote) return { value: out, end: j + 1 };
    out += c;
    j += 1;
  }
  return { value: out, end: j }; // unterminated
}

/**
 * Blank out PHP comments (// , # , and block) while leaving strings and the
 * character positions intact, so a commented-out define() is not audited as if
 * it were active. String-aware, because a salt can legitimately contain /, *,
 * or #. Comment characters become spaces; newlines are preserved so reported
 * line numbers stay correct.
 */
export function stripComments(src) {
  let out = "";
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === "'" || c === '"') {                 // copy a quoted string verbatim
      out += c; i++;
      while (i < n) {
        if (src[i] === "\\") { out += src[i] + (src[i + 1] ?? ""); i += 2; continue; }
        out += src[i];
        const done = src[i] === c;
        i++;
        if (done) break;
      }
      continue;
    }
    if ((c === "/" && src[i + 1] === "/") || c === "#") {   // line comment
      while (i < n && src[i] !== "\n") { out += " "; i++; }
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {                   // block comment
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) { out += src[i] === "\n" ? "\n" : " "; i++; }
      if (i < n) { out += "  "; i += 2; }
      continue;
    }
    out += c; i++;
  }
  return out;
}

/**
 * Parse wp-config.php text.
 * Returns { defines: Map<name,{value,type,raw,line}>, tablePrefix, hasCode, clean }.
 */
export function parseConfig(rawSrc) {
  const src = stripComments(rawSrc);
  const defines = new Map();
  let tablePrefix = null;

  const defRe = /define\s*\(\s*(['"])([A-Za-z0-9_]+)\1\s*,\s*/g;
  let m;
  while ((m = defRe.exec(src)) !== null) {
    const name = m[2];
    let i = m.index + m[0].length;
    let value, type, raw;
    if (src[i] === "'" || src[i] === '"') {
      const s = readPhpString(src, i);
      value = s.value; type = "string"; raw = src.slice(i, s.end);
      i = s.end;
    } else {
      // boolean / number / expression: read to the closing ) that ends the call
      let depth = 0, j = i;
      while (j < src.length) {
        const c = src[j];
        if (c === "(") depth++;
        else if (c === ")") { if (depth === 0) break; depth--; }
        else if (c === ";") break;
        j++;
      }
      raw = src.slice(i, j).trim();
      const low = raw.toLowerCase();
      if (low === "true") { value = true; type = "bool"; }
      else if (low === "false") { value = false; type = "bool"; }
      else if (/^-?\d+$/.test(raw)) { value = parseInt(raw, 10); type = "int"; }
      else { value = raw; type = "expr"; }
    }
    const line = src.slice(0, m.index).split(/\n/).length;
    if (!defines.has(name)) defines.set(name, { value, type, raw, line });
  }

  const pm = /\$table_prefix\s*=\s*(['"])(.*?)\1/.exec(src);
  if (pm) tablePrefix = pm[2];

  return { defines, tablePrefix, hasCode: /<\?php|define\s*\(|\$table_prefix/.test(src), clean: src };
}

/* ------------------------------- audit ------------------------------- */

const LEVEL = { critical: 4, high: 3, medium: 2, low: 1, info: 0, pass: -1 };

// Match PHP's truthiness, including its string rule: every string is true
// except "" and "0". This is why define('WP_DEBUG', 'false') actually turns
// debug ON, a common and costly mistake.
function truthy(def) {
  if (!def) return false;
  if (def.type === "bool") return def.value === true;
  if (def.type === "int") return def.value !== 0;
  if (def.type === "string") return def.value !== "" && def.value !== "0";
  if (def.type === "expr") return def.value !== "0" && def.value.toLowerCase() !== "false";
  return false;
}

/**
 * Audit a parsed config. Returns { findings: [...], score, counts }.
 * Each finding: { id, title, level, detail, fix? }
 */
export function audit(src) {
  const { defines, tablePrefix, hasCode, clean } = parseConfig(src);
  const F = [];
  const get = (k) => defines.get(k);
  const add = (id, level, title, detail, fix) => F.push({ id, level, title, detail, fix });

  if (!hasCode) {
    return { findings: [{ id: "empty", level: "info", title: "That does not look like a wp-config.php", detail: "Paste the contents of your wp-config.php file. It defines constants like DB_NAME and the security keys." }], score: null, counts: {}, parsed: { defines, tablePrefix } };
  }

  /* --- salts --- */
  const present = SALT_KEYS.filter(k => defines.has(k));
  const missing = SALT_KEYS.filter(k => !defines.has(k));
  const placeholders = present.filter(k => PLACEHOLDER.test(String(get(k).value)));
  const values = present.filter(k => !PLACEHOLDER.test(String(get(k).value))).map(k => get(k).value);
  const dupes = values.filter((v, i) => values.indexOf(v) !== i);
  const shortSalts = present.filter(k => {
    const v = String(get(k).value);
    return !PLACEHOLDER.test(v) && v.length > 0 && v.length < 32;
  });

  if (missing.length === SALT_KEYS.length) {
    add("salts-missing", "critical", "Security keys are missing entirely",
      "None of the eight WordPress security keys and salts are defined. Sessions and cookies are far easier to forge without them.",
      "Generate a fresh set below and paste all eight lines into wp-config.php.");
  } else if (missing.length) {
    add("salts-partial", "high", `${missing.length} security key${missing.length === 1 ? "" : "s"} missing`,
      `Missing: ${missing.join(", ")}. WordPress needs all eight defined.`,
      "Generate a complete set below and replace your key block.");
  }
  if (placeholders.length) {
    add("salts-placeholder", "critical", "Security keys still hold the sample placeholder",
      `${placeholders.length} key${placeholders.length === 1 ? "" : "s"} still say "put your unique phrase here". These provide no protection at all.`,
      "Generate real salts below and replace them.");
  }
  if (dupes.length) {
    add("salts-duplicate", "high", "Some security keys reuse the same value",
      "At least two keys share an identical value, which defeats the point of having separate keys.",
      "Regenerate the full set so every key is unique.");
  }
  if (shortSalts.length) {
    add("salts-short", "medium", "Some security keys are short",
      `${shortSalts.length} key${shortSalts.length === 1 ? "" : "s"} are under 32 characters. WordPress generates 64-character keys.`,
      "Regenerate with the 64-character set below.");
  }
  if (missing.length === 0 && placeholders.length === 0 && dupes.length === 0 && shortSalts.length === 0) {
    add("salts-ok", "pass", "All eight security keys are set and unique",
      "Consider rotating them a few times a year; doing so logs everyone out, which is a cheap way to end hijacked sessions.");
  }

  /* --- debug --- */
  const dbg = get("WP_DEBUG");
  const debugOn = truthy(dbg);
  if (dbg && dbg.type === "string" && dbg.value !== "" && dbg.value !== "0") {
    add("wp-debug-string", "high", "WP_DEBUG is a string, so debug is on",
      `WP_DEBUG is set to the string "${dbg.value}". PHP treats every non-empty string as true, so debug mode is on even though this may look like it is off. On a live site that can print PHP errors and absolute server paths to visitors.`,
      "Use a boolean with no quotes: define('WP_DEBUG', false);");
  } else if (debugOn) {
    add("wp-debug", "high", "WP_DEBUG is on",
      "Debug mode is enabled. On a live site this can print PHP errors, warnings, and absolute server paths to visitors.",
      "Set define('WP_DEBUG', false); in production.");
  } else if (dbg && dbg.type === "bool") {
    add("wp-debug-ok", "pass", "WP_DEBUG is off", "Good for production.");
  }
  if (debugOn && (truthy(get("WP_DEBUG_DISPLAY")) || !defines.has("WP_DEBUG_DISPLAY"))) {
    add("wp-debug-display", "high", "Debug output can reach visitors",
      "With WP_DEBUG on and WP_DEBUG_DISPLAY not turned off, errors render into the page.",
      "Add define('WP_DEBUG_DISPLAY', false); and log to a file instead.");
  }
  if (/ini_set\s*\(\s*['"]display_errors['"]\s*,\s*['"]?(1|on|true)/i.test(clean)) {
    add("display-errors", "high", "display_errors is forced on",
      "An ini_set('display_errors', ...) call is exposing PHP errors regardless of WordPress settings.",
      "Remove it or set it to 0 in production.");
  }

  /* --- table prefix --- */
  if (tablePrefix === "wp_") {
    add("table-prefix", "low", "Table prefix is the default wp_",
      "The default prefix is well known to automated attacks. Changing it is obscurity, not real protection, but it raises the bar against generic scripts.",
      "A custom prefix is set at install time or migrated carefully later; do not just edit this value on a live site.");
  } else if (tablePrefix) {
    add("table-prefix-ok", "pass", "Custom table prefix in use", `Prefix is "${tablePrefix}".`);
  }

  /* --- file editing --- */
  if (!truthy(get("DISALLOW_FILE_EDIT"))) {
    add("file-edit", "medium", "The built-in theme and plugin editor is enabled",
      "Without DISALLOW_FILE_EDIT, anyone who reaches wp-admin can edit PHP files directly, which turns one compromised admin login into full code execution.",
      "Add define('DISALLOW_FILE_EDIT', true);");
  } else {
    add("file-edit-ok", "pass", "In-dashboard file editing is disabled", "DISALLOW_FILE_EDIT is set.");
  }

  /* --- ssl admin --- */
  if (!truthy(get("FORCE_SSL_ADMIN"))) {
    add("ssl-admin", "medium", "Admin is not forced over HTTPS",
      "FORCE_SSL_ADMIN is not enabled, so logins and admin sessions can travel unencrypted if the site is reachable over http.",
      "Add define('FORCE_SSL_ADMIN', true); once you have a working certificate.");
  } else {
    add("ssl-admin-ok", "pass", "Admin is forced over HTTPS", "FORCE_SSL_ADMIN is set.");
  }

  /* --- repair page --- */
  if (truthy(get("WP_ALLOW_REPAIR"))) {
    add("allow-repair", "high", "WP_ALLOW_REPAIR is left enabled",
      "This exposes /wp-admin/maint/repair.php, a database repair and optimize page that anyone can reach without logging in. It is meant to be switched on briefly for a one-time repair and then removed.",
      "Delete the WP_ALLOW_REPAIR line once the repair is finished.");
  }

  /* --- site URLs hardcoded to insecure http --- */
  // A complete http:// literal (host and all). A concatenated value like
  // 'http://' . $host truncates to "http://" with nothing after, which is a
  // dynamic URL rather than a fixed insecure one, so \S excludes it.
  for (const key of ["WP_HOME", "WP_SITEURL"]) {
    const d = get(key);
    if (d && d.type === "string" && /^http:\/\/\S/.test(d.value)) {
      add(`${key.toLowerCase().replace(/_/g, "-")}-http`, "medium", `${key} is hardcoded to an insecure http:// address`,
        `${key} is set to "${d.value}". Pinning it to http forces WordPress to build its links and redirects over plain HTTP, which breaks a site served over HTTPS or triggers mixed-content warnings, and on a site that redirects http to https it can cause a redirect loop.`,
        `Use https, for example define('${key}', 'https://${d.value.slice("http://".length)}');`);
    }
  }

  /* --- db password --- */
  const dbSample = ["DB_NAME", "DB_USER", "DB_PASSWORD"].some(k => {
    const d = get(k);
    return d && d.type === "string" && /^(database_name_here|username_here|password_here)$/.test(d.value);
  });
  if (dbSample) {
    add("db-sample", "info", "This looks like the unconfigured sample file",
      "The database settings still hold the wp-config-sample.php placeholders. The rest of the audit applies, but paste your real wp-config.php for a meaningful result.");
  }
  const pw = get("DB_PASSWORD");
  if (pw && pw.type === "string" && pw.value === "") {
    add("db-empty", "high", "The database password is empty",
      "DB_PASSWORD is blank. On anything but a locked-down local machine this is a serious exposure.",
      "Set a strong database password and update this value.");
  } else if (pw && pw.type === "string" && /^(password|root|admin|123456|wordpress)$/i.test(pw.value)) {
    add("db-weak", "high", "The database password is a common default",
      "DB_PASSWORD is one of the most-guessed values. This value is never uploaded by this tool, but it should still be changed.",
      "Use a long random database password.");
  }

  /* --- extra hardening & performance (info) --- */
  // Only true (not a custom path string) logs to the default wp-content/debug.log.
  // A string value is a custom path, which is the recommended fix, so it is not flagged.
  const dbgLog = get("WP_DEBUG_LOG");
  if (dbgLog && dbgLog.type === "bool" && dbgLog.value === true) {
    add("debug-log", "low", "Debug logging writes to a predictable path",
      "WP_DEBUG_LOG is true, so WordPress logs to wp-content/debug.log, a path that can be readable over the web.",
      "Point it at a path outside the web root, e.g. define('WP_DEBUG_LOG', '/var/log/wp/debug.log');");
  }
  if (truthy(get("AUTOMATIC_UPDATER_DISABLED"))) {
    add("auto-update", "medium", "Automatic updates are disabled",
      "AUTOMATIC_UPDATER_DISABLED turns off background updates, including security releases. Only keep this if you patch promptly by other means.",
      "Remove it, or ensure minor security updates still run.");
  }
  if (!defines.has("WP_ENVIRONMENT_TYPE")) {
    add("env-type", "info", "No environment type declared",
      "WP_ENVIRONMENT_TYPE lets plugins and WordPress behave differently on production versus staging. Optional but tidy.",
      "Add define('WP_ENVIRONMENT_TYPE', 'production');");
  }
  if (!defines.has("WP_POST_REVISIONS")) {
    add("revisions", "info", "Post revisions are unlimited",
      "WordPress keeps every revision by default, which grows the database over time.",
      "Cap them, e.g. define('WP_POST_REVISIONS', 10);");
  }
  if (!defines.has("WP_MEMORY_LIMIT")) {
    add("memory", "info", "No PHP memory limit set for WordPress",
      "WP_MEMORY_LIMIT is unset, so WordPress uses the host default, which is sometimes too low for media and page builders.",
      "Add define('WP_MEMORY_LIMIT', '256M'); if your host allows it.");
  }

  F.sort((a, b) => LEVEL[b.level] - LEVEL[a.level]);
  const counts = {};
  for (const f of F) counts[f.level] = (counts[f.level] || 0) + 1;

  // Score: start at 100, subtract weighted issues.
  const weights = { critical: 30, high: 18, medium: 9, low: 4, info: 0, pass: 0 };
  let score = 100;
  for (const f of F) score -= weights[f.level] || 0;
  score = Math.max(0, score);

  return { findings: F, score, counts, parsed: { defines, tablePrefix, presentSalts: present.length } };
}

/* --------------------------- salt generator --------------------------- */

// WordPress-style character set, minus ' and \ so the value is safe inside
// a single-quoted PHP string without escaping.
const SALT_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_[]{}<>~`+=,.;:/?|";

function randomSalt(len, rng) {
  const bytes = rng(len);
  let out = "";
  for (let i = 0; i < len; i++) out += SALT_CHARS[bytes[i] % SALT_CHARS.length];
  return out;
}

/**
 * Generate a fresh set of eight salt define() lines.
 * rng(n) returns n cryptographically-random bytes; defaults to WebCrypto.
 */
export function generateSalts(rng) {
  const random = rng || ((n) => crypto.getRandomValues(new Uint8Array(n)));
  return SALT_KEYS.map(k => {
    const v = randomSalt(64, random);
    const pad = " ".repeat(Math.max(0, 18 - k.length));
    return `define('${k}',${pad} '${v}');`;
  }).join("\n");
}
