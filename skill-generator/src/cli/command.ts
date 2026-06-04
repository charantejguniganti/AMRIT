import { Command } from 'commander';

export interface GenerateOptions {
  output?: string;
  dryRun?: boolean;
  model?: string;
}

export function createProgram(
  generateSkillAction: (description: string | undefined, options: GenerateOptions) => Promise<void>,
  regeneratePromptAction: (skillName: string, options: GenerateOptions) => Promise<void>,
  regenerateTestsAction: (skillName: string, options: GenerateOptions) => Promise<void>,
  regenerateReadmeAction: (skillName: string, options: GenerateOptions) => Promise<void>,
  exportDiagramAction: () => Promise<void>
): Command {
  const program = new Command();

  program
    .name('amrit')
    .description('AMRIT Agentic AI Framework Developer Tooling')
    .version('1.0.0');

  const generateCmd = new Command('generate')
    .description('Generate skills, prompts, tests, readmes, or diagrams');

  generateCmd
    .command('skill [description]')
    .description('Generate a new AMRIT skill (runs interactively if description is omitted)')
    .option('-o, --output <dir>', 'Output directory for the generated skill', './skills')
    .option('--dry-run', 'Print the generated contents to standard output instead of writing files', false)
    .option('--model <model-name>', 'Anthropic model to use for generation', 'claude-3-5-sonnet-latest')
    .action(async (description, options) => {
      await generateSkillAction(description, options);
    });

  generateCmd
    .command('prompt <skillName>')
    .description('Regenerate prompts.md for an existing skill')
    .option('-o, --output <dir>', 'Skills directory', './skills')
    .option('--dry-run', 'Dry run regeneration', false)
    .action(async (skillName, options) => {
      await regeneratePromptAction(skillName, options);
    });

  generateCmd
    .command('tests <skillName>')
    .description('Regenerate tests.yaml for an existing skill')
    .option('-o, --output <dir>', 'Skills directory', './skills')
    .option('--dry-run', 'Dry run regeneration', false)
    .action(async (skillName, options) => {
      await regenerateTestsAction(skillName, options);
    });

  generateCmd
    .command('readme <skillName>')
    .description('Regenerate README.md for an existing skill')
    .option('-o, --output <dir>', 'Skills directory', './skills')
    .option('--dry-run', 'Dry run regeneration', false)
    .action(async (skillName, options) => {
      await regenerateReadmeAction(skillName, options);
    });

  generateCmd
    .command('diagram')
    .description('Export the AMRIT Skill Generation Architecture Diagram to skill-generation-architecture.md')
    .action(async () => {
      await exportDiagramAction();
    });

  program.addCommand(generateCmd);

  return program;
}
