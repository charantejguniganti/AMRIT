#!/usr/bin/env node
import { createProgram, GenerateOptions } from './cli/command.js';
import { SkillGenerator } from './generators/skill.js';
import { logger } from './utils/logger.js';
import { validateSkillName, safeResolvePath } from './utils/security.js';
import { TemplateManager } from './templates/manager.js';
import { SkillWriter } from './generators/writer.js';
import { validateSkillYaml, validatePromptsMd, validateTestsYaml } from './validation/schema.js';
import { AIClient } from './ai/client.js';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// Standard readline helper for Interactive Mode
function ask(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function handleGenerateSkill(description: string | undefined, options: GenerateOptions) {
  try {
    let finalDesc = description;
    
    // Interactive Mode
    if (!finalDesc) {
      logger.info('Entering Interactive Mode...');
      const name = await ask('Skill Name (lowercase alphanumeric & hyphens): ');
      if (!validateSkillName(name)) {
        throw new Error('Skill name must be lowercase alphanumeric and hyphens only');
      }
      const desc = await ask('Description: ');
      if (!desc || desc.length < 10) {
        throw new Error('Description is required and must be at least 10 characters');
      }
      const mcps = await ask('Suggested MCP integrations (comma-separated): ');
      const category = await ask('Category: ');

      finalDesc = `Generate a skill named "${name}" in category "${category || 'general'}" described as: "${desc}". MCP integrations: [${mcps}]`;
    }

    const generator = new SkillGenerator();
    await generator.generate(finalDesc, {
      outputDir: options.output || './skills',
      dryRun: options.dryRun,
      model: options.model,
      provider: options.provider as 'anthropic' | 'ollama' | undefined,
    });
  } catch (error: any) {
    logger.error(`Failed to generate skill: ${error.message}`);
    process.exit(1);
  }
}

async function handleRegeneratePrompt(skillName: string, options: GenerateOptions) {
  try {
    logger.info(`Starting prompt regeneration for: ${skillName}`);
    const skillsDir = options.output || './skills';
    const baseDir = path.resolve(process.cwd());
    const targetDir = safeResolvePath(baseDir, path.join(skillsDir, skillName));
    const skillYamlPath = path.join(targetDir, 'skill.yaml');

    if (!fs.existsSync(skillYamlPath)) {
      throw new Error(`skill.yaml not found at: ${skillYamlPath}. Run generate skill first.`);
    }

    const skillMetadata = yaml.load(fs.readFileSync(skillYamlPath, 'utf8')) as any;
    const aiClient = await AIClient.create(options.provider as 'anthropic' | 'ollama' | undefined);
    const payload = await aiClient.generateSkill(`Regenerate detailed prompts for: ${skillMetadata.description || skillName}`);

    const promptReplacements = {
      SYSTEM_PROMPT: payload.systemPrompt,
      USER_INSTRUCTIONS: payload.userInstructions,
      INPUTS: payload.inputs,
      OUTPUTS: payload.outputs,
      EXAMPLES: payload.examples,
      CONSTRAINTS: payload.constraints,
    };

    const templateManager = new TemplateManager();
    const promptsMd = templateManager.render('prompts.md.template', promptReplacements);

    validatePromptsMd(promptsMd);

    if (options.dryRun) {
      logger.info('--- DRY RUN ---');
      console.log(promptsMd);
    } else {
      const targetFilePath = path.join(targetDir, 'prompts.md');
      fs.writeFileSync(targetFilePath, promptsMd, 'utf8');
      logger.success(`Regenerated and validated: ${path.relative(process.cwd(), targetFilePath)}`);
    }
  } catch (error: any) {
    logger.error(`Regeneration failed: ${error.message}`);
    process.exit(1);
  }
}

async function handleRegenerateTests(skillName: string, options: GenerateOptions) {
  try {
    logger.info(`Starting tests regeneration for: ${skillName}`);
    const skillsDir = options.output || './skills';
    const baseDir = path.resolve(process.cwd());
    const targetDir = safeResolvePath(baseDir, path.join(skillsDir, skillName));
    const skillYamlPath = path.join(targetDir, 'skill.yaml');

    if (!fs.existsSync(skillYamlPath)) {
      throw new Error(`skill.yaml not found at: ${skillYamlPath}`);
    }

    const skillMetadata = yaml.load(fs.readFileSync(skillYamlPath, 'utf8')) as any;
    const aiClient = await AIClient.create(options.provider as 'anthropic' | 'ollama' | undefined);
    const payload = await aiClient.generateSkill(`Regenerate tests for skill described as: ${skillMetadata.description || skillName}`);

    const testsReplacements = {
      TEST_CASES: SkillWriter.formatTestCases(payload.testCases),
    };

    const templateManager = new TemplateManager();
    const testsYaml = templateManager.render('tests.yaml.template', testsReplacements);

    validateTestsYaml(testsYaml);

    if (options.dryRun) {
      logger.info('--- DRY RUN ---');
      console.log(testsYaml);
    } else {
      const targetFilePath = path.join(targetDir, 'tests.yaml');
      fs.writeFileSync(targetFilePath, testsYaml, 'utf8');
      logger.success(`Regenerated and validated: ${path.relative(process.cwd(), targetFilePath)}`);
    }
  } catch (error: any) {
    logger.error(`Regeneration failed: ${error.message}`);
    process.exit(1);
  }
}

async function handleRegenerateReadme(skillName: string, options: GenerateOptions) {
  try {
    logger.info(`Starting README regeneration for: ${skillName}`);
    const skillsDir = options.output || './skills';
    const baseDir = path.resolve(process.cwd());
    const targetDir = safeResolvePath(baseDir, path.join(skillsDir, skillName));
    const skillYamlPath = path.join(targetDir, 'skill.yaml');

    if (!fs.existsSync(skillYamlPath)) {
      throw new Error(`skill.yaml not found at: ${skillYamlPath}`);
    }

    const skillMetadata = yaml.load(fs.readFileSync(skillYamlPath, 'utf8')) as any;
    const aiClient = await AIClient.create(options.provider as 'anthropic' | 'ollama' | undefined);
    const payload = await aiClient.generateSkill(`Regenerate README markdown documentation for: ${skillMetadata.description || skillName}`);

    const readmeReplacements = {
      FRIENDLY_NAME: payload.friendlyName || skillName,
      OVERVIEW: payload.overview,
      USE_CASES: payload.useCases,
      INPUTS_DESC: payload.inputsDesc,
      OUTPUTS_DESC: payload.outputsDesc,
      EXAMPLES_DESC: payload.examplesDesc,
      LIMITATIONS: payload.limitations,
      TROUBLESHOOTING: payload.troubleshooting,
    };

    const templateManager = new TemplateManager();
    const readmeMd = templateManager.render('README.md.template', readmeReplacements);

    if (options.dryRun) {
      logger.info('--- DRY RUN ---');
      console.log(readmeMd);
    } else {
      const targetFilePath = path.join(targetDir, 'README.md');
      fs.writeFileSync(targetFilePath, readmeMd, 'utf8');
      logger.success(`Regenerated: ${path.relative(process.cwd(), targetFilePath)}`);
    }
  } catch (error: any) {
    logger.error(`Regeneration failed: ${error.message}`);
    process.exit(1);
  }
}

async function handleExportDiagram() {
  try {
    const diagramContent = `# AMRIT Skill Generation Architecture

Here is the architectural data flow diagram illustrating the end-to-end scaffolding process.

\`\`\`mermaid
graph TD
    A[CLI Input / User Prompt] --> B[SkillGenerator Orchestrator]
    B --> C{Provider Selection}
    C -->|--provider ollama or auto-detected| D[OllamaProvider - Local qwen2.5-coder:7b]
    C -->|--provider anthropic or fallback| E[AnthropicProvider - Claude]
    D --> F[Generation Payload JSON]
    E --> F
    F --> G[Template Manager]
    G --> H[Validation Layer - Zod & YAML]
    H --> I[SkillWriter Filesystem]
    I --> J[Output: skill.yaml]
    I --> K[Output: prompts.md]
    I --> L[Output: tests.yaml]
    I --> M[Output: README.md]
    I --> N[Skill Quality Scorer]
\`\`\`

## Component Responsibilities
1. **CLI / Input Manager**: Collects natural language requests (or enters interactive prompting). Supports \`--provider\` flag to explicitly select the AI backend.
2. **SkillGenerator**: Coordinates compilation phases, replacements mapping, and verification.
3. **Provider Selection**: Auto-detects a running local Ollama instance (\`qwen2.5-coder:7b\`). Falls back to Anthropic if unavailable or when \`ANTHROPIC_API_KEY\` is set and \`--provider anthropic\` is used.
4. **OllamaProvider**: Calls \`http://localhost:11434/api/generate\` — no API key required. Ideal for local development and contributor onboarding.
5. **AnthropicProvider**: Calls Claude via the Anthropic SDK. Requires \`ANTHROPIC_API_KEY\`.
6. **Template Manager**: Interleaves scaffolding structures with the AI responses.
7. **Validation Layer**: Rejects outputs that violate semantic formatting or test sizing limits.
8. **Skill Quality Scorer**: Audits output directories to calculate an operational score (0–100).
`;

    const filePath = path.resolve(process.cwd(), 'skill-generation-architecture.md');
    fs.writeFileSync(filePath, diagramContent, 'utf8');
    logger.success(`Exported Architecture Diagram to: ${path.relative(process.cwd(), filePath)}`);
  } catch (error: any) {
    logger.error(`Failed to export diagram: ${error.message}`);
    process.exit(1);
  }
}

async function main() {
  const program = createProgram(
    handleGenerateSkill,
    handleRegeneratePrompt,
    handleRegenerateTests,
    handleRegenerateReadme,
    handleExportDiagram
  );
  await program.parseAsync(process.argv);
}

main().catch((error) => {
  logger.error(`Fatal error in CLI: ${error.message}`);
  process.exit(1);
});
