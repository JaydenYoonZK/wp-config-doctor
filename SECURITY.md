# Security Policy

## Reporting a vulnerability

If you find a security issue in WP Config Doctor, please report it privately rather than opening a public issue.

Use GitHub's private vulnerability reporting on this repository: choose "Report a vulnerability" under the Security tab.

You can expect an acknowledgment within 72 hours. Please include steps to reproduce and, if you have one, a suggested fix.

## Scope

The interesting attack surface is untrusted input: pasted wp-config.php content, database credential values, generated salts, copied output, and the browser privacy boundary. Reports about parser hangs, misleading security findings, XSS or HTML injection, weak generated salts, or anything that could leak pasted configuration data are in scope.

## Supported Versions

Only the latest release is supported. The tool has zero runtime dependencies by design; if you find that no longer true, that is also a bug worth reporting.
