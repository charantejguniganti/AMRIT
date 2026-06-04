# AMRIT Skill Generation Architecture

Here is the architectural data flow diagram illustrating the end-to-end scaffolding process.

```mermaid
graph TD
    A[CLI Input / User Prompt] --> B[SkillGenerator Orchestrator]
    B --> C[AI Client - Anthropic Claude]
    C --> D[Generation Payload JSON]
    D --> E[Template Manager]
    E --> F[Validation Layer - Zod & YAML]
    F --> G[SkillWriter Filesystem]
    G --> H[Output: skill.yaml]
    G --> I[Output: prompts.md]
    G --> J[Output: tests.yaml]
    G --> K[Output: README.md]
    G --> L[Skill Quality Scorer]
```

## Component Responsibilities
1. **CLI / Input Manager**: Collects natural language requests (or enters interactive prompting).
2. **SkillGenerator**: Coordinates compilation phases, replacements mapping, and verification.
3. **AI Client**: Communicates with Anthropic models to synthesize capability structures, test inputs, and documentation sections.
4. **Template Manager**: Interleaves scaffolding structures with the AI responses.
5. **Validation Layer**: Rejects outputs that violate semantic formatting or test sizing limits.
6. **Skill Quality Scorer**: Audits output directories to calculate an operational score (0-100).
