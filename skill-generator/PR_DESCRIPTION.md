# feat(generator): introduce AI-powered skill scaffolding system with automated metadata, prompts, tests, and documentation generation

## Problem

Creating new AMRIT skills requires significant manual setup. Developers must manually write metadata (`skill.yaml`), prompt templates (`prompts.md`), test frameworks (`tests.yaml`), and extensive readmes (`README.md`), which takes between 20–60 minutes per skill. This creates friction for contributor onboarding and slows down ecosystem expansion.

## Solution

This PR introduces an AI-powered skill generator capable of scaffolding complete, framework-compliant skills from natural language descriptions under 60 seconds.

## Features

- **Anthropic-Powered Generation**: Infers skill purpose, tools, categories, and MCP requirements.
- **Interactive Mode**: Prompts users for inputs step-by-step when description argument is omitted.
- **Dry-Run Mode**: Visualizes files in the console without writing them to disk (`--dry-run`).
- **Regeneration Commands**: Regenerate individual components (`prompt`, `tests`, `readme`) dynamically.
- **Validation Layer**: Runs Zod and YAML checks to reject malformed payloads.
- **Quality Scoring**: Outputs a `0-100` score grading metadata, prompt segments, test completeness, and README coverage.
- **Architecture Export**: Exports the operational flow to a Mermaid.js diagram (`amrit generate diagram`).

## Example

```bash
$ amrit generate skill "review Node.js APIs"
ℹ Starting generation workflow for skill: "review Node.js APIs"
ℹ Sending generation request to Anthropic (claude-3-5-sonnet-latest)...
ℹ Formatting templates for skill: "nodejs-api-reviewer"...
ℹ Running validator schemas on generated files...
✔ Validation passed successfully for all files.
✔ Created: skills/nodejs-api-reviewer/skill.yaml
✔ Created: skills/nodejs-api-reviewer/prompts.md
✔ Created: skills/nodejs-api-reviewer/tests.yaml
✔ Created: skills/nodejs-api-reviewer/README.md
✔ Skill "Node.js API Reviewer" successfully generated!

=============================================
Skill Quality Score: 100/100
✓ Metadata Config: Valid name, description, tags, version
✓ Prompt Scaffolding: All 6 standard prompt headers exist
✓ Scaffolded Tests: Found 5 test cases (meets criteria)
✓ Documentation depth: All standard documentation sections exist
=============================================
```

## Testing

- **12 unit tests** spanning path safety, schemas validation, and Quality Scorer.
- Security filters rejecting path traversal attacks (e.g. `../../etc/passwd`).
- Schema validation enforcing at least 5 tests (with happy path/edge cases).

## Future Work

- **Skill marketplace integration** for sharing generator output.
- **Skill publishing workflows** to publish validated skills directly.
- **Additional model providers** (e.g., Gemini, OpenAI).
