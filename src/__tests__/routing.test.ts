import { describe, it, expect } from 'vitest';
import { isValidSlug } from '../lib/validate-slug';

// ============================================================
// isValidSlug — slug validation for provisioned sites
// ============================================================

describe('isValidSlug', () => {
  it('returns true for known provisioned slug: marias-kitchen', () => {
    expect(isValidSlug('marias-kitchen')).toBe(true);
  });

  it('returns true for known provisioned slug: bright-smile', () => {
    expect(isValidSlug('bright-smile')).toBe(true);
  });

  it('returns true for known provisioned slug: marias-kitchen-austin', () => {
    expect(isValidSlug('marias-kitchen-austin')).toBe(true);
  });

  it('returns false for unknown business slug', () => {
    expect(isValidSlug('unknown-business')).toBe(false);
  });

  it('returns false for reserved slug: menu', () => {
    expect(isValidSlug('menu')).toBe(false);
  });

  it('returns false for string undefined', () => {
    expect(isValidSlug('undefined')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isValidSlug('')).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isValidSlug(undefined)).toBe(false);
  });

  it('returns false for string null', () => {
    expect(isValidSlug('null')).toBe(false);
  });

  it('returns false for reserved slug: api', () => {
    expect(isValidSlug('api')).toBe(false);
  });
});
