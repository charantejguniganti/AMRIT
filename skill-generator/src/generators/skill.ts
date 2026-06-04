import { AIClient, GenerationPayload } from '../ai/client.js';
import { TemplateManager } from '../templates/manager.js';
import { SkillWriter, FileWritePayload } from './writer.js';
import { validateSkillYaml, validatePromptsMd, validateTestsYaml } from '../validation/schema.js';
import { validateSkillName } from '../utils/security.js';
import { logger } from '../utils/logger.js';

export interface GeneratorConfig {
  outputDir: string;
  dryRun?: boolean;
  model?: string;
}

export class SkillGenerator {
  private aiClient: AIClient;
  private templateManager: TemplateManager;
  private skillWriter: SkillWriter;

  constructor() {
    this.aiClient = new AIClient();
    this.templateManager = new TemplateManager();
    this.skillWriter = new SkillWriter();
  }

  /**
   * Run the end-to-end skill generation process.
   */
  public async generate(description: string, config: GeneratorConfig): Promise<void> {
    logger.info(`Starting generation workflow for skill: "${description}"`);

    // 1. Fetch AI Generation payload
    const payload = await this.aiClient.generateSkill(description, config.model);

    // 2. Validate skill name to ensure safety
    if (!validateSkillName(payload.name)) {
      throw new Error(`Generated skill name "${payload.name}" is invalid. Must be lowercase alphanumeric characters and hyphens only.`);
    }

    logger.info(`Formatting templates for skill: "${payload.name}"...`);

    // 3. Formulate Replacements for templates
    const skillReplacements = {
      NAME: payload.name,
      DESCRIPTION: payload.description,
      VERSION: payload.version,
      CATEGORY: payload.category,
      TAGS: SkillWriter.formatYamlList(payload.tags),
      OWNER: payload.owner,
      TOOLS: SkillWriter.formatYamlList(payload.tools),
      MCP: SkillWriter.formatYamlList(payload.mcp),
    };

    const promptsReplacements = {
      SYSTEM_PROMPT: payload.systemPrompt,
      USER_INSTRUCTIONS: payload.userInstructions,
      INPUTS: payload.inputs,
      OUTPUTS: payload.outputs,
      EXAMPLES: payload.examples,
      CONSTRAINTS: payload.constraints,
    };

    const testsReplacements = {
      TEST_CASES: SkillWriter.formatTestCases(payload.testCases),
    };

    const readmeReplacements = {
      FRIENDLY_NAME: payload.friendlyName,
      OVERVIEW: payload.overview,
      USE_CASES: payload.useCases,
      INPUTS_DESC: payload.inputsDesc,
      OUTPUTS_DESC: payload.outputsDesc,
      EXAMPLES_DESC: payload.examplesDesc,
      LIMITATIONS: payload.limitations,
      TROUBLESHOOTING: payload.troubleshooting,
    };

    // 4. Render file contents
    const skillYaml = this.templateManager.render('skill.yaml.template', skillReplacements);
    const promptsMd = this.templateManager.render('prompts.md.template', promptsReplacements);
    const testsYaml = this.templateManager.render('tests.yaml.template', testsReplacements);
    const readmeMd = this.templateManager.render('README.md.template', readmeReplacements);

    // 5. Validation Layer
    logger.info('Running validator schemas on generated files...');
    try {
      validateSkillYaml(skillYaml);
      validatePromptsMd(promptsMd);
      validateTestsYaml(testsYaml);
      logger.success('Validation passed successfully for all files.');
    } catch (validationError: any) {
      logger.error(`Validation Failed: ${validationError.message}`);
      throw new Error(`Generation rejected: Output did not meet AMRIT framework schemas. Details: ${validationError.message}`);
    }

    // 6. Write files to directory
    const filePayload: FileWritePayload = {
      skillYaml,
      promptsMd,
      testsYaml,
      readmeMd,
    };

    this.skillWriter.writeFiles(config.outputDir, payload.name, filePayload, config.dryRun);
    logger.success(`Skill "${payload.friendlyName}" successfully generated!`);
  }
}
