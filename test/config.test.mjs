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
define('SECURE_AUTH_KEY', 'Q2wE3rT4yU5iO6pA7sD8fG9hJ0kL1zX2cV3bN4mQ5wE6rT7yU8i' );
define('LOGGED_IN_KEY',   'aaAA11!!bbBB22@@ccCC33##ddDD44$$eeEE55%%ffFF66^^ggGG' );
define('NONCE_KEY',       'z9y8x7w6v5u4t3s2r1q0p!o@n#m$l%k^j&i*h(g)f-e_dcbaZZ1' );
define('AUTH_SALT',       'M1n2B3v4C5x6Z7l8K9j0H!g@F#d\\$S%aP^oI&uY*tR(eW)q, .;:' );
define('SECURE_AUTH_SALT','p0O9i8U7y6T5r4E3w2Q1!@#\\$%^&*()-_=+plmoknijbuhvygctf' );
define('LOGGED_IN_SALT',  '5t6y7u8i9o0p!q@w#e\\$r%t^y&u*i(o)p-a_sdfghjklZXCVBNM,' );
define('NONCE_SALT',      'QwErTyUiOpAsDfGhJkLzXcVbNm1234567890!@#\\$%^&*()-_=+[' );

define( 'WP_DEBUG', false );
define( 'DISALLOW_FILE_EDIT', true );
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

test("normal boolean WP_DEBUG values are unaffected by the string check", () => {
  assert.ok(audit(`<?php define('WP_DEBUG', false);`).findings.map(f => f.id).includes("wp-debug-ok"));
  assert.ok(audit(`<?php define('WP_DEBUG', true);`).findings.map(f => f.id).includes("wp-debug"));
});

test("WP_DEBUG_LOG=true is flagged, a custom path string is not", () => {
  const trueIds = audit(`<?php define('WP_DEBUG_LOG', true); define('DB_NAME','x');`).findings.map(f => f.id);
  assert.ok(trueIds.includes("debug-log"), "true logs to the default web-readable path");
  const pathIds = audit(`<?php define('WP_DEBUG_LOG', '/var/log/wp/debug.log'); define('DB_NAME','x');`).findings.map(f => f.id);
  assert.ok(!pathIds.includes("debug-log"), "a custom path is the recommended fix, not a finding");
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
