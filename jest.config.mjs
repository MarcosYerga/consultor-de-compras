/** @type {import('jest').Config} */
const baseProject = {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '<rootDir>/tsconfig.base.json',
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@consultor/api-types$': '<rootDir>/packages/api-types/src/index.ts',
    '^@consultor/connectors$': '<rootDir>/packages/connectors/src/index.ts',
  },
};

/** @type {import('jest').Config} */
const config = {
  projects: [
    {
      ...baseProject,
      displayName: 'api',
      testMatch: ['<rootDir>/apps/api/src/**/*.test.ts'],
    },
    {
      ...baseProject,
      displayName: 'connectors',
      testMatch: ['<rootDir>/packages/connectors/src/**/*.test.ts'],
    },
  ],
};

export default config;