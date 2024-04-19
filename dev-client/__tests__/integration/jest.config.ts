import type {Config} from 'jest';

const config: Config = {
  preset: 'jest-expo',
  rootDir: '../..',
  testMatch: ['<rootDir>/__tests__/integration/**/*.test.ts'],
  testTimeout: 120000,
  maxWorkers: 1,
  globalSetup: 'detox/runners/jest/globalSetup',
  globalTeardown: 'detox/runners/jest/globalTeardown',
  reporters: ['detox/runners/jest/reporter'],
  testEnvironment: 'detox/runners/jest/testEnvironment',
  verbose: true,
};

export default config;
