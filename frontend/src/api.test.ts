import {
  createEntity,
  deleteEntityTypeOnly,
  fetchEntityTypes,
  importData,
} from './api';

describe('api client', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('createEntity sends POST and returns data', async () => {
    const mockResponse = { id: 1, name: 'Alice', type: 'person' };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    const result = await createEntity({ name: 'Alice', type: 'person' });

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/entities/',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Alice', type: 'person' }),
      })
    );
    expect(result).toEqual(mockResponse);
  });

  it('importData throws with detail error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ detail: 'Invalid payload' }),
    } as Response);

    await expect(importData({ foo: 'bar' }, 'merge')).rejects.toThrow('Invalid payload');
  });

  it('fetchEntityTypes returns list', async () => {
    const mockTypes = ['person', 'organization'];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTypes,
    } as Response);

    const result = await fetchEntityTypes();

    expect(global.fetch).toHaveBeenCalledWith('http://localhost:8000/api/entities/types');
    expect(result).toEqual(mockTypes);
  });

  it('deleteEntityTypeOnly calls delete endpoint', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true }),
    } as Response);

    await deleteEntityTypeOnly('person');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/entities/types/person/only',
      { method: 'DELETE' }
    );
  });
});
