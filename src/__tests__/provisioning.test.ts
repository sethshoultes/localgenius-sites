import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BusinessSchema, ProvisioningError, provisionSite } from '../lib/provisioning';

// ============================================================
// BusinessSchema validation
// ============================================================

describe('BusinessSchema', () => {
  const validBusiness = {
    slug: 'joes-pizza',
    name: "Joe's Pizza",
    type: 'restaurant',
    city: 'Springfield',
  };

  it('accepts valid input with required fields only', () => {
    const result = BusinessSchema.safeParse(validBusiness);
    expect(result.success).toBe(true);
  });

  it('accepts valid input with all optional fields', () => {
    const result = BusinessSchema.safeParse({
      ...validBusiness,
      phone: '555-1234',
      email: 'joe@pizza.com',
      address: '123 Main St',
      description: 'Best pizza in town',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing slug', () => {
    const result = BusinessSchema.safeParse({
      name: "Joe's Pizza",
      type: 'restaurant',
      city: 'Springfield',
    });
    expect(result.success).toBe(false);
  });

  it('rejects slug with uppercase chars', () => {
    const result = BusinessSchema.safeParse({
      ...validBusiness,
      slug: 'Joes-Pizza',
    });
    expect(result.success).toBe(false);
  });

  it('rejects slug with spaces', () => {
    const result = BusinessSchema.safeParse({
      ...validBusiness,
      slug: 'joes pizza',
    });
    expect(result.success).toBe(false);
  });

  it('rejects slug with special characters', () => {
    const result = BusinessSchema.safeParse({
      ...validBusiness,
      slug: 'joe$_pizza!',
    });
    expect(result.success).toBe(false);
  });

  it('rejects slug shorter than 2 chars', () => {
    const result = BusinessSchema.safeParse({
      ...validBusiness,
      slug: 'a',
    });
    expect(result.success).toBe(false);
  });

  it('rejects slug longer than 63 chars', () => {
    const result = BusinessSchema.safeParse({
      ...validBusiness,
      slug: 'a'.repeat(64),
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing name', () => {
    const result = BusinessSchema.safeParse({
      slug: 'joes-pizza',
      type: 'restaurant',
      city: 'Springfield',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing type', () => {
    const result = BusinessSchema.safeParse({
      slug: 'joes-pizza',
      name: "Joe's Pizza",
      city: 'Springfield',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing city', () => {
    const result = BusinessSchema.safeParse({
      slug: 'joes-pizza',
      name: "Joe's Pizza",
      type: 'restaurant',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email format', () => {
    const result = BusinessSchema.safeParse({
      ...validBusiness,
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================
// ProvisioningError
// ============================================================

describe('ProvisioningError', () => {
  it('has correct name, step, message, and retryable flag', () => {
    const err = new ProvisioningError({
      step: 'database_created',
      message: 'D1 creation failed',
      retryable: true,
    });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('ProvisioningError');
    expect(err.step).toBe('database_created');
    expect(err.message).toBe('D1 creation failed');
    expect(err.retryable).toBe(true);
  });

  it('stores optional code', () => {
    const err = new ProvisioningError({
      step: 'provisioning',
      message: 'bad data',
      retryable: false,
      code: 'INVALID_INPUT',
    });
    expect(err.code).toBe('INVALID_INPUT');
  });

  it('sets retryable to false for non-retryable errors', () => {
    const err = new ProvisioningError({
      step: 'provisioning',
      message: 'validation error',
      retryable: false,
    });
    expect(err.retryable).toBe(false);
  });
});

// ============================================================
// provisionSite — with mocked fetch
// ============================================================

const mockEnv = {
  CLOUDFLARE_API_TOKEN: 'test-token',
  CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
  CLOUDFLARE_ZONE_ID: 'test-zone-id',
  LOCALGENIUS_DOMAIN: 'localgenius.site',
};

const validBusiness = {
  slug: 'joes-pizza',
  name: "Joe's Pizza",
  type: 'restaurant',
  city: 'Springfield',
};

// Helper: build a successful Cloudflare API response
function cfOk<T>(result: T) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ success: true, result, errors: [], messages: [] }),
  } as unknown as Response;
}

// Helper: build a failed Cloudflare API response
function cfFail(code: number, message: string) {
  return {
    ok: true, // CF returns 200 with success:false for most errors
    status: 200,
    json: async () => ({
      success: false,
      result: null,
      errors: [{ code, message }],
      messages: [],
    }),
  } as unknown as Response;
}

describe('provisionSite', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // Map call index to the step name for clarity
  // Call 0: D1 database creation
  // Call 1: R2 bucket creation
  // Call 2: Worker deployment (uses FormData, different URL pattern)
  // Call 3: DNS CNAME record
  // Call 4: DNS Workers route (subdomain enable)
  // Call 5: Seed database query

  function mockAllCfCalls() {
    const mockFetch = vi.fn<(...args: unknown[]) => Promise<Response>>();

    // Call 0: D1 database
    mockFetch.mockResolvedValueOnce(
      cfOk({ uuid: 'db-uuid-123', name: 'localgenius-joes-pizza', created_at: '2025-01-01' })
    );
    // Call 1: R2 bucket
    mockFetch.mockResolvedValueOnce(
      cfOk({ name: 'localgenius-joes-pizza', creation_date: '2025-01-01' })
    );
    // Call 2: Worker deploy
    mockFetch.mockResolvedValueOnce(
      cfOk({ id: 'worker-id-456', etag: 'etag-1', deployment_id: 'deploy-789' })
    );
    // Call 3: DNS CNAME record
    mockFetch.mockResolvedValueOnce(
      cfOk({ id: 'dns-rec-1', name: 'joes-pizza.localgenius.site', type: 'CNAME', content: 'localgenius-joes-pizza.workers.dev' })
    );
    // Call 4: Workers subdomain enable
    mockFetch.mockResolvedValueOnce(cfOk({ enabled: true }));
    // Call 5: Seed DB query
    mockFetch.mockResolvedValueOnce(
      cfOk([{ results: [], success: true, meta: { changes: 1, duration: 10 } }])
    );

    vi.stubGlobal('fetch', mockFetch);
    return mockFetch;
  }

  it('successfully provisions a site end-to-end', async () => {
    const mockFetch = mockAllCfCalls();

    const result = await provisionSite(validBusiness, mockEnv);

    expect(result.status).toBe('ready');
    expect(result.databaseId).toBe('db-uuid-123');
    expect(result.bucketName).toBe('localgenius-joes-pizza');
    expect(result.workerId).toBe('worker-id-456');
    expect(result.siteUrl).toBe('https://joes-pizza.localgenius.site');
    expect(result.adminUrl).toBe('https://joes-pizza.localgenius.site/_admin');
    expect(result.provisionedAt).toBeDefined();

    // 6 fetch calls total: D1, R2, Worker, DNS CNAME, DNS subdomain, Seed
    expect(mockFetch).toHaveBeenCalledTimes(6);
  });

  it('throws ProvisioningError with step=provisioning for invalid business data', async () => {
    try {
      await provisionSite({ slug: 'INVALID!', name: '', type: '', city: '' } as any, mockEnv);
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ProvisioningError);
      const pe = err as ProvisioningError;
      expect(pe.step).toBe('provisioning');
      expect(pe.retryable).toBe(false);
    }
  });

  it('throws with step=database_created when D1 creation fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(cfFail(5000, 'D1 internal error')));

    try {
      await provisionSite(validBusiness, mockEnv);
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ProvisioningError);
      const pe = err as ProvisioningError;
      expect(pe.step).toBe('database_created');
      expect(pe.retryable).toBe(true);
      expect(pe.message).toContain('D1 database creation failed');
    }
  });

  it('throws with step=bucket_created when R2 creation fails', async () => {
    const mockFetch = vi.fn<(...args: unknown[]) => Promise<Response>>();
    // D1 succeeds
    mockFetch.mockResolvedValueOnce(
      cfOk({ uuid: 'db-uuid-123', name: 'localgenius-joes-pizza', created_at: '2025-01-01' })
    );
    // R2 fails
    mockFetch.mockResolvedValueOnce(cfFail(6000, 'R2 bucket error'));
    vi.stubGlobal('fetch', mockFetch);

    try {
      await provisionSite(validBusiness, mockEnv);
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ProvisioningError);
      const pe = err as ProvisioningError;
      expect(pe.step).toBe('bucket_created');
      expect(pe.retryable).toBe(true);
      expect(pe.message).toContain('R2 bucket creation failed');
    }
  });

  it('throws with step=worker_deployed when Worker deploy fails', async () => {
    const mockFetch = vi.fn<(...args: unknown[]) => Promise<Response>>();
    // D1 succeeds
    mockFetch.mockResolvedValueOnce(
      cfOk({ uuid: 'db-uuid-123', name: 'localgenius-joes-pizza', created_at: '2025-01-01' })
    );
    // R2 succeeds
    mockFetch.mockResolvedValueOnce(
      cfOk({ name: 'localgenius-joes-pizza', creation_date: '2025-01-01' })
    );
    // Worker deploy fails
    mockFetch.mockResolvedValueOnce(cfFail(7000, 'Script upload failed'));
    vi.stubGlobal('fetch', mockFetch);

    try {
      await provisionSite(validBusiness, mockEnv);
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ProvisioningError);
      const pe = err as ProvisioningError;
      expect(pe.step).toBe('worker_deployed');
      expect(pe.retryable).toBe(true);
      expect(pe.message).toContain('Worker deployment failed');
    }
  });

  it('throws with step=dns_configured when DNS fails', async () => {
    const mockFetch = vi.fn<(...args: unknown[]) => Promise<Response>>();
    // D1
    mockFetch.mockResolvedValueOnce(
      cfOk({ uuid: 'db-uuid-123', name: 'localgenius-joes-pizza', created_at: '2025-01-01' })
    );
    // R2
    mockFetch.mockResolvedValueOnce(
      cfOk({ name: 'localgenius-joes-pizza', creation_date: '2025-01-01' })
    );
    // Worker
    mockFetch.mockResolvedValueOnce(
      cfOk({ id: 'worker-id-456', etag: 'etag-1', deployment_id: 'deploy-789' })
    );
    // DNS CNAME fails
    mockFetch.mockResolvedValueOnce(cfFail(8000, 'DNS record conflict'));
    vi.stubGlobal('fetch', mockFetch);

    try {
      await provisionSite(validBusiness, mockEnv);
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ProvisioningError);
      const pe = err as ProvisioningError;
      expect(pe.step).toBe('dns_configured');
      expect(pe.retryable).toBe(true);
      expect(pe.message).toContain('DNS configuration failed');
    }
  });

  it('throws with step=database_seeded when seeding fails', async () => {
    const mockFetch = vi.fn<(...args: unknown[]) => Promise<Response>>();
    // D1
    mockFetch.mockResolvedValueOnce(
      cfOk({ uuid: 'db-uuid-123', name: 'localgenius-joes-pizza', created_at: '2025-01-01' })
    );
    // R2
    mockFetch.mockResolvedValueOnce(
      cfOk({ name: 'localgenius-joes-pizza', creation_date: '2025-01-01' })
    );
    // Worker
    mockFetch.mockResolvedValueOnce(
      cfOk({ id: 'worker-id-456', etag: 'etag-1', deployment_id: 'deploy-789' })
    );
    // DNS CNAME
    mockFetch.mockResolvedValueOnce(
      cfOk({ id: 'dns-rec-1', name: 'joes-pizza.localgenius.site', type: 'CNAME', content: 'x' })
    );
    // DNS subdomain
    mockFetch.mockResolvedValueOnce(cfOk({ enabled: true }));
    // Seed fails
    mockFetch.mockResolvedValueOnce(cfFail(9000, 'SQL execution error'));
    vi.stubGlobal('fetch', mockFetch);

    try {
      await provisionSite(validBusiness, mockEnv);
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ProvisioningError);
      const pe = err as ProvisioningError;
      expect(pe.step).toBe('database_seeded');
      expect(pe.retryable).toBe(true);
      expect(pe.message).toContain('Database seeding failed');
    }
  });
});
