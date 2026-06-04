import { Command } from 'commander';

export interface GenerateOptions {
  output?: string;
  dryRun?: boolean;
  model?: string;
}

export function createProgram(
  generateSkillAction: (description: string, options: GenerateOptions) => Promise<void>
): Command {
  const program = new Command();

  program
    .name('amrit')
    .description('AMRIT Agentic AI Framework Developer Tooling')
    .version('1.0.0');

  const generateCmd = new Command('generate')
    .description('Generate skills, prompts, tests, readmes, or all');

  generateCmd
    .command('skill <description>')
    .description('Generate a new AMRIT skill from a natural language description')
    .option('-o, --output <dir>', 'Output directory for the generated skill', './skills')
    .option('--dry-run', 'Print the generated contents to standard output instead of writing files', false)
    .option('--model <model-name>', 'Anthropic model to use for generation', 'claude-3-5-sonnet-latest')
    .action(async (description, options) => {
      await generateSkillAction(description, options);
    });

  // Placeholder commands for future expansion as requested
  generateCmd
    .command('prompt')
    .description('Generate only a prompts.md file (future expansion)')
    .action(() => {
      console.log('Generating prompt (coming soon)...');
    });

  generateCmd
    .command('tests')
    .description('Generate only a tests.yaml file (future expansion)')
    .action(() => {
      console.log('Generating tests (coming soon)...');
    });

  generateCmd
    .command('readme')
    .description('Generate only a README.md file (future expansion)')
    .action(() => {
      console.log('Generating README (coming soon)...');
    });

  generateCmd
    .command('all')
    .description('Generate all components (future expansion)')
    .action(() => {
      console.log('Generating all (coming soon)...');
    });

  program.addCommand(generateCmd);

  return program;
}
