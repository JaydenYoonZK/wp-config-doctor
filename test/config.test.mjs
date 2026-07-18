import { test } from "node:test";
import assert from "node:assert/strict";
import { parseConfig, audit, generateSalts, SALT_KEYS } from "../docs/config.js";

const SAMPLE_INSECURE = `<?php
define( 'DB_NAME', 'wordpress' );
define( 'DB_USER', 'root' );
define( 'DB_PASSWORD', '' );
define( 'DB_HOST', 'localhost' );

define( 'AUTH_KEY',         'put your unique phrase here' );
define( 'SECURE_AUTH_KEY',  'put your unique phrase here' );
define( 'WP_DEBUG', true );

$table_prefix = 'wp_';
`;

const SAMPLE_HARDENED = `<?php
define( 'DB_NAME', 'wp_prod' );
define( 'DB_USER', 'wpuser' );
define( 'DB_PASSWORD', 'a-long-random-secret-8f3ac91b' );
define( 'DB_HOST', 'localhost' );
define('AUTH_KEY',        'x7)Kd#2p Zq|9aB^mW}oL5!rT8@vN0cE_gH1jS4uY6iP3fD-kR' );
define('SECURE_AUTH_KEY', '[REDACTED]' );
define('LOGGED_IN_KEY',   'aaAA11!!bbBB22@@ccCC33##ddDD44$$eeEE55%%ffFF66^^ggGG' );
define('NONCE_KEY',       'z9y8x7w6v5u4t3s2r1q0p!o@n#m$l%k^j&i*h(g)f-e_dcbaZZ1' );
define('AUTH_SALT',       'M1n2B3v4C5x6Z7l8K9j0H!g@F#d\\$S%aP^oI&uY*tR(eW)q, .;:' );
define('SECURE_AUTH_SALT','p0O9i8U7y6T5r4E3w2Q1!@#\\$%^&*()-_=+plmoknijbuhvygctf' );
define('LOGGED_IN_SALT',  '5t6y7u8i9o0p!q@w#e\\$r%t^y&u*i(o)p-a_sdfghjklZXCVBNM,' );
define('NONCE_SALT',      'QwErTyUiOpAsDfGhJkLzXcVbNm1234567890!@#\\$%^&*()-_=+[' );

define( 'WP_DEBUG', false );
define( 'DISALLOW_FILE_EDIT', true );
define( 'DISALLOW_UNFILTERED_HTML', true );
define( 'FORCE_SSL_ADMIN', true );
define( 'WP_MEMORY_LIMIT', '256M' );
define( 'WP_POST_REVISIONS', 10 );
define( 'WP_ENVIRONMENT_TYPE', 'production' );
$table_prefix = 'x7z_';
`;

function deterministicBytes() {
  let seed = 11;
  return (n) => {
    const bytes = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      bytes[i] = (seed + i * 37) % 256;
    }
    seed = (seed + 53) % 256;
    return bytes;
  };
}

test("parses defines including strings, bools, ints", () => {
  const { defines, tablePrefix } = parseConfig(SAMPLE_HARDENED);
  assert.equal(defines.get("DB_NAME").value, "wp_prod");
  assert.equal(defines.get("WP_DEBUG").value, false);
  assert.equal(defines.get("WP_DEBUG").type, "bool");
  assert.equal(defines.get("WP_POST_REVISIONS").value, 10);
  assert.equal(tablePrefix, "x7z_");
});

test("parses salts that contain parentheses and quotes", () => {
  const { defines } = parseConfig(SAMPLE_HARDENED);
  const auth = defines.get("AUTH_KEY").value;
  assert.ok(auth.includes("(") || auth.includes(")") || auth.includes("|"), "special chars kept");
  // the salt with an escaped $ and a ) should survive intact
  const salt = defines.get("AUTH_SALT").value;
  assert.ok(salt.includes(")"), "closing paren inside salt preserved");
});

test("insecure config raises the right critical and high findings", () => {
  const { findings, score } = audit(SAMPLE_INSECURE);
  const ids = findings.map(f => f.id);
  assert.ok(ids.includes("salts-partial") || ids.includes("salts-missing"));
  assert.ok(ids.includes("salts-placeholder"));
  assert.ok(ids.includes("wp-debug"));
  assert.ok(ids.includes("db-empty"));
  assert.ok(ids.includes("table-prefix"));
  assert.ok(ids.includes("file-edit"));
  assert.ok(score < 50, `score should be low, got ${score}`);
});

test("findings are sorted most severe first", () => {
  const { findings } = audit(SAMPLE_INSECURE);
  const order = { critical: 4, high: 3, medium: 2, low: 1, info: 0, pass: -1 };
  for (let i = 1; i < findings.length; i++) {
    assert.ok(order[findings[i - 1].level] >= order[findings[i].level], "sorted");
  }
});

test("hardened config passes the important checks", () => {
  const { findings, score } = audit(SAMPLE_HARDENED);
  const ids = findings.map(f => f.id);
  assert.ok(ids.includes("salts-ok"));
  assert.ok(ids.includes("wp-debug-ok"));
  assert.ok(ids.includes("file-edit-ok"));
  assert.ok(ids.includes("ssl-admin-ok"));
  assert.ok(ids.includes("table-prefix-ok"));
  assert.ok(!ids.includes("salts-placeholder"));
  assert.ok(!ids.includes("wp-debug"));
  assert.ok(score >= 90, `hardened score should be high, got ${score}`);
});

test("duplicate salts are detected", () => {
  const dup = `<?php
` + SALT_KEYS.map(k => `define('${k}', 'IDENTICAL_VALUE_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');`).join("\n");
  const { findings } = audit(dup);
  assert.ok(findings.some(f => f.id === "salts-duplicate"));
});

test("display_errors forced on is flagged", () => {
  const cfg = `<?php ini_set('display_errors', 1); define('WP_DEBUG', false);`;
  const { findings } = audit(cfg);
  assert.ok(findings.some(f => f.id === "display-errors"));
  for (const off of ["0", "Off", "false", "No", "None"]) {
    const ids = audit(`<?php ini_set('display_errors', '${off}');`).findings.map(f => f.id);
    assert.equal(ids.includes("display-errors"), false, off);
  }
});

test("sample-file DB placeholders are recognized", () => {
  const cfg = `<?php
define( 'DB_NAME', 'database_name_here' );
define( 'DB_USER', 'username_here' );
define( 'DB_PASSWORD', 'password_here' );`;
  const { findings } = audit(cfg);
  assert.ok(findings.some(f => f.id === "db-sample"));
});

test("non-config input returns a friendly note", () => {
  const { findings, score } = audit("just some random text");
  assert.equal(score, null);
  assert.equal(findings[0].id, "empty");
});

test("generateSalts produces eight valid, unique, quote-safe lines", () => {
  const out = generateSalts(deterministicBytes());
  const lines = out.split("\n");
  assert.equal(lines.length, 8);
  const values = [];
  for (let i = 0; i < 8; i++) {
    const m = /define\('([A-Z_]+)',\s+'(.+)'\);/.exec(lines[i]);
    assert.ok(m, `line ${i} well formed: ${lines[i]}`);
    assert.equal(m[1], SALT_KEYS[i]);
    assert.equal(m[2].length, 64);
    assert.ok(!m[2].includes("'") && !m[2].includes("\\"), "safe inside single quotes");
    values.push(m[2]);
  }
  assert.equal(new Set(values).size, 8, "all salts unique");
});

test("generated salts survive a round-trip parse", () => {
  const cfg = "<?php\n" + generateSalts(deterministicBytes());
  const { defines } = parseConfig(cfg);
  for (const k of SALT_KEYS) {
    assert.equal(defines.get(k).value.length, 64, k);
  }
  // and the fresh set audits clean on salts
  const { findings } = audit(cfg);
  assert.ok(findings.some(f => f.id === "salts-ok"));
});

test("ignores commented-out defines (no false WP_DEBUG alarm)", () => {
  const cfg = `<?php
// define( 'WP_DEBUG', true );   // local only
define( 'WP_DEBUG', false );
`;
  assert.equal(parseConfig(cfg).defines.get("WP_DEBUG").value, false);
  const ids = audit(cfg).findings.map(f => f.id);
  assert.ok(!ids.includes("wp-debug"), "a commented-out debug line must not be reported as active");
});

test("a commented-out hardening define is not counted as set (no false pass)", () => {
  const cfg = `<?php\n/* define( 'DISALLOW_FILE_EDIT', true ); */\ndefine('DB_NAME','x');\n`;
  const ids = audit(cfg).findings.map(f => f.id);
  assert.ok(ids.includes("file-edit"), "must flag file editing as still enabled");
  assert.ok(!ids.includes("file-edit-ok"), "must not report it as disabled");
});

test("DISALLOW_FILE_MODS also counts as dashboard file editing disabled", () => {
  const ids = audit(`<?php define('DISALLOW_FILE_MODS', true); define('DB_NAME','x');`).findings.map(f => f.id);
  assert.ok(ids.includes("file-edit-ok"));
  assert.ok(!ids.includes("file-edit"));
});

test("stripComments preserves salt characters that look like comments", () => {
  const salt = "ab/*c#d//e" + "x".repeat(54);   // contains /*  #  //  but is one string
  const cfg = `<?php\ndefine('AUTH_KEY', '${salt}');\n`;
  assert.equal(parseConfig(cfg).defines.get("AUTH_KEY").value, salt);
});

test("a # line comment is stripped too", () => {
  const cfg = `<?php\n# define('FORCE_SSL_ADMIN', true);\ndefine('DB_NAME','x');\n`;
  assert.ok(audit(cfg).findings.map(f => f.id).includes("ssl-admin"), "hash-commented define must not count as set");
});

test("WP_DEBUG set to a string is flagged (PHP truthiness footgun)", () => {
  const ids = audit(`<?php define('WP_DEBUG', 'false'); define('DB_NAME','x');`).findings.map(f => f.id);
  assert.ok(ids.includes("wp-debug-string"), "a string WP_DEBUG must be flagged as on");
  assert.ok(!ids.includes("wp-debug-ok"), "must not report it as off");
});

test("WP_ALLOW_REPAIR left enabled is flagged", () => {
  const ids = audit(`<?php define('WP_ALLOW_REPAIR', true); define('DB_NAME','x');`).findings.map(f => f.id);
  assert.ok(ids.includes("allow-repair"));
});

test("DISALLOW_UNFILTERED_HTML unset is flagged, true passes", () => {
  const missing = audit(`<?php define('DB_NAME','x');`).findings.map(f => f.id);
  assert.ok(missing.includes("unfiltered-html"));
  assert.ok(!missing.includes("unfiltered-html-ok"));
  const set = audit(`<?php define('DISALLOW_UNFILTERED_HTML', true); define('DB_NAME','x');`).findings.map(f => f.id);
  assert.ok(set.includes("unfiltered-html-ok"));
  assert.ok(!set.includes("unfiltered-html"));
  const explicitFalse = audit(`<?php define('DISALLOW_UNFILTERED_HTML', false); define('DB_NAME','x');`).findings.map(f => f.id);
  assert.ok(explicitFalse.includes("unfiltered-html"));
  const commented = audit(`<?php /* define('DISALLOW_UNFILTERED_HTML', true); */ define('DB_NAME','x');`).findings.map(f => f.id);
  assert.ok(commented.includes("unfiltered-html"), "a commented-out define must not count as set");
});

test("normal boolean WP_DEBUG values are unaffected by the string check", () => {
  assert.ok(audit(`<?php define('WP_DEBUG', false);`).findings.map(f => f.id).includes("wp-debug-ok"));
  assert.ok(audit(`<?php define('WP_DEBUG', true);`).findings.map(f => f.id).includes("wp-debug"));
});

test("WP_DEBUG_LOG=true is flagged, a custom path string is not", () => {
  const trueIds = audit(`<?php define('WP_DEBUG_LOG', true); define('DB_NAME','x');`).findings.map(f => f.id);
  assert.ok(trueIds.includes("debug-log"), "true logs to the default web-readable path");
  const pathIds = audit(`<?php define('WP_DEBUG_LOG', '/var/log/wp/debug.log'); define('DB_NAME','x');`).findings.map(f => f.id);
  assert.ok(!pathIds.includes("debug-log"), "a custom path is the recommended fix, not a finding");
  for (const value of ["'true'", "'1'", "1"]) {
    const ids = audit(`<?php define('WP_DEBUG_LOG', ${value});`).findings.map(f => f.id);
    assert.ok(ids.includes("debug-log"), value);
  }
});

test("generated salts never contain a space, quote, or backslash", () => {
  const out = generateSalts(deterministicBytes());
  const values = out.split("\n").map(l => l.match(/'([^']*)'\);$/)?.[1] ?? "");
  for (const v of values) {
    assert.equal(v.length, 64);
    assert.ok(!/[ '\\]/.test(v), `salt must have no space, quote, or backslash: ${JSON.stringify(v)}`);
  }
});

test("WP_HOME / WP_SITEURL hardcoded to http:// is flagged, https is not", () => {
  const http = audit(`<?php define('WP_HOME','http://example.com'); define('WP_SITEURL','http://example.com'); define('DB_NAME','x');`).findings.map(f => f.id);
  assert.ok(http.includes("wp-home-http"));
  assert.ok(http.includes("wp-siteurl-http"));
  const https = audit(`<?php define('WP_HOME','https://example.com'); define('DB_NAME','x');`).findings.map(f => f.id);
  assert.ok(!https.includes("wp-home-http"));
});

test("code-like text inside strings and heredocs is never executed by the parser", () => {
  const cfg = `<?php
define('DB_PASSWORD', "define('WP_DEBUG', true); ini_set('display_errors', 1); $table_prefix = 'wp_';");
$note = <<<'TEXT'
define('WP_ALLOW_REPAIR', true);
ini_set('display_errors', 1);
TEXT;
define('WP_DEBUG', false);
$table_prefix = 'custom_';`;
  const parsed = parseConfig(cfg);
  assert.equal(parsed.defines.get("WP_DEBUG").value, false);
  assert.equal(parsed.defines.has("WP_ALLOW_REPAIR"), false);
  assert.equal(parsed.tablePrefix, "custom_");
  assert.equal(parsed.displayErrorsForced, false);
  const ids = audit(cfg).findings.map(f => f.id);
  assert.equal(ids.includes("wp-debug"), false);
  assert.equal(ids.includes("display-errors"), false);
  assert.equal(ids.includes("allow-repair"), false);
});

test("PHP function names are case-insensitive", () => {
  const parsed = parseConfig(`<?php DEFINE("WP_DEBUG", FALSE);`);
  assert.equal(parsed.defines.get("WP_DEBUG").value, false);
});

test("literal prefixes followed by expressions stay dynamic", () => {
  const cfg = `<?php
define('DB_PASSWORD', '' . getenv('DB_PASSWORD'));
define('WP_HOME', 'http://' . getenv('HTTP_HOST'));
define('FORCE_SSL_ADMIN', getenv('FORCE_SSL_ADMIN'));
define('DISALLOW_FILE_EDIT', env_flag('LOCK_EDITOR'));
define('WP_DEBUG', getenv('WP_DEBUG'));
define('WP_ALLOW_REPAIR', env_flag('ALLOW_REPAIR'));
$table_prefix = getenv('DB_PREFIX');`;
  const parsed = parseConfig(cfg);
  assert.equal(parsed.defines.get("DB_PASSWORD").type, "expr");
  assert.equal(parsed.defines.get("WP_HOME").type, "expr");
  assert.equal(parsed.tablePrefix, null);
  assert.equal(parsed.tablePrefixType, "expr");
  const ids = audit(cfg).findings.map(f => f.id);
  assert.equal(ids.includes("db-empty"), false);
  assert.equal(ids.includes("wp-home-http"), false);
  for (const id of ["ssl-admin-dynamic", "file-edit-dynamic", "wp-debug-dynamic", "allow-repair-dynamic", "table-prefix-dynamic"]) {
    assert.ok(ids.includes(id), id);
  }
  assert.equal(ids.includes("ssl-admin-ok"), false);
  assert.equal(ids.includes("file-edit-ok"), false);
});

test("duplicate security constants are reported without changing first-definition semantics", () => {
  const cfg = `<?php define('WP_DEBUG', false); define('WP_DEBUG', true);`;
  const parsed = parseConfig(cfg);
  assert.equal(parsed.defines.get("WP_DEBUG").value, false);
  assert.deepEqual(parsed.duplicateDefines, ["WP_DEBUG"]);
  const ids = audit(cfg).findings.map(f => f.id);
  assert.ok(ids.includes("duplicate-defines"));
  assert.ok(ids.includes("wp-debug-ok"));
  assert.equal(ids.includes("wp-debug"), false);
});

test("unterminated and interpolated strings are not trusted as literals", () => {
  const interpolated = parseConfig('<?php define("DB_PASSWORD", "$DB_PASSWORD");');
  assert.equal(interpolated.defines.get("DB_PASSWORD").type, "expr");
  const unterminated = parseConfig("<?php define('WP_DEBUG', 'false);");
  assert.equal(unterminated.defines.has("WP_DEBUG"), false);
});

test("double-quoted PHP escapes are decoded for literal checks", () => {
  const parsed = parseConfig('<?php define("DB_PASSWORD", "pass\\x77ord\\n");');
  assert.equal(parsed.defines.get("DB_PASSWORD").value, "password\n");
});

test("invalid environment types are explained", () => {
  const ids = audit(`<?php define('WP_ENVIRONMENT_TYPE', 'prod');`).findings.map(f => f.id);
  assert.ok(ids.includes("env-type-invalid"));
  assert.equal(ids.includes("env-type"), false);
});

test("debug mode is not penalized in local and development environments", () => {
  for (const environment of ["local", "development"]) {
    const result = audit(`<?php define('WP_ENVIRONMENT_TYPE', '${environment}'); define('WP_DEBUG', true);`);
    const ids = result.findings.map(f => f.id);
    assert.ok(ids.includes("wp-debug-development"), environment);
    assert.equal(ids.includes("wp-debug"), false, environment);
    assert.equal(ids.includes("wp-debug-display"), false, environment);
  }
  const staging = audit(`<?php define('WP_ENVIRONMENT_TYPE', 'staging'); define('WP_DEBUG', true);`).findings.map(f => f.id);
  assert.ok(staging.includes("wp-debug"));
});

test("non-string and dynamic salts cannot receive a clean pass", () => {
  const values = SALT_KEYS.map((key, index) => index === 0
    ? `define('${key}', true);`
    : index === 1
      ? `define('${key}', getenv('${key}'));`
      : `define('${key}', '${key}_${"x".repeat(50)}');`
  ).join("\n");
  const ids = audit(`<?php\n${values}`).findings.map(f => f.id);
  assert.ok(ids.includes("salts-invalid"));
  assert.ok(ids.includes("salts-dynamic"));
  assert.equal(ids.includes("salts-ok"), false);
});

test("salt generation rejects biased tail bytes and malformed random sources", () => {
  let calls = 0;
  const salts = generateSalts((n) => {
    calls++;
    const bytes = new Uint8Array(n);
    bytes.fill(calls === 1 ? 255 : calls % 170);
    return bytes;
  });
  assert.equal(salts.split("\n").length, 8);
  assert.ok(calls > 8, "rejected bytes require another random batch");
  assert.throws(() => generateSalts(() => [999]), /invalid byte/);
  assert.throws(() => generateSalts(() => null), /must return bytes/);
});

test("parser rejects non-string and oversized input", () => {
  assert.throws(() => parseConfig(null), /must be a string/);
  assert.throws(() => parseConfig("x".repeat(1024 * 1024 + 1)), /exceeds 1 MiB/);
});


test("a /*/ ... */ block is one comment, so commented-out defines stay inactive", () => {
  const src = `<?php\n/*/\ndefine("DISALLOW_FILE_EDIT", true);\n*/\ndefine("WP_DEBUG", false);\ndefine("DB_NAME","x");`;
  const cfg = parseConfig(src);
  assert.equal(cfg.defines.has("DISALLOW_FILE_EDIT"), false, "DISALLOW_FILE_EDIT is commented out");
  const ids = audit(src).findings.map(f => f.id);
  assert.ok(!ids.includes("file-edit-ok"), "must not report a false 'file editing disabled' pass");
  // a normal block comment and a real define after it still behave
  assert.equal(parseConfig(`<?php\n/* define("WP_DEBUG", true); */\ndefine("DB_NAME","x");`).defines.has("WP_DEBUG"), false);
  assert.equal(parseConfig(`<?php\n/* x */\ndefine("WP_DEBUG", true);`).defines.has("WP_DEBUG"), true);
});

test("a PHP 7.3+ flexible heredoc close does not swallow later defines", () => {
  const src = `<?php\ndefine("X", <<<END\nhi\nEND);\ndefine("DISALLOW_FILE_EDIT", true);`;
  const cfg = parseConfig(src);
  assert.ok(cfg.defines.has("X"));
  assert.ok(cfg.defines.has("DISALLOW_FILE_EDIT"), "the define after the heredoc must survive");
  // a label prefix inside the body ("ENDING") must not act as the close
  const src2 = `<?php\ndefine("X", <<<END\nENDING is fine\nEND);\ndefine("Y", true);`;
  const cfg2 = parseConfig(src2);
  assert.ok(cfg2.defines.has("X") && cfg2.defines.has("Y"));
});

test("define() with a third case-insensitivity argument reads the value, not the flag", () => {
  const edit = parseConfig(`<?php\ndefine("DISALLOW_FILE_EDIT", true, true);`).defines.get("DISALLOW_FILE_EDIT");
  assert.equal(edit.value, true);
  assert.equal(edit.type, "bool");
  const ids = audit(`<?php\ndefine("DISALLOW_FILE_EDIT", true, true);\ndefine("DB_NAME","x");`).findings.map(f => f.id);
  assert.ok(!ids.includes("file-edit-dynamic"), "a 3-arg hardened define is not a dynamic expression");
  const salt = parseConfig(`<?php\ndefine("AUTH_KEY", "[REDACTED]", true);`).defines.get("AUTH_KEY");
  assert.equal(salt.type, "string");
});