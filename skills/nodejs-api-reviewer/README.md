# Node.js API Reviewer

## Overview
This skill reviews Node.js and Express API files to detect quality degradation, memory leaks, event loop blocks, and severe security flaws (SQLi, XSS, etc.).

## Use Cases
- Pull request code quality checkpoints
- Automated security scanning of controllers
- Refactoring audits for legacy APIs

## Inputs
- `file_path`: Path to local source file (filesystem MCP required)
- `code_content`: Raw source string (fallback)

## Outputs
- Markdown report containing categorized warnings, severity ratings, and actionable code fixes.

## Examples
Reviewing: `app.get('/path', (req, res) => res.send(req.query.user))`
Returns warning on potential Reflection XSS if output is HTML.

## Limitations
- Only reviews Javascript/Typescript files.
- Static analysis only; cannot verify runtime database constraints.

## Troubleshooting
- **Error: non-Node.js file content**: Ensure file extension is `.js`, `.ts`, `.jsx`, or `.tsx`.
- **Filesystem access denied**: Confirm the filesystem MCP is properly configured in the host environment.
