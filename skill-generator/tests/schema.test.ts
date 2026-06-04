import { validateSkillYaml, validateTestsYaml, validatePromptsMd } from '../src/validation/schema.js';

describe('Validation Schemas', () => {
  describe('validateSkillYaml', () => {
    it('should validate correctly formatted metadata', () => {
      const validYaml = `
name: nodejs-api-reviewer
description: A tool to review Node.js API files for quality and security.
version: 1.0.0
category: code-quality
tags:
  - nodejs
  - api
  - review
owner: amrit-community
tools:
  - read-file
mcp:
  - github
`;
      expect(() => validateSkillYaml(validYaml)).not.toThrow();
    });

    it('should reject invalid version or missing fields', () => {
      const invalidYaml = `
name: nodejs-api-reviewer
description: short
version: 1.0
category: code-quality
tags: []
owner: amrit-community
tools: []
mcp: []
`;
      expect(() => validateSkillYaml(invalidYaml)).toThrow();
    });
  });

  describe('validateTestsYaml', () => {
    it('should validate a list of 5 or more test cases', () => {
      const validTests = `
tests:
  - name: test 1
    input: test
    expected: output
  - name: test 2
    input: test
    expected: output
  - name: test 3
    input: test
    expected: output
  - name: test 4
    input: test
    expected: output
  - name: test 5
    input: test
    expected: output
`;
      expect(() => validateTestsYaml(validTests)).not.toThrow();
    });

    it('should reject a test suite with fewer than 5 tests', () => {
      const invalidTests = `
tests:
  - name: test 1
    input: test
    expected: output
`;
      expect(() => validateTestsYaml(invalidTests)).toThrow();
    });
  });

  describe('validatePromptsMd', () => {
    it('should pass if all required markdown headers are present', () => {
      const validMd = `
# System Prompt
Instructions here

# User Instructions
User guidelines

# Inputs
Details of inputs

# Outputs
Details of outputs

# Examples
Examples go here

# Constraints
Limitations here
`;
      expect(() => validatePromptsMd(validMd)).not.toThrow();
    });

    it('should throw if any headers are missing', () => {
      const invalidMd = `
# System Prompt
Instructions here

# User Instructions
User guidelines
`;
      expect(() => validatePromptsMd(invalidMd)).toThrow();
    });
  });
});
