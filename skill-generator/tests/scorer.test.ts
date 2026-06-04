import { assessSkillQuality } from '../src/utils/scorer.js';
import fs from 'fs';
import path from 'path';

describe('Skill Quality Scorer', () => {
  const testDir = path.resolve(process.cwd(), 'tests/mock-skill');

  beforeAll(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should return a low score for a directory missing all files', () => {
    const report = assessSkillQuality(testDir);
    expect(report.score).toBe(0);
    expect(report.checks.some((c) => !c.passed)).toBe(true);
  });

  it('should score highly when all valid files are present', () => {
    // Write mock valid skill.yaml
    fs.writeFileSync(
      path.join(testDir, 'skill.yaml'),
      `name: test-skill\ndescription: A valid mock skill for scoring tests.\nversion: 1.0.0\ntags:\n  - test\n  - scoring\n`,
      'utf8'
    );
    // Write mock valid prompts.md
    fs.writeFileSync(
      path.join(testDir, 'prompts.md'),
      `# System Prompt\n# User Instructions\n# Inputs\n# Outputs\n# Examples\n# Constraints\n`,
      'utf8'
    );
    // Write mock valid tests.yaml
    fs.writeFileSync(
      path.join(testDir, 'tests.yaml'),
      `tests:\n  - name: t1\n  - name: t2\n  - name: t3\n  - name: t4\n  - name: t5\n`,
      'utf8'
    );
    // Write mock valid README.md
    fs.writeFileSync(
      path.join(testDir, 'README.md'),
      `## Overview\n## Use Cases\n## Inputs\n## Outputs\n## Examples\n## Limitations\n## Troubleshooting\n`,
      'utf8'
    );

    const report = assessSkillQuality(testDir);
    expect(report.score).toBe(100);
    expect(report.checks.every((c) => c.passed)).toBe(true);
  });
});
