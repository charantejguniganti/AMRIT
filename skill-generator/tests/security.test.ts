import { validateSkillName, safeResolvePath } from '../src/utils/security.js';
import path from 'path';

describe('Security Utils', () => {
  describe('validateSkillName', () => {
    it('should return true for valid lowercase alphanumeric and hyphen names', () => {
      expect(validateSkillName('nodejs-api-reviewer')).toBe(true);
      expect(validateSkillName('docker-security-auditor')).toBe(true);
      expect(validateSkillName('skill123')).toBe(true);
    });

    it('should return false for invalid characters or uppercase', () => {
      expect(validateSkillName('Nodejs-Api-Reviewer')).toBe(false);
      expect(validateSkillName('nodejs_api_reviewer')).toBe(false);
      expect(validateSkillName('nodejs/api')).toBe(false);
      expect(validateSkillName('nodejs..api')).toBe(false);
      expect(validateSkillName('nodejs api')).toBe(false);
    });
  });

  describe('safeResolvePath', () => {
    const base = path.resolve(process.cwd());

    it('should resolve a safe relative path inside the base directory', () => {
      const resolved = safeResolvePath(base, './skills/test-skill');
      expect(resolved).toContain(path.join('skills', 'test-skill'));
    });

    it('should throw an error for paths trying to escape the base directory', () => {
      expect(() => {
        safeResolvePath(base, '../../etc/passwd');
      }).toThrow('Security Violation: Path traversal detected outside base directory');
    });
  });
});
