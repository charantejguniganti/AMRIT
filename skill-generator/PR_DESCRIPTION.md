# PR: Feat: AI-Powered Skill Generator for Developer Onboarding

## Description
This PR introduces the **AI-Powered Skill Generator** to the AMRIT Agentic AI Framework under `AMRIT/skill-generator`. 

It enables contributors and developers to bootstrap fully-functional AMRIT skills in under 60 seconds with a single natural language CLI command:
```bash
amrit generate skill "description"
```

## Architectural Components Added
1. **CLI Commander Interface (`src/cli/command.ts`)**: Supports the generate pipeline and enables future expansions (`generate prompt`, `generate tests`, etc.).
2. **AI Client Engine (`src/ai/client.ts`)**: Integrates with the Anthropic Claude API using structured outputs. It automatically infers skill categorization, domain-specific tags, MCP server requirements, and tool hooks.
3. **Template Management (`src/templates/manager.ts`)**: Houses standardized framework placeholders for `skill.yaml`, `prompts.md`, `tests.yaml`, and `README.md`.
4. **Validation Layer (`src/validation/schema.ts`)**: Asserts output correctness using Zod, ensuring generated skills match AMRIT standards (e.g. at least 5 test cases covering happy/adversarial paths, presence of all required prompt headers, and semver compliance).
5. **Security Layer (`src/utils/security.ts`)**: Implements name sanitization and path traversal detection to reject unsafe commands.

## Example Skills Included
We have pre-packaged three complete generated skill examples:
- **Node.js API Reviewer** (`skills/nodejs-api-reviewer`)
- **GitHub Pull Request Reviewer** (`skills/github-pr-reviewer`)
- **Docker Security Auditor** (`skills/docker-security-auditor`)

## Verification Status
- Built and ran TypeScript compiler checks.
- Created unit test suite covering path resolution safety and schema parser limits. All 10 specs pass:
  ```bash
  Test Suites: 2 passed, 2 total
  Tests:       10 passed, 10 total
  ```
