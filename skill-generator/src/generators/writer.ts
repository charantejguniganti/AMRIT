import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { safeResolvePath } from '../utils/security.js';
import { logger } from '../utils/logger.js';

export interface FileWritePayload {
  skillYaml: string;
  promptsMd: string;
  testsYaml: string;
  readmeMd: string;
}

export class SkillWriter {
  /**
   * Serializes array strings into YAML format indented lists.
   */
  public static formatYamlList(items: string[], indent = 2): string {
    if (!items || items.length === 0) return ' []';
    const spacing = ' '.repeat(indent);
    return items.map((item) => `${spacing}- ${item}`).join('\n');
  }

  /**
   * Serializes test cases into YAML format list.
   */
  public static formatTestCases(testCases: Array<{ name: string; input: any; expected: any }>): string {
    const obj = { tests: testCases };
    const dumped = yaml.dump(obj, { indent: 2, noRefs: true });
    // Remove the top-level "tests:" declaration because the template already contains "tests:"
    // We just return the indented list
    const lines = dumped.split('\n');
    return lines.slice(1).join('\n');
  }

  /**
   * Writes the generated files to the target folder safely.
   */
  public writeFiles(
    outputDir: string,
    skillName: string,
    payload: FileWritePayload,
    dryRun = false
  ): void {
    const baseDir = path.resolve(process.cwd());
    const targetDir = safeResolvePath(baseDir, path.join(outputDir, skillName));

    if (dryRun) {
      logger.info('--- DRY RUN: File outputs will be logged to console ---');
      console.log(`\n=== Target Directory: ${targetDir} ===\n`);
      console.log(`--- [NEW] skill.yaml --- \n${payload.skillYaml}\n`);
      console.log(`--- [NEW] prompts.md --- \n${payload.promptsMd}\n`);
      console.log(`--- [NEW] tests.yaml --- \n${payload.testsYaml}\n`);
      console.log(`--- [NEW] README.md --- \n${payload.readmeMd}\n`);
      return;
    }

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const files = [
      { name: 'skill.yaml', content: payload.skillYaml },
      { name: 'prompts.md', content: payload.promptsMd },
      { name: 'tests.yaml', content: payload.testsYaml },
      { name: 'README.md', content: payload.readmeMd },
    ];

    for (const file of files) {
      const filePath = path.join(targetDir, file.name);
      fs.writeFileSync(filePath, file.content, 'utf8');
      logger.success(`Created: ${path.relative(process.cwd(), filePath)}`);
    }
  }
}
