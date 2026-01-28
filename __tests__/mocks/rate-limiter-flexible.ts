/**
 * Mock for rate-limiter-flexible module
 * Used when rate-limiter-flexible is not installed
 */

export const RateLimiterRedis = jest.fn().mockImplementation(() => ({
  consume: jest.fn().mockResolvedValue({
    remainingPoints: 10,
    msBeforeNext: 1000,
    consumedPoints: 1,
    isFirstInDuration: false,
  }),
  penalty: jest.fn().mockResolvedValue({}),
  reward: jest.fn().mockResolvedValue({}),
  get: jest.fn().mockResolvedValue(null),
  delete: jest.fn().mockResolvedValue(true),
  block: jest.fn().mockResolvedValue({}),
}));

export const RateLimiterMemory = jest.fn().mockImplementation(() => ({
  consume: jest.fn().mockResolvedValue({
    remainingPoints: 10,
    msBeforeNext: 1000,
    consumedPoints: 1,
    isFirstInDuration: false,
  }),
  penalty: jest.fn().mockResolvedValue({}),
  reward: jest.fn().mockResolvedValue({}),
  get: jest.fn().mockResolvedValue(null),
  delete: jest.fn().mockResolvedValue(true),
}));

export const RateLimiterAbstract = jest.fn();
export const RateLimiterRes = jest.fn();
