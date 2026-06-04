import path from 'path';

/**
 * Validates a skill name to ensure it is alphanumeric and hyphens only, avoiding any path manipulation.
 */
export function validateSkillName(name: string): boolean {
  return /^[a-z0-9-]+$/.test(name);
}

/**
 * Safely resolves a target directory path relative to a base directory,
 * throwing an error if a path traversal attempt is detected.
 */
export function safeResolvePath(baseDir: string, relativePath: string): string {
  const resolvedPath = path.resolve(baseDir, relativePath);
  
  // Ensure the resolved path resides within the baseDir directory
  const relative = path.relative(baseDir, resolvedPath);
  
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Security Violation: Path traversal detected outside base directory: ${relativePath}`);
  }
  
  return resolvedPath;
}
