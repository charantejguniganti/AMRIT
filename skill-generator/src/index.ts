#!/usr/bin/env node
import { createProgram, GenerateOptions } from './cli/command.js';
import { SkillGenerator } from './generators/skill.js';
import { logger } from './utils/logger.js';

async function handleGenerateSkill(description: string, options: GenerateOptions) {
  try {
    const generator = new SkillGenerator();
    await generator.generate(description, {
      outputDir: options.output || './skills',
      dryRun: options.dryRun,
      model: options.model,
    });
  } catch (error: any) {
    logger.error(`Failed to generate skill: ${error.message}`);
    process.exit(1);
  }
}

async function main() {
  const program = createProgram(handleGenerateSkill);
  await program.parseAsync(process.argv);
}

main().catch((error) => {
  logger.error(`Fatal error in CLI: ${error.message}`);
  process.exit(1);
});
