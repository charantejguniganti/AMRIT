import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TemplateManager {
  private templatesDir: string;

  constructor() {
    // Try to resolve templates folder in the root of the project
    // During dev (src/templates/manager.ts) templates directory is ../../templates/
    // During build (dist/src/templates/manager.js) templates directory is ../../../templates/
    const devPath = path.resolve(__dirname, '../../templates');
    const distPath = path.resolve(__dirname, '../../../templates');
    
    if (fs.existsSync(devPath)) {
      this.templatesDir = devPath;
    } else if (fs.existsSync(distPath)) {
      this.templatesDir = distPath;
    } else {
      // Fallback relative to current working directory or absolute
      this.templatesDir = path.resolve(process.cwd(), 'templates');
    }
  }

  /**
   * Load and render a template by replacing placeholders.
   */
  public render(templateName: string, replacements: Record<string, string>): string {
    const templatePath = path.join(this.templatesDir, templateName);
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templatePath}`);
    }

    let content = fs.readFileSync(templatePath, 'utf8');
    
    for (const [key, value] of Object.entries(replacements)) {
      // Use replaceAll or global regex replacement for all occurrences
      const placeholder = `{{${key}}}`;
      content = content.split(placeholder).join(value);
    }
    
    return content;
  }
}
