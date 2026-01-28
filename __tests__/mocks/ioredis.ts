/**
 * Mock for ioredis module
 * Used when ioredis is not installed
 */

const mockRedisInstance = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  setex: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  keys: jest.fn().mockResolvedValue([]),
  incr: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
  on: jest.fn().mockReturnThis(),
  once: jest.fn().mockReturnThis(),
  connect: jest.fn().mockResolvedValue(undefined),
  disconnect: jest.fn().mockResolvedValue(undefined),
  quit: jest.fn().mockResolvedValue('OK'),
  status: 'ready',
};

const Redis = jest.fn().mockImplementation(() => mockRedisInstance);

export default Redis;
export { mockRedisInstance };
