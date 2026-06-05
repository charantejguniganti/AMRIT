import { Anthropic } from '@anthropic-ai/sdk';
import yaml from 'js-yaml';
import { logger } from '../utils/logger.js';

// ─── Payload Types ─────────────────────────────────────────────────────────

/**
 * The small metadata-only JSON returned by generateMetadata() — Step 1.
 * Deliberately minimal: only scalar/array fields, no prose, no markdown.
 */
export interface SkillMetadata {
  name: string;
  friendlyName: string;
  description: string;
  version: string;
  category: string;
  tags: string[];
  owner: string;
  tools: string[];
  mcp: string[];
}

/**
 * Full assembled payload from all 5 generation steps.
 * Plain-text fields are raw strings — never JSON-encoded prose.
 */
export interface GenerationPayload {
  // Step 1 — metadata JSON
  name: string;
  friendlyName: string;
  description: string;
  version: string;
  category: string;
  tags: string[];
  owner: string;
  tools: string[];
  mcp: string[];
  // Step 2 — prompts.md sections (plain text)
  systemPrompt: string;
  userInstructions: string;
  inputs: string;
  outputs: string;
  examples: string;
  constraints: string;
  // Step 3 — tests.yaml (parsed from YAML, never from JSON)
  testCases: Array<{ name: string; input: any; expected: any }>;
  // Step 4 — README.md sections (plain text)
  overview: string;
  useCases: string;
  inputsDesc: string;
  outputsDesc: string;
  examplesDesc: string;
  limitations: string;
  troubleshooting: string;
}

// ─── Provider Abstraction ──────────────────────────────────────────────────

export interface AIProvider {
  generate(systemPrompt: string, userPrompt: string, model?: string): Promise<string>;
}

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY environment variable is not defined. Please set it to proceed with Anthropic generation.'
      );
    }
    this.client = new Anthropic({ apiKey });
  }

  public async generate(
    systemPrompt: string,
    userPrompt: string,
    model = 'claude-3-5-sonnet-latest'
  ): Promise<string> {
    logger.info(`Sending generation request to Anthropic (${model})...`);
    const response = await this.client.messages.create({
      model,
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    return response.content[0].type === 'text' ? response.content[0].text : '';
  }
}

export class OllamaProvider implements AIProvider {
  public async generate(
    systemPrompt: string,
    userPrompt: string,
    model = 'qwen2.5-coder:7b'
  ): Promise<string> {
    logger.info(`Sending generation request to local Ollama (${model})...`);

    const fullPrompt = `System instructions:\n${systemPrompt}\n\nUser request:\n${userPrompt}`;

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 2048,
          num_ctx: 8192,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    const raw: string = data.response || '';

    // Always log raw response for debugging
    logger.info(`[Ollama] Raw response length: ${raw.length} chars`);
    logger.info(`[Ollama] Raw preview (first 500 chars):\n${raw.slice(0, 500)}`);

    return raw;
  }
}

// ─── Auto-detection ────────────────────────────────────────────────────────

export async function isOllamaAvailable(model = 'qwen2.5-coder:7b'): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(2000),
    });
    if (!response.ok) return false;
    const data = (await response.json()) as any;
    const models: any[] = data?.models || [];
    return models.some((m) => m.name === model || m.model === model);
  } catch {
    return false;
  }
}

// ─── JSON repair utilities (used only for Step 1: metadata) ───────────────

/**
 * Extracts the first complete JSON object {…} from a raw model response.
 * Handles:
 *  - Preamble text / prose before the JSON
 *  - Markdown code fences:  ```json … ```  or  ``` … ```
 *  - Trailing prose after the closing brace
 */
function extractJsonBlock(raw: string): string {
  // 1. Try markdown fence first
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    const candidate = fenceMatch[1].trim();
    if (candidate.startsWith('{')) return candidate;
  }

  // 2. Outermost { … }
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');

  if (start === -1 || end === -1 || end < start) {
    throw new Error(
      `No JSON object found in model response.\n` +
      `First 300 chars of raw response:\n${raw.slice(0, 300)}`
    );
  }

  return raw.slice(start, end + 1);
}

/**
 * Repairs common JSON malformations produced by small local LLMs.
 */
function sanitizeJson(raw: string): string {
  let s = raw;
  s = s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
  s = s.replace(/\/\/[^\n]*/g, '');
  s = s.replace(/([{,]\s*)'([^']+)'(\s*:)/g, '$1"$2"$3');
  s = s.replace(/(:\s*)'([^']*)'/g, '$1"$2"');
  s = s.replace(/,\s*([}\]])/g, '$1');
  s = s.replace(/\\([^"\\/bfnrtu\n])/g, '$1');
  s = s.replace(/"((?:[^"\\]|\\.)*)"/g, (_match, inner) => {
    const fixed = inner.replace(/\r?\n/g, '\\n');
    return `"${fixed}"`;
  });
  return s;
}

/**
 * Attempts to recover a truncated JSON string by closing open brackets/strings.
 */
function recoverTruncatedJson(raw: string): string {
  let s = raw.trimEnd();
  if (s.endsWith('}')) return s;

  const quoteCount = (s.match(/(?<!\\)"/g) || []).length;
  if (quoteCount % 2 !== 0) s += '"';

  const stack: string[] = [];
  let inString = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"' && (i === 0 || s[i - 1] !== '\\')) inString = !inString;
    if (!inString) {
      if (ch === '{') stack.push('}');
      else if (ch === '[') stack.push(']');
      else if (ch === '}' || ch === ']') stack.pop();
    }
  }
  while (stack.length > 0) s += stack.pop();
  return s;
}

/**
 * Full JSON parse pipeline: extract → sanitize → recover → parse.
 */
function robustJsonParse<T>(raw: string, context: string): T {
  let jsonStr: string;

  try {
    jsonStr = extractJsonBlock(raw);
  } catch (e: any) {
    logger.error(`[${context}] JSON extraction failed: ${e.message}`);
    throw e;
  }

  jsonStr = sanitizeJson(jsonStr);
  jsonStr = recoverTruncatedJson(jsonStr);

  logger.info(`[${context}] Repaired JSON (first 400 chars): ${jsonStr.slice(0, 400)}`);

  try {
    return JSON.parse(jsonStr) as T;
  } catch (e: any) {
    logger.error(`[${context}] JSON.parse() failed after repair: ${e.message}`);
    logger.error(`[${context}] Full repaired string:\n${jsonStr}`);
    throw new Error(`[${context}] JSON parsing failed: ${e.message}`);
  }
}

// ─── Plain-text YAML utilities (used for Step 3: tests.yaml) ──────────────

/**
 * Strips markdown code fences (```yaml or ```) from a raw model response.
 */
function stripFences(raw: string): string {
  // Remove opening fence line: ```yaml or ```
  let s = raw.trim();
  s = s.replace(/^```(?:yaml|yml)?\s*/i, '');
  // Remove closing fence
  s = s.replace(/\s*```\s*$/, '');
  return s.trim();
}

// ─── AIClient ─────────────────────────────────────────────────────────────

export class AIClient {
  private provider!: AIProvider;

  private constructor() {}

  /**
   * Async factory — selects provider:
   *  1. Honour explicit --provider flag.
   *  2. Auto-detect running Ollama.
   *  3. Fall back to Anthropic.
   */
  public static async create(
    providerType?: 'anthropic' | 'ollama',
    providerModel?: string
  ): Promise<AIClient> {
    const client = new AIClient();
    let selected = providerType;

    if (!selected) {
      const targetModel = providerModel || 'qwen2.5-coder:7b';
      const ollamaActive = await isOllamaAvailable(targetModel);
      if (ollamaActive) {
        logger.info(`Detected local Ollama with ${targetModel}. Using Ollama provider.`);
        selected = 'ollama';
      } else {
        logger.info('Ollama not detected. Falling back to Anthropic provider.');
        selected = 'anthropic';
      }
    }

    client.provider = selected === 'ollama'
      ? new OllamaProvider()
      : new AnthropicProvider();

    return client;
  }

  // ─── Step 1: Metadata JSON ───────────────────────────────────────────────

  /**
   * Generates ONLY the small metadata JSON for the skill.
   * Kept deliberately minimal so local LLMs reliably produce valid JSON.
   */
  public async generateMetadata(description: string, model?: string): Promise<SkillMetadata> {
    const systemPrompt = `You are a software architect. Output ONLY a raw JSON object — no markdown, no code fences, no explanation.

The JSON must have exactly these keys:
- "name": lowercase alphanumeric and hyphens only (e.g. "nodejs-reviewer")
- "friendlyName": clean capitalized title (e.g. "Node.js API Reviewer")
- "description": one sentence, minimum 15 words
- "version": "1.0.0"
- "category": single category string
- "tags": JSON array of 3-5 tag strings
- "owner": "amrit-community"
- "tools": JSON array of local tool names (e.g. ["read-file", "run-linter"])
- "mcp": JSON array of MCP server names (e.g. ["github", "filesystem"])

Output ONLY the JSON object. No other text before or after.`;

    const userPrompt = `Generate skill metadata for: "${description}"`;

    logger.info('Step 1/5 — Generating skill metadata (JSON)...');
    const raw = await this.provider.generate(systemPrompt, userPrompt, model);
    return robustJsonParse<SkillMetadata>(raw, 'generateMetadata');
  }

  // ─── Step 2: prompts.md (plain text) ────────────────────────────────────

  /**
   * Generates prompts.md content as plain text sections.
   * No JSON involved — model returns markdown headings and prose.
   */
  public async generatePromptsMd(
    description: string,
    metadata: SkillMetadata,
    model?: string
  ): Promise<{
    systemPrompt: string;
    userInstructions: string;
    inputs: string;
    outputs: string;
    examples: string;
    constraints: string;
  }> {
    const systemPrompt = `You are a Principal Prompt Engineer. Write detailed, production-grade prompt content for an AI skill.

Return your response as exactly 6 sections using these exact headers (### prefix required):

### SYSTEM_PROMPT
Write the full system prompt text the agent receives.

### USER_INSTRUCTIONS
Write instructions for the human user on how to interact with the skill.

### INPUTS
Describe the input parameters and their schema.

### OUTPUTS
Describe the output formats and what the skill returns.

### EXAMPLES
Provide one or more example input-output flows.

### CONSTRAINTS
List operational constraints, security limits, and error handling rules.

Write plain text / markdown prose. Do NOT use JSON for any section.`;

    const userPrompt = `Skill: "${metadata.friendlyName}"
Description: ${metadata.description}
Category: ${metadata.category}
Tools: ${metadata.tools.join(', ')}
MCP: ${metadata.mcp.join(', ')}

Write all 6 prompts.md sections for this skill.`;

    logger.info('Step 2/5 — Generating prompts.md (plain text)...');
    const raw = await this.provider.generate(systemPrompt, userPrompt, model);

    const sections = this.parseTextSections(raw, [
      'SYSTEM_PROMPT', 'USER_INSTRUCTIONS', 'INPUTS', 'OUTPUTS', 'EXAMPLES', 'CONSTRAINTS',
    ]);

    return {
      systemPrompt:     sections['systemPrompt']     || '',
      userInstructions: sections['userInstructions'] || '',
      inputs:           sections['inputs']           || '',
      outputs:          sections['outputs']          || '',
      examples:         sections['examples']         || '',
      constraints:      sections['constraints']      || '',
    };
  }

  // ─── Step 3: tests.yaml (plain YAML → js-yaml parse) ───────────────────

  /**
   * Generates tests.yaml content as plain YAML text, then parses with js-yaml.
   *
   * WHY YAML and not JSON:
   *   Test inputs often contain multi-line code snippets, arrow functions, and
   *   special characters. YAML block scalars handle these natively; JSON cannot
   *   safely encode them without complex escaping that small LLMs get wrong.
   */
  public async generateTestsYaml(
    description: string,
    metadata: SkillMetadata,
    model?: string
  ): Promise<Array<{ name: string; input: any; expected: any }>> {
    const systemPrompt = `You are a QA engineer. Generate a tests.yaml file for an AMRIT AI skill.

Output ONLY valid YAML — no markdown code fences, no explanation text.

Use this exact structure:
tests:
  - name: "Test case name"
    input:
      key: value
    expected: "Expected output or behaviour"
  - name: "Another test"
    input:
      key: another value
    expected: "Another expected result"

Rules:
- Generate at least 5 test cases.
- For multi-line string values use YAML block scalars (| or >) instead of inline strings.
- The output must be parseable as YAML.
- Start your output with "tests:" on the first line. No preamble.`;

    const userPrompt = `Generate tests.yaml for the skill: "${metadata.friendlyName}"
Description: ${metadata.description}
Tools: ${metadata.tools.join(', ')}`;

    logger.info('Step 3/5 — Generating tests.yaml (plain YAML)...');
    const raw = await this.provider.generate(systemPrompt, userPrompt, model);

    // Strip any markdown fences the model added despite instructions
    let yamlStr = stripFences(raw);

    // Ensure it starts at "tests:" — skip any accidental preamble
    const testsIdx = yamlStr.indexOf('tests:');
    if (testsIdx > 0) {
      yamlStr = yamlStr.slice(testsIdx);
    } else if (testsIdx === -1) {
      // Model didn't include the key — wrap it
      yamlStr = `tests:\n${yamlStr}`;
    }

    logger.info(`[generateTestsYaml] YAML preview (first 400 chars):\n${yamlStr.slice(0, 400)}`);

    try {
      const parsed = yaml.load(yamlStr) as any;
      const tests = parsed?.tests;
      if (Array.isArray(tests) && tests.length > 0) {
        logger.info(`[generateTestsYaml] ✓ Parsed ${tests.length} test cases from YAML`);
        return tests as Array<{ name: string; input: any; expected: any }>;
      }
      logger.error('[generateTestsYaml] YAML parsed but "tests" array is empty or missing. Using fallback.');
    } catch (e: any) {
      logger.error(`[generateTestsYaml] YAML parse failed: ${e.message}`);
      logger.error(`[generateTestsYaml] Full YAML:\n${yamlStr}`);
    }

    // Safe fallback — prevents pipeline crash; validator will warn on low count
    return [
      { name: 'smoke-test', input: { description }, expected: 'Skill executes without error' },
      { name: 'empty-input', input: {}, expected: 'Returns validation error for missing input' },
    ];
  }

  // ─── Step 4: README.md (plain text) ─────────────────────────────────────

  /**
   * Generates README.md content as plain text sections.
   */
  public async generateReadmeMd(
    description: string,
    metadata: SkillMetadata,
    model?: string
  ): Promise<{
    overview: string;
    useCases: string;
    inputsDesc: string;
    outputsDesc: string;
    examplesDesc: string;
    limitations: string;
    troubleshooting: string;
  }> {
    const systemPrompt = `You are a technical documentation writer. Write high-quality README documentation for an AI skill.

Return your response as exactly 7 sections using these exact headers (### prefix required):

### OVERVIEW
Write a brief introduction paragraph.

### USE_CASES
List typical use cases with bullet points.

### INPUTS_DESC
Markdown list of inputs with descriptions.

### OUTPUTS_DESC
Markdown list of outputs with descriptions.

### EXAMPLES_DESC
One or more markdown examples with code blocks where helpful.

### LIMITATIONS
Bullet list of known limitations or restrictions.

### TROUBLESHOOTING
Common failure modes and how to resolve them.

Write plain markdown. Do NOT wrap any section in JSON or code fences.`;

    const userPrompt = `Skill: "${metadata.friendlyName}"
Description: ${metadata.description}
Category: ${metadata.category}
Tags: ${metadata.tags.join(', ')}

Write all 7 README.md sections for this skill.`;

    logger.info('Step 4/5 — Generating README.md (plain text)...');
    const raw = await this.provider.generate(systemPrompt, userPrompt, model);

    const sections = this.parseTextSections(raw, [
      'OVERVIEW', 'USE_CASES', 'INPUTS_DESC', 'OUTPUTS_DESC', 'EXAMPLES_DESC', 'LIMITATIONS', 'TROUBLESHOOTING',
    ]);

    return {
      overview:       sections['overview']       || '',
      useCases:       sections['useCases']       || '',
      inputsDesc:     sections['inputsDesc']     || '',
      outputsDesc:    sections['outputsDesc']    || '',
      examplesDesc:   sections['examplesDesc']   || '',
      limitations:    sections['limitations']    || '',
      troubleshooting:sections['troubleshooting']|| '',
    };
  }

  // ─── Step 5: skill.yaml (assembled from metadata — no AI call) ───────────

  /**
   * skill.yaml is fully constructed from the SkillMetadata from Step 1.
   * No additional AI call needed — the metadata already contains every
   * scalar field the template requires.
   */
  public buildSkillYamlFields(metadata: SkillMetadata): SkillMetadata {
    logger.info('Step 5/5 — skill.yaml fields assembled from Step 1 metadata (no AI call).');
    return metadata;
  }

  // ─── Orchestrator ────────────────────────────────────────────────────────

  /**
   * Runs the full 5-step generation pipeline and returns a GenerationPayload.
   *
   * Pipeline:
   *   Step 1 — Metadata JSON      → SkillMetadata (JSON parsed, small & reliable)
   *   Step 2 — prompts.md         → plain text sections (no JSON risk)
   *   Step 3 — tests.yaml         → plain YAML parsed with js-yaml (no JSON risk)
   *   Step 4 — README.md          → plain text sections (no JSON risk)
   *   Step 5 — skill.yaml fields  → assembled from Step 1 metadata (no AI call)
   *
   * Only Step 1 uses JSON parsing. Steps 2–4 treat model output as plain text.
   * This eliminates all backtick / markdown / multiline-code JSON failures.
   */
  public async generateSkill(description: string, model?: string): Promise<GenerationPayload> {
    logger.info(`\n${'─'.repeat(60)}`);
    logger.info(`Starting 5-step generation pipeline`);
    logger.info(`Description: "${description}"`);
    logger.info(`${'─'.repeat(60)}`);

    // Step 1 — Metadata JSON
    const metadata = await this.generateMetadata(description, model);
    logger.info(`  ✓ Step 1 complete — name="${metadata.name}", category="${metadata.category}"`);

    // Step 2 — prompts.md (plain text)
    const prompts = await this.generatePromptsMd(description, metadata, model);
    logger.info(`  ✓ Step 2 complete — prompts.md sections generated`);

    // Step 3 — tests.yaml (plain YAML)
    const testCases = await this.generateTestsYaml(description, metadata, model);
    logger.info(`  ✓ Step 3 complete — ${testCases.length} test case(s) parsed from YAML`);

    // Step 4 — README.md (plain text)
    const readme = await this.generateReadmeMd(description, metadata, model);
    logger.info(`  ✓ Step 4 complete — README.md sections generated`);

    // Step 5 — skill.yaml (no AI call)
    this.buildSkillYamlFields(metadata);
    logger.info(`  ✓ Step 5 complete — skill.yaml fields ready from metadata`);

    logger.info(`${'─'.repeat(60)}`);
    logger.info(`Pipeline complete for "${metadata.friendlyName}"`);
    logger.info(`${'─'.repeat(60)}\n`);

    return {
      // Metadata
      name:             metadata.name,
      friendlyName:     metadata.friendlyName,
      description:      metadata.description,
      version:          metadata.version,
      category:         metadata.category,
      tags:             metadata.tags,
      owner:            metadata.owner,
      tools:            metadata.tools,
      mcp:              metadata.mcp,
      // Prompts
      systemPrompt:     prompts.systemPrompt,
      userInstructions: prompts.userInstructions,
      inputs:           prompts.inputs,
      outputs:          prompts.outputs,
      examples:         prompts.examples,
      constraints:      prompts.constraints,
      // Tests
      testCases,
      // README
      overview:         readme.overview,
      useCases:         readme.useCases,
      inputsDesc:       readme.inputsDesc,
      outputsDesc:      readme.outputsDesc,
      examplesDesc:     readme.examplesDesc,
      limitations:      readme.limitations,
      troubleshooting:  readme.troubleshooting,
    };
  }

  // ─── Text section parser ─────────────────────────────────────────────────

  /**
   * Parses a plain-text AI response that uses ### SECTION_NAME headers
   * into a camelCase key-value map.  Falls back to empty string for missing sections.
   */
  private parseTextSections(raw: string, sectionNames: string[]): Record<string, string> {
    const result: Record<string, string> = {};
    const headerPattern = new RegExp(`###\\s+(${sectionNames.join('|')})`, 'gi');
    const segments: Array<{ key: string; start: number; headerLen: number }> = [];

    let match: RegExpExecArray | null;
    while ((match = headerPattern.exec(raw)) !== null) {
      segments.push({
        key: match[1].toUpperCase(),
        start: match.index + match[0].length,
        headerLen: match[0].length,
      });
    }

    for (let i = 0; i < segments.length; i++) {
      const { key, start } = segments[i];
      const end = i + 1 < segments.length
        ? segments[i + 1].start - segments[i + 1].headerLen
        : raw.length;
      result[this.toCamelKey(key)] = raw.slice(start, end).trim();
    }

    // Guarantee every expected key exists
    for (const name of sectionNames) {
      const camel = this.toCamelKey(name);
      if (!result[camel]) {
        logger.info(`[parseTextSections] Section "${name}" not found — defaulting to empty string.`);
        result[camel] = '';
      }
    }

    return result;
  }

  /** Maps SECTION_NAME → camelCase GenerationPayload field name */
  private toCamelKey(key: string): string {
    const map: Record<string, string> = {
      SYSTEM_PROMPT:     'systemPrompt',
      USER_INSTRUCTIONS: 'userInstructions',
      INPUTS:            'inputs',
      OUTPUTS:           'outputs',
      EXAMPLES:          'examples',
      CONSTRAINTS:       'constraints',
      OVERVIEW:          'overview',
      USE_CASES:         'useCases',
      INPUTS_DESC:       'inputsDesc',
      OUTPUTS_DESC:      'outputsDesc',
      EXAMPLES_DESC:     'examplesDesc',
      LIMITATIONS:       'limitations',
      TROUBLESHOOTING:   'troubleshooting',
    };
    return map[key] ?? key.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
  }
}
