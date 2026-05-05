import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;

  afterEach(() => {
    if (service) {
      service.onModuleDestroy();
    }
    jest.restoreAllMocks();
  });

  it('returns null for unknown keys', () => {
    service = new CacheService();

    expect(service.get('missing-key')).toBeNull();
  });

  it('returns cached data before ttl and evicts after ttl', () => {
    service = new CacheService();
    const nowSpy = jest.spyOn(Date, 'now');

    nowSpy.mockReturnValue(1_000);
    service.set('profile', { skinType: 'mixed' }, 1_000);

    nowSpy.mockReturnValue(1_500);
    expect(service.get('profile')).toEqual({ skinType: 'mixed' });

    nowSpy.mockReturnValue(2_001);
    expect(service.get('profile')).toBeNull();
  });

  it('memoizes factory result with getOrSet', async () => {
    service = new CacheService();
    const factory = jest.fn<Promise<string>, []>().mockResolvedValue('ok');

    const first = await service.getOrSet('quota:gpt', factory, 5_000);
    const second = await service.getOrSet('quota:gpt', factory, 5_000);

    expect(first).toBe('ok');
    expect(second).toBe('ok');
    expect(factory).toHaveBeenCalledTimes(1);
  });
});
