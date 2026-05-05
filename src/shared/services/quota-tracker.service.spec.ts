import { QuotaTracker } from './quota-tracker.service';

describe('QuotaTracker', () => {
  let tracker: QuotaTracker;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000);
    tracker = new QuotaTracker();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('returns null when error is not a quota response', () => {
    const result = tracker.parseGeminiQuotaError({
      response: { data: { error: { code: 500 } } },
    });

    expect(result).toBeNull();
  });

  it('parses quota details and retry delay from Gemini response', () => {
    const result = tracker.parseGeminiQuotaError({
      response: {
        data: {
          error: {
            code: 429,
            details: [
              {
                '@type': 'type.googleapis.com/google.rpc.QuotaFailure',
                violations: [
                  {
                    quotaMetric:
                      'GenerateRequestsPerDayPerProjectPerModel-FreeTier',
                    quotaValue: '100',
                  },
                ],
              },
              {
                '@type': 'type.googleapis.com/google.rpc.RetryInfo',
                retryDelay: '50s',
              },
            ],
          },
        },
      },
    });

    expect(result).toMatchObject({
      isExhausted: true,
      quotaMetric: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier',
      dailyLimit: 100,
      retryAfterSeconds: 50,
    });
    expect(result?.resetTime?.getTime()).toBe(51_000);
  });

  it('records exhausted state and auto-clears it after reset time', () => {
    tracker.recordQuotaExhaustion('gemini', {
      isExhausted: true,
      retryAfterSeconds: 2,
      resetTime: new Date(Date.now() + 2_000),
    });

    expect(tracker.isQuotaExhausted('gemini')).toBe(true);

    jest.advanceTimersByTime(2_001);

    expect(tracker.isQuotaExhausted('gemini')).toBe(false);
    expect(tracker.getQuotaInfo('gemini')).toBeNull();
  });

  it('returns remaining time until reset', () => {
    tracker.recordQuotaExhaustion('gemini', {
      isExhausted: true,
      resetTime: new Date(Date.now() + 3_000),
    });

    expect(tracker.getTimeUntilReset('gemini')).toBe(3_000);

    jest.advanceTimersByTime(1_000);

    expect(tracker.getTimeUntilReset('gemini')).toBe(2_000);
    expect(tracker.getTimeUntilReset('missing-service')).toBe(0);
  });
});
