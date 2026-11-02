import { describe, it, expect } from 'vitest';
import { HealthQuerySchema, PaginationQuerySchema } from '../../packages/shared/src/schemas.js';

describe('Shared Zod Schemas Validation', () => {
  it('validates HealthQuerySchema defaults correctly', () => {
    const result = HealthQuerySchema.parse({});
    expect(result.checkDb).toBe('true');
  });

  it('validates HealthQuerySchema with explicit false', () => {
    const result = HealthQuerySchema.parse({ checkDb: 'false' });
    expect(result.checkDb).toBe('false');
  });

  it('validates and parses PaginationQuerySchema defaults', () => {
    const result = PaginationQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
  });

  it('coerces and caps PaginationQuerySchema inputs', () => {
    const result = PaginationQuerySchema.parse({ page: '3', limit: '50', search: '  project  ' });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(50);
    expect(result.search).toBe('project');
  });

  describe('Project Key Derivation & Validation', () => {
    it('generates valid uppercase keys from various project names', async () => {
      const { deriveProjectKey, validateProjectKey } = await import('../../apps/web/src/components/Modals.js');
      
      expect(deriveProjectKey('ProjectFlow')).toBe('PF');
      expect(deriveProjectKey('Project Flow')).toBe('PF');
      expect(deriveProjectKey('Core Platform')).toBe('CP');
      expect(deriveProjectKey('Project')).toBe('PROJ');
      expect(deriveProjectKey('Alpha')).toBe('ALPH');
      expect(deriveProjectKey('AI')).toBe('AI');
      expect(deriveProjectKey('Mobile App Development')).toBe('MAD');

      // Check all outputs are strictly valid according to /^[A-Z0-9]{2,10}$/
      const names = ['ProjectFlow', 'Project Flow', 'Core Platform', 'Project', 'Alpha', 'AI', 'Mobile App Development'];
      for (const name of names) {
        const key = deriveProjectKey(name);
        expect(key).toMatch(/^[A-Z0-9]{2,10}$/);
        const val = validateProjectKey(key);
        expect(val.isValid).toBe(true);
        expect(val.error).toBeNull();
      }
    });

    it('rejects keys that violate /^[A-Z0-9]{2,10}$/', async () => {
      const { validateProjectKey } = await import('../../apps/web/src/components/Modals.js');

      expect(validateProjectKey('').isValid).toBe(false);
      expect(validateProjectKey('P').isValid).toBe(false); // < 2 chars
      expect(validateProjectKey('p').isValid).toBe(false);
      expect(validateProjectKey('pj-1').isValid).toBe(false); // special char '-'
      expect(validateProjectKey('TOOLONGPROJECTKEY').isValid).toBe(false); // > 10 chars
      expect(validateProjectKey('PF').isValid).toBe(true);
      expect(validateProjectKey('PROJ123').isValid).toBe(true);
    });
  });
});
