/*! WP Config Doctor | Copyright (c) 2026 Jayden Yoon ZK | MIT License | https://github.com/JaydenYoonZK/wp-config-doctor */
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
const MAX_CONFIG_LENGTH = 1024 * 1024;

/* ------------------------------- parser ------------------------------- */

/** Read a PHP single- or double-quoted string starting at index i. */
function readPhpString(src, i) {
  const quote = src[i];
  let out = "";
  let j = i + 1;
  let dynamic = false;
  while (j < src.length) {
    const c = src[j];
    if (c === "\\") {
      const next = src[j + 1];
      if (quote === "'") {
        if (next === "'" || next === "\\") { out += next; j += 2; continue; }
        out += c; j += 1; continue;
      }
      const escapes = { n: "\n", r: "\r", t: "\t", v: "\v", e: "\x1b", f: "\f", "\\": "\\", '"': '"', "$": "$" };
      if (Object.hasOwn(escapes, next)) { out += escapes[next]; j += 2; continue; }
      const hex = src.slice(j + 2).match(/^[0-9a-f]{1,2}/i)?.[0];
      if (next === "x" && hex) { out += String.fromCharCode(parseInt(hex, 16)); j += 2 + hex.length; continue; }
      const oct = src.slice(j + 1).match(/^[0-7]{1,3}/)?.[0];
      if (oct) { out += String.fromCharCode(parseInt(oct, 8)); j += 1 + oct.length; continue; }
      out += "\\" + (next ?? ""); j += next === undefined ? 1 : 2; continue;
    }
    if (c === quote) return { value: out, end: j + 1, terminated: true, dynamic };
    if (quote === '"' && c === "$") dynamic = true;
    out += c;
    j += 1;
  }
  return { value: out, end: j, terminated: false, dynamic };
}

const blank = (c) => c === "\n" || c === "\r" ? c : " ";

function scanPhp(src) {
  let clean = "";
  let code = "";
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === "'" || c === '"' || c === "`") {
      clean += c; code += c; i++;
      while (i < n) {
        if (src[i] === "\\") {
          clean += src[i]; code += blank(src[i]); i++;
          if (i < n) { clean += src[i]; code += blank(src[i]); i++; }
          continue;
        }
        clean += src[i];
        const done = src[i] === c;
        code += done ? c : blank(src[i]);
        i++;
        if (done) break;
      }
      continue;
    }
    if (src.startsWith("<<<", i)) {
      const opener = src.slice(i).match(/^<<<[ \t]*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1[^\r\n]*(?:\r?\n|$)/);
      if (opener) {
        const label = opener[2].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const rest = src.slice(i + opener[0].length);
        // PHP 7.3+ allows a flexible closing marker: the label may be indented
        // and immediately followed by ), ,, ., ;, etc. Match the label when it
        // is not followed by another identifier character (so "ENDING" is not a
        // close of "END"), and blank only up to the marker; the rest is code.
        const close = new RegExp(`^[ \\t]*${label}(?![A-Za-z0-9_])`, "m").exec(rest);
        const end = close ? i + opener[0].length + close.index + close[0].length : n;
        while (i < end) { clean += src[i]; code += blank(src[i]); i++; }
        continue;
      }
    }
    if ((c === "/" && src[i + 1] === "/") || c === "#") {
      while (i < n && src[i] !== "\n") { clean += " "; code += " "; i++; }
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      // Consume the opening "/*" first, so the terminator search does not pair
      // the opener's own "*" with the next "/" and read "/*/" as a whole comment
      // (in PHP "/*/ ... */" is a single comment).
      clean += "  "; code += "  "; i += 2;
      while (i < n && !(src[i] === "*" && src[i + 1] === "/")) { clean += blank(src[i]); code += blank(src[i]); i++; }
      if (i < n) { clean += "  "; code += "  "; i += 2; }
      continue;
    }
    clean += c; code += c; i++;
  }
  return { clean, code };
}

/** Blank PHP comments while preserving strings, newlines, and indices. */
export function stripComments(src) {
  return scanPhp(src).clean;
}

function skipSpace(code, i, end = code.length) {
  while (i < end && /\s/.test(code[i])) i++;
  return i;
}

function findClosingParen(code, start) {
  let depth = 0;
  for (let i = start; i < code.length; i++) {
    if (code[i] === "(") depth++;
    else if (code[i] === ")") {
      if (depth === 0) return i;
      depth--;
    } else if (code[i] === ";" && depth === 0) return -1;
  }
  return -1;
}

function parseExpression(src, clean, code, start, end) {
  const i = skipSpace(code, start, end);
  if (i >= end) return { value: "", type: "expr", raw: "" };
  if (src[i] === "'" || src[i] === '"') {
    const value = readPhpString(src, i);
    const after = skipSpace(code, value.end, end);
    if (value.terminated && after === end && !value.dynamic) {
      return { value: value.value, type: "string", raw: src.slice(i, value.end) };
    }
  }
  const raw = clean.slice(i, end).trim();
  const low = raw.toLowerCase();
  if (low === "true") return { value: true, type: "bool", raw };
  if (low === "false") return { value: false, type: "bool", raw };
  if (/^-?(?:0|[1-9]\d*)$/.test(raw) && Number.isSafeInteger(Number(raw))) {
    return { value: Number(raw), type: "int", raw };
  }
  return { value: raw, type: "expr", raw };
}

function splitCallArguments(code, start, end) {
  const ranges = [];
  let depth = 0;
  let partStart = start;
  for (let i = start; i < end; i++) {
    if (code[i] === "(") depth++;
    else if (code[i] === ")") depth--;
    else if (code[i] === "," && depth === 0) {
      ranges.push([partStart, i]);
      partStart = i + 1;
    }
  }
  ranges.push([partStart, end]);
  return ranges;
}

/**
 * Parse wp-config.php text.
 * Returns { defines: Map<name,{value,type,raw,line}>, tablePrefix, hasCode, clean }.
 */
export function parseConfig(rawSrc) {
  if (typeof rawSrc !== "string") throw new TypeError("wp-config.php input must be a string");
  if (rawSrc.length > MAX_CONFIG_LENGTH) throw new RangeError("wp-config.php input exceeds 1 MiB");
  const { clean, code } = scanPhp(rawSrc);
  const defines = new Map();
  const duplicateDefines = new Set();
  let tablePrefix = null;
  let tablePrefixType = "missing";

  const defRe = /\bdefine\s*\(/gi;
  let m;
  let line = 1;
  let lineCursor = 0;
  while ((m = defRe.exec(code)) !== null) {
    while (lineCursor < m.index) {
      if (rawSrc[lineCursor] === "\n") line++;
      lineCursor++;
    }
    let i = skipSpace(code, m.index + m[0].length);
    if (rawSrc[i] !== "'" && rawSrc[i] !== '"') continue;
    const namePart = readPhpString(rawSrc, i);
    if (!namePart.terminated || namePart.dynamic || !/^[A-Za-z0-9_]+$/.test(namePart.value)) continue;
    i = skipSpace(code, namePart.end);
    if (code[i] !== ",") continue;
    const valueStart = i + 1;
    const close = findClosingParen(code, valueStart);
    if (close === -1) continue;
    // define() may carry a third case-insensitivity argument. Parse only the
    // value (the first argument after the name), not the trailing flag, so a
    // hardened `define('DISALLOW_FILE_EDIT', true, true)` is read as true, not
    // the expression "true, true".
    const args = splitCallArguments(code, valueStart, close);
    const parsed = parseExpression(rawSrc, clean, code, ...args[0]);
    const name = namePart.value;
    if (defines.has(name)) duplicateDefines.add(name);
    else defines.set(name, { ...parsed, line });
    defRe.lastIndex = close + 1;
  }

  const prefixRe = /\$table_prefix\s*=/g;
  const pm = prefixRe.exec(code);
  if (pm) {
    const start = pm.index + pm[0].length;
    let end = start;
    let depth = 0;
    while (end < code.length) {
      if (code[end] === "(") depth++;
      else if (code[end] === ")") depth--;
      else if (code[end] === ";" && depth === 0) break;
      end++;
    }
    const parsed = parseExpression(rawSrc, clean, code, start, end);
    tablePrefixType = parsed.type;
    if (parsed.type === "string") tablePrefix = parsed.value;
  }

  let displayErrorsForced = false;
  const iniRe = /\bini_set\s*\(/gi;
  while ((m = iniRe.exec(code)) !== null) {
    const start = m.index + m[0].length;
    const close = findClosingParen(code, start);
    if (close === -1) continue;
    const args = splitCallArguments(code, start, close);
    if (args.length >= 2) {
      const name = parseExpression(rawSrc, clean, code, ...args[0]);
      const value = parseExpression(rawSrc, clean, code, ...args[1]);
      if (name.type === "string" && name.value.toLowerCase() === "display_errors" && iniBoolean(value) === true) {
        displayErrorsForced = true;
      }
    }
    iniRe.lastIndex = close + 1;
  }

  return {
    defines,
    duplicateDefines: [...duplicateDefines],
    tablePrefix,
    tablePrefixType,
    displayErrorsForced,
    hasCode: /<\?php|\bdefine\s*\(|\$table_prefix/i.test(code),
    clean
  };
}

/* ------------------------------- audit ------------------------------- */

const LEVEL = { critical: 4, high: 3, medium: 2, low: 1, info: 0, pass: -1 };

// Match PHP's truthiness, including its string rule: every string is true
// except "" and "0". This is why define('WP_DEBUG', 'false') actually turns
// debug ON, a common and costly mistake.
function literalTruth(def) {
  if (!def || def.type === "expr") return null;
  if (def.type === "bool") return def.value === true;
  if (def.type === "int") return def.value !== 0;
  if (def.type === "string") return def.value !== "" && def.value !== "0";
  return null;
}

function iniBoolean(def) {
  if (!def || def.type === "expr") return null;
  if (def.type === "bool") return def.value;
  if (def.type === "int") return def.value !== 0;
  if (def.type === "string") {
    const value = def.value.trim().toLowerCase();
    if (["1", "on", "true", "yes"].includes(value)) return true;
    if (["", "0", "off", "false", "no", "none"].includes(value)) return false;
  }
  return null;
}

/**
 * Audit a parsed config. Returns { findings: [...], score, counts }.
 * Each finding: { id, title, level, detail, fix? }
 */
export function audit(src) {
  const { defines, duplicateDefines, tablePrefix, tablePrefixType, displayErrorsForced, hasCode } = parseConfig(src);
  const F = [];
  const get = (k) => defines.get(k);
  const add = (id, level, title, detail, fix) => F.push({ id, level, title, detail, fix });

  if (!hasCode) {
    return { findings: [{ id: "empty", level: "info", title: "That does not look like a wp-config.php", detail: "Paste the contents of your wp-config.php file. It defines constants like DB_NAME and the security keys." }], score: null, counts: {}, parsed: { defines, tablePrefix } };
  }

  const duplicateSecurity = duplicateDefines.filter((name) =>
    SALT_KEYS.includes(name) || ["WP_DEBUG", "WP_DEBUG_DISPLAY", "DISALLOW_FILE_EDIT", "DISALLOW_FILE_MODS", "FORCE_SSL_ADMIN", "WP_ALLOW_REPAIR"].includes(name)
  );
  if (duplicateSecurity.length) {
    add("duplicate-defines", "medium", "Security constants are defined more than once",
      `Repeated: ${duplicateSecurity.join(", ")}. PHP keeps the first definition and warns on later ones, which makes the file easy to misread.`,
      "Keep one definition for each constant and remove the duplicates.");
  }

  /* --- salts --- */
  const present = SALT_KEYS.filter(k => defines.has(k));
  const missing = SALT_KEYS.filter(k => !defines.has(k));
  const dynamicSalts = present.filter(k => get(k).type === "expr");
  const invalidSalts = present.filter(k => get(k).type !== "string" && get(k).type !== "expr");
  const literalSalts = present.filter(k => get(k).type === "string");
  const placeholders = literalSalts.filter(k => PLACEHOLDER.test(String(get(k).value)));
  const values = literalSalts.filter(k => !PLACEHOLDER.test(String(get(k).value))).map(k => get(k).value);
  const dupes = values.filter((v, i) => values.indexOf(v) !== i);
  const shortSalts = literalSalts.filter(k => {
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
  if (dynamicSalts.length) {
    add("salts-dynamic", "medium", "Some security keys are built dynamically",
      `${dynamicSalts.length} key${dynamicSalts.length === 1 ? " uses" : "s use"} an expression this static audit cannot evaluate.`,
      "Verify the runtime values are long, random, unique strings, or replace the block with generated literal salts.");
  }
  if (invalidSalts.length) {
    add("salts-invalid", "high", "Some security keys are not strings",
      `${invalidSalts.length} key${invalidSalts.length === 1 ? " is" : "s are"} defined as a boolean or integer instead of secret text.`,
      "Replace the full key block with generated string values.");
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
  if (missing.length === 0 && placeholders.length === 0 && dupes.length === 0 && shortSalts.length === 0 && dynamicSalts.length === 0 && invalidSalts.length === 0) {
    add("salts-ok", "pass", "All eight security keys are set and unique",
      "Rotate them if you suspect a compromise or need to invalidate every logged-in session.");
  }

  /* --- debug --- */
  const dbg = get("WP_DEBUG");
  const debugOn = literalTruth(dbg);
  const envDef = get("WP_ENVIRONMENT_TYPE");
  const knownEnvironments = ["local", "development", "staging", "production"];
  const environment = envDef?.type === "string" && knownEnvironments.includes(envDef.value) ? envDef.value : "production";
  const developmentEnvironment = environment === "local" || environment === "development";
  if (dbg && dbg.type === "string" && dbg.value !== "" && dbg.value !== "0") {
    add("wp-debug-string", "high", "WP_DEBUG is a string, so debug is on",
      `WP_DEBUG is set to the string "${dbg.value}". PHP treats every non-empty string as true, so debug mode is on even though this may look like it is off. On a live site that can print PHP errors and absolute server paths to visitors.`,
      "Use a boolean with no quotes: define('WP_DEBUG', false);");
  } else if (debugOn && developmentEnvironment) {
    add("wp-debug-development", "info", "WP_DEBUG is on for a development environment",
      `WP_ENVIRONMENT_TYPE is ${environment}, where debug mode is expected. Keep the environment private and avoid using these settings in production.`);
  } else if (debugOn) {
    add("wp-debug", "high", "WP_DEBUG is on",
      "Debug mode is enabled. On a live site this can print PHP errors, warnings, and absolute server paths to visitors.",
      "Set define('WP_DEBUG', false); in production.");
  } else if (dbg && dbg.type === "bool") {
    add("wp-debug-ok", "pass", "WP_DEBUG is off", "Good for production.");
  } else if (debugOn === null && dbg) {
    add("wp-debug-dynamic", "medium", "WP_DEBUG is set dynamically",
      "The value is an expression this static audit cannot evaluate, so debug exposure cannot be confirmed from this file alone.",
      "Verify the production runtime value is false, or use define('WP_DEBUG', false); in the production config.");
  }
  if (debugOn === true && !developmentEnvironment && literalTruth(get("WP_DEBUG_DISPLAY")) !== false) {
    add("wp-debug-display", "high", "Debug output can reach visitors",
      "With WP_DEBUG on and WP_DEBUG_DISPLAY not turned off, errors render into the page.",
      "Add define('WP_DEBUG_DISPLAY', false); and log to a file instead.");
  }
  if (displayErrorsForced) {
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
  } else if (tablePrefixType === "expr") {
    add("table-prefix-dynamic", "info", "Table prefix is set dynamically",
      "The prefix uses an expression this static audit cannot evaluate. Confirm the runtime value is intentional.");
  }

  /* --- file editing --- */
  const fileEditStates = [literalTruth(get("DISALLOW_FILE_EDIT")), literalTruth(get("DISALLOW_FILE_MODS"))];
  const fileEditLocked = fileEditStates.includes(true);
  if (!fileEditLocked && fileEditStates.includes(null) && (get("DISALLOW_FILE_EDIT") || get("DISALLOW_FILE_MODS"))) {
    add("file-edit-dynamic", "medium", "File-editing lockdown is dynamic",
      "The lockdown constant uses an expression this static audit cannot evaluate, so the dashboard editor may still be available.",
      "Verify the production runtime value is true.");
  } else if (!fileEditLocked) {
    add("file-edit", "medium", "The built-in theme and plugin editor is enabled",
      "Without DISALLOW_FILE_EDIT, anyone who reaches wp-admin can edit PHP files directly, which turns one compromised admin login into full code execution.",
      "Add define('DISALLOW_FILE_EDIT', true);");
  } else {
    add("file-edit-ok", "pass", "In-dashboard file editing is disabled",
      literalTruth(get("DISALLOW_FILE_MODS")) === true
        ? "DISALLOW_FILE_MODS is set, which also disables the built-in file editor."
        : "DISALLOW_FILE_EDIT is set.");
  }

  /* --- unfiltered html --- */
  const unfilteredHtml = literalTruth(get("DISALLOW_UNFILTERED_HTML"));
  if (unfilteredHtml === true) {
    add("unfiltered-html-ok", "pass", "Unfiltered HTML is disabled for all users",
      "DISALLOW_UNFILTERED_HTML is set, so KSES filtering applies to every account, including administrators and editors.");
  } else {
    add("unfiltered-html", "medium", "Unfiltered HTML is allowed for privileged users",
      "Without DISALLOW_UNFILTERED_HTML, administrators and editors can publish raw HTML, including script tags, because the unfiltered_html capability bypasses KSES. That turns one compromised admin or editor account into a stored-XSS vector.",
      "Add define('DISALLOW_UNFILTERED_HTML', true);");
  }

  /* --- ssl admin --- */
  const sslAdmin = literalTruth(get("FORCE_SSL_ADMIN"));
  if (sslAdmin === null && get("FORCE_SSL_ADMIN")) {
    add("ssl-admin-dynamic", "medium", "HTTPS enforcement is dynamic",
      "FORCE_SSL_ADMIN uses an expression this static audit cannot evaluate, so encrypted admin sessions cannot be confirmed.",
      "Verify the production runtime value is true once the certificate works.");
  } else if (sslAdmin !== true) {
    add("ssl-admin", "medium", "Admin is not forced over HTTPS",
      "FORCE_SSL_ADMIN is not enabled, so logins and admin sessions can travel unencrypted if the site is reachable over http.",
      "Add define('FORCE_SSL_ADMIN', true); once you have a working certificate.");
  } else {
    add("ssl-admin-ok", "pass", "Admin is forced over HTTPS", "FORCE_SSL_ADMIN is set.");
  }

  /* --- repair page --- */
  const allowRepair = literalTruth(get("WP_ALLOW_REPAIR"));
  if (allowRepair === true) {
    add("allow-repair", "high", "WP_ALLOW_REPAIR is left enabled",
      "This exposes /wp-admin/maint/repair.php, a database repair and optimize page that anyone can reach without logging in. It is meant to be switched on briefly for a one-time repair and then removed.",
      "Delete the WP_ALLOW_REPAIR line once the repair is finished.");
  } else if (allowRepair === null && get("WP_ALLOW_REPAIR")) {
    add("allow-repair-dynamic", "medium", "WP_ALLOW_REPAIR is dynamic",
      "The repair-page switch uses an expression this static audit cannot evaluate, so public access cannot be ruled out.",
      "Remove the constant outside a short repair window.");
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
  const defaultDebugLog = dbgLog && (
    (dbgLog.type === "bool" && dbgLog.value === true) ||
    (dbgLog.type === "int" && dbgLog.value === 1) ||
    (dbgLog.type === "string" && ["1", "true"].includes(dbgLog.value.toLowerCase()))
  );
  if (defaultDebugLog) {
    add("debug-log", "low", "Debug logging writes to a predictable path",
      "WP_DEBUG_LOG is true, so WordPress logs to wp-content/debug.log, a path that can be readable over the web.",
      "Point it at a path outside the web root, e.g. define('WP_DEBUG_LOG', '/var/log/wp/debug.log');");
  }
  if (literalTruth(get("AUTOMATIC_UPDATER_DISABLED")) === true) {
    add("auto-update", "medium", "Automatic updates are disabled",
      "AUTOMATIC_UPDATER_DISABLED turns off background updates, including security releases. Only keep this if you patch promptly by other means.",
      "Remove it, or ensure minor security updates still run.");
  }
  if (!defines.has("WP_ENVIRONMENT_TYPE")) {
    add("env-type", "info", "No environment type declared",
      "WP_ENVIRONMENT_TYPE lets plugins and WordPress behave differently on production versus staging. Optional but tidy.",
      "Add define('WP_ENVIRONMENT_TYPE', 'production');");
  } else {
    const env = get("WP_ENVIRONMENT_TYPE");
    if (env.type === "string" && !knownEnvironments.includes(env.value)) {
      add("env-type-invalid", "low", "Environment type is not recognized",
        `WP_ENVIRONMENT_TYPE is set to "${env.value}", so WordPress falls back to production.`,
        "Use local, development, staging, or production.");
    } else if (env.type === "expr") {
      add("env-type-dynamic", "info", "Environment type is set dynamically",
        "This static audit cannot determine which environment type WordPress will use at runtime.");
    }
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
const SALT_CHARS = "[REDACTED]!@#$%^&*()-_[]{}<>~`+=,.;:/?|";

function randomSalt(len, rng) {
  let out = "";
  const limit = Math.floor(256 / SALT_CHARS.length) * SALT_CHARS.length;
  let rounds = 0;
  while (out.length < len) {
    if (rounds++ > 64) throw new Error("random source did not produce enough usable bytes");
    const bytes = rng(Math.max(32, (len - out.length) * 2));
    if (!bytes || typeof bytes.length !== "number") throw new TypeError("random source must return bytes");
    for (const byte of bytes) {
      if (!Number.isInteger(byte) || byte < 0 || byte > 255) throw new TypeError("random source returned an invalid byte");
      if (byte < limit) out += SALT_CHARS[byte % SALT_CHARS.length];
      if (out.length === len) break;
    }
  }
  return out;
}

/**
 * Generate a fresh set of eight salt define() lines.
 * rng(n) returns n cryptographically-random bytes; defaults to WebCrypto.
 */
export function generateSalts(rng) {
  const random = rng || ((n) => crypto.getRandomValues(new Uint8Array(n)));
  const used = new Set();
  return SALT_KEYS.map(k => {
    let v;
    let attempts = 0;
    do {
      if (attempts++ > 32) throw new Error("random source produced duplicate salts");
      v = randomSalt(64, random);
    } while (used.has(v));
    used.add(v);
    const pad = " ".repeat(Math.max(0, 18 - k.length));
    return `define('${k}',${pad} '${v}');`;
  }).join("\n");
}