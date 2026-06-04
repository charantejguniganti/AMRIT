import { z } from 'zod';
import yaml from 'js-yaml';

// Schema for skill.yaml
export const SkillMetadataSchema = z.object({
  name: z.string().regex(/^[a-z0-9-]+$/, {
    message: "Skill name must be lowercase alphanumeric characters and hyphens only",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters long",
  }),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, {
    message: "Version must be in valid SemVer format (e.g. 1.0.0)",
  }),
  category: z.string().min(3, {
    message: "Category must be at least 3 characters",
  }),
  tags: z.array(z.string()).min(1, {
    message: "At least one tag is required",
  }),
  owner: z.string().min(3, {
    message: "Owner name/org is required",
  }),
  tools: z.array(z.string()),
  mcp: z.array(z.string()),
});

// Schema for a single test case inside tests.yaml
export const TestCaseSchema = z.object({
  name: z.string().min(3),
  input: z.any(),
  expected: z.any(),
});

// Schema for tests.yaml
export const TestSuiteSchema = z.object({
  tests: z.array(TestCaseSchema).min(5, {
    message: "A skill must have at least 5 test cases covering happy path, edge cases, and adversarial/invalid inputs",
  }),
});

export type SkillMetadata = z.infer<typeof SkillMetadataSchema>;
export type TestSuite = z.infer<typeof TestSuiteSchema>;

/**
 * Validates skill.yaml content
 */
export function validateSkillYaml(content: string): SkillMetadata {
  const parsed = yaml.load(content);
  return SkillMetadataSchema.parse(parsed);
}

/**
 * Validates tests.yaml content
 */
export function validateTestsYaml(content: string): TestSuite {
  const parsed = yaml.load(content);
  return TestSuiteSchema.parse(parsed);
}

/**
 * Validates prompts.md structure ensuring all required sections are present
 */
export function validatePromptsMd(content: string): void {
  const requiredSections = [
    '# System Prompt',
    '# User Instructions',
    '# Inputs',
    '# Outputs',
    '# Examples',
    '# Constraints',
  ];

  for (const section of requiredSections) {
    if (!content.includes(section)) {
      throw new Error(`Prompts file is missing the required section: "${section}"`);
    }
  }
}
