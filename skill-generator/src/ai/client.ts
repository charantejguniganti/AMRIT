import { Anthropic } from '@anthropic-ai/sdk';
import { logger } from '../utils/logger.js';

export interface GenerationPayload {
  name: string;
  friendlyName: string;
  description: string;
  version: string;
  category: string;
  tags: string[];
  owner: string;
  tools: string[];
  mcp: string[];
  systemPrompt: string;
  userInstructions: string;
  inputs: string;
  outputs: string;
  examples: string;
  constraints: string;
  testCases: Array<{ name: string; input: any; expected: any }>;
  overview: string;
  useCases: string;
  inputsDesc: string;
  outputsDesc: string;
  examplesDesc: string;
  limitations: string;
  troubleshooting: string;
}

export class AIClient {
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY environment variable is not defined. Please set it to proceed with AI generation.'
      );
    }
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Generates a skill from natural language description.
   */
  public async generateSkill(
    description: string,
    model = 'claude-3-5-sonnet-latest'
  ): Promise<GenerationPayload> {
    logger.info(`Sending generation request to Anthropic (${model})...`);

    const systemPrompt = `You are a Principal Software Engineer and core maintainer of the AMRIT Agentic AI Framework.
Your task is to analyze a natural language skill description and generate a complete, high-quality, production-grade skill directory representation.

You must output a single, well-formed JSON object. Do NOT include any markdown markup around the JSON unless it is a code block containing the JSON, but ideally output ONLY the JSON string.

The JSON object must have exactly these keys:
- "name": (string) lowercase alphanumeric and hyphens only.
- "friendlyName": (string) A clean, capitalized title (e.g. "Node.js API Reviewer").
- "description": (string) Brief overview of what the skill does (at least 15 words).
- "version": (string) "1.0.0".
- "category": (string) A relevant categorisation.
- "tags": (array of strings) Minimum 3 relevant tags.
- "owner": (string) "amrit-community".
- "tools": (array of strings) List of local/virtual tool names the skill requires (e.g. "read-file", "run-linter").
- "mcp": (array of strings) List of Model Context Protocol (MCP) servers the skill needs (e.g. "github", "filesystem", "docker").
- "systemPrompt": (string) The full, robust system prompt instructing the agent on its role, capabilities, and system rules.
- "userInstructions": (string) General instructions on how the user interacts with this skill.
- "inputs": (string) Detailed description/schema of expected input parameters.
- "outputs": (string) Detailed description/schema of output formats.
- "examples": (string) One or more clear examples of input-output flows.
- "constraints": (string) Operational constraints, security limits, and error handling bounds.
- "testCases": An array of at least 5 objects. Each object must have:
    * "name": (string) Name of the test case. Cover happy paths, boundary limits, empty inputs, and invalid/adversarial inputs.
    * "input": (any) The mock input parameter value(s).
    * "expected": (any) The expected return value or snippet.
- "overview": (string) Standard readme introduction.
- "useCases": (string) Typical use cases for the skill.
- "inputsDesc": (string) Documentation list of inputs.
- "outputsDesc": (string) Documentation list of outputs.
- "examplesDesc": (string) Examples section in markdown for the README.
- "limitations": (string) List of known limits/restrictions.
- "troubleshooting": (string) Common failure modes and steps to resolve them.

You MUST infer the required tools, MCP integrations, and test strategies dynamically based on the input description. Ensure all generated content is highly professional, thorough, and devoid of placeholders.
`;

    const userPrompt = `Generate a skill for: "${description}"`;

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      
      // Attempt to extract JSON from markdown code block if present
      let jsonStr = text.trim();
      const codeBlockMatch = jsonStr.match(/```json([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1].trim();
      } else {
        // Strip out leading/trailing non-json chars if any exist
        const start = jsonStr.indexOf('{');
        const end = jsonStr.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
          jsonStr = jsonStr.substring(start, end + 1);
        }
      }

      const payload = JSON.parse(jsonStr) as GenerationPayload;
      return payload;
    } catch (error: any) {
      logger.error(`Anthropic API or JSON Parsing Error: ${error.message}`);
      throw error;
    }
  }
}
