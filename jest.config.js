/** @type {import('jest').Config} */
const config = {
  projects: [
    {
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      testMatch: [
        '<rootDir>/__tests__/unit/components/**/*.test.{ts,tsx}',
        '<rootDir>/__tests__/unit/hooks/**/*.test.{ts,tsx}',
      ],
      setupFilesAfterEnv: ['<rootDir>/__tests__/setup/jest.setup.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@app/(.*)$': '<rootDir>/app/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: 'tsconfig.json',
        }],
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    },
    {
      displayName: 'node',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/__tests__/unit/lib/**/*.test.{ts,tsx}',
        '<rootDir>/__tests__/unit/utils/**/*.test.{ts,tsx}',
        '<rootDir>/__tests__/security/**/*.test.{ts,tsx}',
      ],
      setupFilesAfterEnv: ['<rootDir>/__tests__/setup/jest.node.setup.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@app/(.*)$': '<rootDir>/app/$1',
        '^ioredis$': '<rootDir>/__tests__/mocks/ioredis.ts',
        '^rate-limiter-flexible$': '<rootDir>/__tests__/mocks/rate-limiter-flexible.ts',
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: 'tsconfig.json',
        }],
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
    },
    {
      displayName: 'integration',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/__tests__/integration/**/*.test.{ts,tsx}',
      ],
      setupFilesAfterEnv: ['<rootDir>/__tests__/integration/api/jest.integration.setup.ts'],
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@app/(.*)$': '<rootDir>/app/$1',
        '^@/app/(.*)$': '<rootDir>/app/$1',
      },
      transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
          tsconfig: 'tsconfig.json',
        }],
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      testTimeout: 30000,
    },
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!app/**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/coverage/**',
    '!**/*.config.{js,ts}',
  ],
  coverageThreshold: {
    global: {
      branches: 65,
      functions: 65,
      lines: 70,
      statements: 70,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/cypress/',
  ],
  watchPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
  ],
  verbose: true,
};

module.exports = config;
