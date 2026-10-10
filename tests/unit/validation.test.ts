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
});
