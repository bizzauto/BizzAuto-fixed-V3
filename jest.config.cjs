/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    // Strip .js extension from ESM-style imports (server uses .js in import paths)
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.jest.json',
    }],
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/mobile-app/'],
};
