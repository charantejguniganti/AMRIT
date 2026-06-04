import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

export interface ScoreReport {
  score: number;
  checks: Array<{ name: string; passed: boolean; message: string }>;
}

export function assessSkillQuality(skillDir: string): ScoreReport {
  const report: ScoreReport = { score: 100, checks: [] };

  const skillYamlPath = path.join(skillDir, 'skill.yaml');
  const promptsMdPath = path.join(skillDir, 'prompts.md');
  const testsYamlPath = path.join(skillDir, 'tests.yaml');
  const readmeMdPath = path.join(skillDir, 'README.md');

  // 1. Metadata check (25 points)
  let yamlPoints = 25;
  if (!fs.existsSync(skillYamlPath)) {
    yamlPoints = 0;
    report.checks.push({ name: 'Metadata Config', passed: false, message: 'Missing skill.yaml' });
  } else {
    try {
      const data = yaml.load(fs.readFileSync(skillYamlPath, 'utf8')) as any;
      const issues: string[] = [];
      if (!data.name) issues.push('missing name');
      if (!data.description || data.description.length < 10) issues.push('insufficient description');
      if (!data.version || !/^\d+\.\d+\.\d+$/.test(data.version)) issues.push('invalid semver version');
      if (!data.tags || data.tags.length < 2) issues.push('less than 2 tags');

      if (issues.length > 0) {
        yamlPoints = Math.max(0, 25 - (issues.length * 6));
        report.checks.push({ name: 'Metadata Config', passed: false, message: `Issues found: ${issues.join(', ')}` });
      } else {
        report.checks.push({ name: 'Metadata Config', passed: true, message: 'Valid name, description, tags, version' });
      }
    } catch {
      yamlPoints = 0;
      report.checks.push({ name: 'Metadata Config', passed: false, message: 'Unparsable skill.yaml' });
    }
  }

  // 2. Prompts structure check (25 points)
  let promptsPoints = 25;
  if (!fs.existsSync(promptsMdPath)) {
    promptsPoints = 0;
    report.checks.push({ name: 'Prompt Scaffolding', passed: false, message: 'Missing prompts.md' });
  } else {
    const content = fs.readFileSync(promptsMdPath, 'utf8');
    const sections = ['# System Prompt', '# User Instructions', '# Inputs', '# Outputs', '# Examples', '# Constraints'];
    const missing = sections.filter((sec) => !content.includes(sec));

    if (missing.length > 0) {
      promptsPoints = Math.max(0, 25 - (missing.length * 4));
      report.checks.push({ name: 'Prompt Scaffolding', passed: false, message: `Missing sections: ${missing.join(', ')}` });
    } else {
      report.checks.push({ name: 'Prompt Scaffolding', passed: true, message: 'All 6 standard prompt headers exist' });
    }
  }

  // 3. Tests completeness (25 points)
  let testPoints = 25;
  if (!fs.existsSync(testsYamlPath)) {
    testPoints = 0;
    report.checks.push({ name: 'Scaffolded Tests', passed: false, message: 'Missing tests.yaml' });
  } else {
    try {
      const data = yaml.load(fs.readFileSync(testsYamlPath, 'utf8')) as any;
      const count = data?.tests?.length || 0;
      if (count < 5) {
        testPoints = Math.max(0, 25 - ((5 - count) * 5));
        report.checks.push({ name: 'Scaffolded Tests', passed: false, message: `Only ${count}/5 minimum tests found` });
      } else {
        report.checks.push({ name: 'Scaffolded Tests', passed: true, message: `Found ${count} test cases (meets criteria)` });
      }
    } catch {
      testPoints = 0;
      report.checks.push({ name: 'Scaffolded Tests', passed: false, message: 'Unparsable tests.yaml' });
    }
  }

  // 4. Documentation check (25 points)
  let docPoints = 25;
  if (!fs.existsSync(readmeMdPath)) {
    docPoints = 0;
    report.checks.push({ name: 'Documentation depth', passed: false, message: 'Missing README.md' });
  } else {
    const content = fs.readFileSync(readmeMdPath, 'utf8');
    const sections = ['## Overview', '## Use Cases', '## Inputs', '## Outputs', '## Examples', '## Limitations', '## Troubleshooting'];
    const missing = sections.filter((sec) => !content.includes(sec));

    if (missing.length > 0) {
      docPoints = Math.max(0, 25 - (missing.length * 3));
      report.checks.push({ name: 'Documentation depth', passed: false, message: `Missing sections: ${missing.join(', ')}` });
    } else {
      report.checks.push({ name: 'Documentation depth', passed: true, message: 'All standard documentation sections exist' });
    }
  }

  report.score = yamlPoints + promptsPoints + testPoints + docPoints;
  return report;
}
